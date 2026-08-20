import test from "node:test";
import assert from "node:assert/strict";
import { normalizarTalla, familiaTalla, ordenarTallas, tallasDisponibles } from "./sizes";

/**
 * Igual que en el clasificador, los casos son valores reales volcados de
 * /products.json de las ocho tiendas Shopify, no inventados.
 *
 *   npm test
 */

test("normaliza las cinco grafías de talla única que usan las tiendas", () => {
  for (const bruta of ["U", "ÚNICA", "UNICA", "One Size", "Unique", "unica", " u "]) {
    assert.equal(normalizarTalla(bruta), "Única", `"${bruta}"`);
  }
});

test("descarta lo que no es una talla", () => {
  // Shopify pone "Default Title" en los productos sin variantes reales, y
  // alguna tienda cuela las tarjetas regalo como "Denominaciones".
  for (const bruta of ["Default Title", "Title", "Denominaciones", "", "   "]) {
    assert.equal(normalizarTalla(bruta), null, `"${bruta}"`);
  }
});

test("unifica las tallas combinadas, que unas tiendas separan con barra y otras con guion", () => {
  assert.equal(normalizarTalla("S/M"), "S/M");
  assert.equal(normalizarTalla("S-M"), "S/M");
  assert.equal(normalizarTalla("M-L"), "M/L");
  assert.equal(normalizarTalla("XS / S"), "XS/S");
  assert.equal(normalizarTalla("L/XL"), "L/XL");
  // Rangos numéricos de Blue Banana y Pompeii
  assert.equal(normalizarTalla("36/39"), "36/39");
  assert.equal(normalizarTalla("40-46"), "40/46");
});

test("simplifica las tallas infantiles de Blue Banana", () => {
  assert.equal(normalizarTalla("8 AÑOS (134 cm)"), "8 años");
  assert.equal(normalizarTalla("4 AÑOS (104 cm)"), "4 años");
  assert.equal(normalizarTalla("14 AÑOS (164 cm)"), "14 años");
});

test("conserva letras y números tal cual", () => {
  for (const t of ["XXS", "XS", "S", "M", "L", "XL", "XXL"]) {
    assert.equal(normalizarTalla(t.toLowerCase()), t);
  }
  assert.equal(normalizarTalla("40"), "40");
  assert.equal(normalizarTalla("07"), "7");
});

test("clasifica cada talla en su familia", () => {
  assert.equal(familiaTalla("M"), "letra");
  assert.equal(familiaTalla("S/M"), "letra");
  assert.equal(familiaTalla("40"), "numero");
  assert.equal(familiaTalla("36/39"), "numero");
  assert.equal(familiaTalla("8 años"), "infantil");
  assert.equal(familiaTalla("Única"), "unica");
});

test("ordena como una tienda, no alfabéticamente", () => {
  // Lo alfabético pondría L antes que M y XL antes que XS.
  assert.deepEqual(ordenarTallas(["XL", "S", "M", "XS", "L"]), ["XS", "S", "M", "L", "XL"]);
  // Las combinadas van detrás de su primera letra.
  assert.deepEqual(ordenarTallas(["M", "S/M", "S"]), ["S", "S/M", "M"]);
  // Números por valor, no como texto ("40" antes que "5" sería el fallo).
  assert.deepEqual(ordenarTallas(["40", "5", "38"]), ["5", "38", "40"]);
  // Familias en orden: letras, números, infantil, única.
  assert.deepEqual(ordenarTallas(["Única", "38", "8 años", "M"]), ["M", "38", "8 años", "Única"]);
});

test("tallasDisponibles se queda solo con las que tienen stock", () => {
  const tallas = [
    { label: "XS", available: true },
    { label: "S", available: true },
    { label: "M", available: false },
    { label: "L", available: true },
  ];
  assert.deepEqual(tallasDisponibles(tallas), ["XS", "S", "L"]);
  assert.deepEqual(tallasDisponibles(undefined), []);
  assert.deepEqual(tallasDisponibles([{ label: "M", available: false }]), []);
});
