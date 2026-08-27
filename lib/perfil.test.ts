import test from "node:test";
import assert from "node:assert/strict";
import { encajaConPerfil, grupoDeCategoria, tallasPorGrupo, perfilVacio } from "./perfil";
import type { Deal } from "./types";

function oferta(parcial: Partial<Deal>): Deal {
  return {
    id: "x",
    store: "coosy",
    storeName: "Coosy",
    title: "Prueba",
    imageUrl: null,
    productUrl: "https://example.com/p",
    price: 10,
    originalPrice: 20,
    discountPercent: 50,
    currency: "EUR",
    scrapedAt: "2026-08-25T00:00:00.000Z",
    source: "auto",
    ...parcial,
  };
}

test("cada categoría cae en el grupo de tallas que le corresponde", () => {
  assert.equal(grupoDeCategoria("Calzado"), "calzado");
  assert.equal(grupoDeCategoria("Pantalones y vaqueros"), "pantalon");
  assert.equal(grupoDeCategoria("Faldas"), "pantalon");
  assert.equal(grupoDeCategoria("Camisetas y tops"), "arriba");
  assert.equal(grupoDeCategoria("Vestidos"), "arriba");
  assert.equal(grupoDeCategoria("Chaquetas y abrigos"), "arriba");
  // Sin talla: no deben desaparecer al filtrar
  assert.equal(grupoDeCategoria("Bolsos y accesorios"), null);
  assert.equal(grupoDeCategoria("Belleza"), null);
  assert.equal(grupoDeCategoria(undefined), null);
});

test("una oferta encaja solo si TU talla sigue con stock", () => {
  const perfil = { arriba: ["M"], pantalon: [], calzado: [] };
  const conM = oferta({
    category: "Camisetas y tops",
    sizes: [
      { label: "S", available: false },
      { label: "M", available: true },
    ],
  });
  const sinM = oferta({
    category: "Camisetas y tops",
    sizes: [
      { label: "S", available: true },
      { label: "M", available: false },
    ],
  });
  assert.equal(encajaConPerfil(conM, perfil), true);
  assert.equal(encajaConPerfil(sinM, perfil), false, "la M está agotada");
});

test("lo que no lleva talla no se esconde al filtrar", () => {
  const perfil = { arriba: ["M"], pantalon: ["42"], calzado: ["43"] };
  assert.equal(encajaConPerfil(oferta({ category: "Bolsos y accesorios" }), perfil), true);
  assert.equal(encajaConPerfil(oferta({ category: "Belleza" }), perfil), true);
  // Talla única: le vale a cualquiera
  const unica = oferta({ category: "Camisetas y tops", sizes: [{ label: "Única", available: true }] });
  assert.equal(encajaConPerfil(unica, perfil), true);
});

test("un grupo sin rellenar no filtra ese tipo de prenda", () => {
  const soloCalzado = { arriba: [], pantalon: [], calzado: ["43"] };
  const camiseta = oferta({ category: "Camisetas y tops", sizes: [{ label: "S", available: true }] });
  assert.equal(encajaConPerfil(camiseta, soloCalzado), true, "no has dicho tu talla de arriba");
  const zapato = oferta({ category: "Calzado", sizes: [{ label: "40", available: true }] });
  assert.equal(encajaConPerfil(zapato, soloCalzado), false);
});

test("sin perfil pasa todo", () => {
  assert.equal(perfilVacio({ arriba: [], pantalon: [], calzado: [] }), true);
  const d = oferta({ category: "Calzado", sizes: [{ label: "40", available: true }] });
  assert.equal(encajaConPerfil(d, null), true);
  assert.equal(encajaConPerfil(d, { arriba: [], pantalon: [], calzado: [] }), true);
});

test("una oferta agotada del todo no es de tu talla", () => {
  const perfil = { arriba: [], pantalon: [], calzado: ["43"] };
  const agotada = oferta({ category: "Calzado", sizes: [{ label: "43", available: false }] });
  assert.equal(encajaConPerfil(agotada, perfil), false);
});

test("las tallas ofrecidas salen del catálogo, sin única ni infantiles", () => {
  // Cinco ofertas por talla: el mínimo para que se ofrezca
  const cinco = (categoria: string, labels: string[]) =>
    Array.from({ length: 5 }, () =>
      oferta({ category: categoria, sizes: labels.map((l) => ({ label: l, available: true })) }),
    );
  const deals = [
    ...cinco("Calzado", ["40", "41"]),
    ...cinco("Camisetas y tops", ["M", "Única"]),
    ...cinco("Camisetas y tops", ["8 años"]),
    ...cinco("Bolsos y accesorios", ["U"]),
  ];
  const r = tallasPorGrupo(deals);
  assert.deepEqual(r.calzado.sort(), ["40", "41"]);
  assert.deepEqual(r.arriba.sort(), ["M"], "fuera la única y la infantil");
  assert.deepEqual(r.pantalon, [], "los bolsos no llevan talla");
});

test("el tallaje infantil no se mezcla con el de adulto", () => {
  // Scalpers y Blue Banana venden niño con tallas numéricas (4, 6, 8) que
  // en el grupo "arriba" serían indistinguibles de una talla de adulto.
  const deals = [
    ...Array.from({ length: 8 }, () =>
      oferta({ category: "Camisetas y tops", gender: "niños", sizes: [{ label: "8", available: true }] }),
    ),
    ...Array.from({ length: 8 }, () =>
      oferta({ category: "Camisetas y tops", gender: "mujer", sizes: [{ label: "M", available: true }] }),
    ),
  ];
  assert.deepEqual(tallasPorGrupo(deals).arriba, ["M"]);
});

test("no se ofrece una talla con muy pocas ofertas detrás", () => {
  // "38" solo aparece en dos ofertas: no llega al mínimo
  const deals = [
    ...Array.from({ length: 9 }, () =>
      oferta({ category: "Calzado", sizes: [{ label: "40", available: true }] }),
    ),
    ...Array.from({ length: 2 }, () =>
      oferta({ category: "Calzado", sizes: [{ label: "38", available: true }] }),
    ),
  ];
  assert.deepEqual(tallasPorGrupo(deals).calzado, ["40"]);
});
