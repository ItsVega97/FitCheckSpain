import test from "node:test";
import assert from "node:assert/strict";
import { ordenar } from "./filters";
import { bonoMarca } from "./stores";
import type { Deal, StoreId } from "./types";

function oferta(store: StoreId, discountPercent: number, title = store): Deal {
  return {
    id: `${store}-${discountPercent}`,
    store,
    storeName: store,
    title,
    imageUrl: null,
    productUrl: "https://example.com/p",
    price: 10,
    originalPrice: 20,
    discountPercent,
    currency: "EUR",
    scrapedAt: "2026-08-27T00:00:00.000Z",
    source: "auto",
  };
}

test("el bono de marca premia lo conocido y no pasa del techo", () => {
  assert.ok(bonoMarca("mango") > bonoMarca("scalpers"), "Mango es más conocida que Scalpers");
  assert.ok(bonoMarca("scalpers") > bonoMarca("ecoalf"), "Scalpers más que Ecoalf");
  assert.equal(bonoMarca("coosy"), 0, "sin puesto en el ranking, sin bono");
  assert.ok(bonoMarca("mango") <= 20, "el bono no puede aplastar al descuento");
});

test("Destacados adelanta a la marca conocida a igualdad de descuento", () => {
  const r = ordenar([oferta("coosy", 50), oferta("mango", 50)], "destacados");
  assert.equal(r[0].store, "mango");
});

test("Destacados no deja que la marca tape un descuento mucho mayor", () => {
  // 80% de una marca desconocida contra 50% de la más conocida que tenemos
  const r = ordenar([oferta("mango", 50), oferta("coosy", 80)], "destacados");
  assert.equal(r[0].store, "coosy", "un -80% real sigue mandando");
});

test("Mayor descuento sigue siendo el orden puro, sin bono de marca", () => {
  const r = ordenar([oferta("mango", 50), oferta("coosy", 60)], "discount");
  assert.equal(r[0].store, "coosy");
});

test("los otros órdenes no cambian de comportamiento", () => {
  const barata = { ...oferta("coosy", 10), price: 5 };
  const cara = { ...oferta("mango", 10), price: 90 };
  assert.equal(ordenar([cara, barata], "price-asc")[0].price, 5);
  assert.equal(ordenar([barata, cara], "price-desc")[0].price, 90);
});
