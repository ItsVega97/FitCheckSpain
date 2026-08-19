import test from "node:test";
import assert from "node:assert/strict";
import { categorize, detectGender } from "./categorize";

/**
 * Los casos de abajo no son inventados: son valores reales de `product_type`
 * y `tags` volcados de /products.json de las ocho tiendas Shopify. Sirven de
 * red para que un retoque en las expresiones regulares no vuelva a mandar
 * catálogos enteros a "Otros" (que es exactamente lo que pasó con las formas
 * en plural: /\btop\b/ no casaba con "Tops", ni /\bcoat\b/ con "COATS").
 *
 *   npm test
 */

const TIPOS_REALES: [string, string][] = [
  // Pompeii
  ["SNEAKERS", "Calzado"],
  ["TEE", "Camisetas y tops"],
  ["SHOE", "Calzado"],
  ["OUTERWEAR", "Chaquetas y abrigos"],
  ["SHIRT", "Camisas y blusas"],
  ["SOCKS", "Bolsos y accesorios"],
  ["Zapatillas", "Calzado"],
  ["KNIT", "Sudaderas y jerséis"],
  ["SWIMWEAR", "Bañador y playa"],
  ["HEADWEAR", "Bolsos y accesorios"],
  ["POLO", "Camisetas y tops"],
  ["SWEAT", "Sudaderas y jerséis"],
  ["TRAINER", "Calzado"],
  ["SCARF", "Bolsos y accesorios"],
  ["Vest", "Chaquetas y abrigos"],
  ["SHORTS", "Pantalones y vaqueros"],
  ["Pants", "Pantalones y vaqueros"],
  ["Overshirt", "Camisas y blusas"],
  ["Tee-shirts", "Camisetas y tops"],
  // Blue Banana
  ["Camiseta", "Camisetas y tops"],
  ["Sudadera con capucha", "Sudaderas y jerséis"],
  ["Calcetines", "Bolsos y accesorios"],
  ["Bañador", "Bañador y playa"],
  ["Pantalón corto", "Pantalones y vaqueros"],
  ["Gorra", "Bolsos y accesorios"],
  ["Cortavientos", "Chaquetas y abrigos"],
  ["Boxer", "Ropa interior"],
  ["Chaleco", "Chaquetas y abrigos"],
  // Scalpers
  ["Sneakers", "Calzado"],
  ["Bolsa", "Bolsos y accesorios"],
  ["Bolsos", "Bolsos y accesorios"],
  ["Jerséis", "Sudaderas y jerséis"],
  ["Botas", "Calzado"],
  ["Tops", "Camisetas y tops"],
  ["Polos", "Camisetas y tops"],
  ["Cinturon", "Bolsos y accesorios"],
  ["Neceser", "Bolsos y accesorios"],
  ["Monos", "Monos y conjuntos"],
  ["Light outwear", "Chaquetas y abrigos"],
  // Popa (calzado con taxonomía muy española)
  ["Cuña Baja", "Calzado"],
  ["Menorquina Plataforma", "Calzado"],
  ["Sandalia Tacón", "Calzado"],
  ["Zueco Cerrado", "Calzado"],
  ["Botín Tacón", "Calzado"],
  ["Gafas Sol", "Bolsos y accesorios"],
  ["Pañuelo", "Bolsos y accesorios"],
  ["Coletero", "Bolsos y accesorios"],
  // Laagam (todo en inglés y en plural)
  ["TOPS & BLOUSES", "Camisetas y tops"],
  ["DRESSES", "Vestidos"],
  ["TROUSERS", "Pantalones y vaqueros"],
  ["JACKETS & OUTERWEAR", "Chaquetas y abrigos"],
  ["T-SHIRTS", "Camisetas y tops"],
  ["SKIRTS", "Faldas"],
  ["HANDBAGS", "Bolsos y accesorios"],
  ["SHIRTS", "Camisas y blusas"],
  ["BELTS", "Bolsos y accesorios"],
  ["KNITWEAR", "Sudaderas y jerséis"],
  ["COATS", "Chaquetas y abrigos"],
  ["BEACHWEAR", "Bañador y playa"],
  ["SWEATSHIRTS & HOODIES", "Sudaderas y jerséis"],
  ["SHOES", "Calzado"],
  ["SANDALS", "Calzado"],
  ["HATS & CAPS", "Bolsos y accesorios"],
  ["BOOTS", "Calzado"],
  ["SCARVES & SHAWLS", "Bolsos y accesorios"],
];

test("categorize resuelve los product_type reales de las tiendas Shopify", () => {
  for (const [tipo, esperado] of TIPOS_REALES) {
    assert.equal(categorize(tipo), esperado, `product_type "${tipo}"`);
  }
});

test("categorize prioriza lo específico sobre lo genérico", () => {
  // "camisón" contiene "camis" pero no es una camisa
  assert.equal(categorize("Camisón de raso"), "Pijamas y homewear");
  // el guion de "T-shirt" es límite de palabra, así que /\bshirt/ la
  // reclamaría como camisa si el orden fuese el contrario
  assert.equal(categorize("Camiseta t-shirt oversize"), "Camisetas y tops");
  // la cosmética de ASOS no debe colarse como ropa
  assert.equal(categorize("Base de maquillaje mate"), "Belleza");
  assert.equal(categorize("Máscara de pestañas volumen"), "Belleza");
});

const TAGS_REALES: [string, string | undefined][] = [
  ['["01INFANTIL","01NIÑA","feed-gender-female","Infantil","Niña"]', "niños"],
  ['["01INFANTIL","01NIÑO","feed-gender-male","Infantil","Niño"]', "niños"],
  ['["Mujer","SS26","Accesorios"]', "mujer"],
  ['["Hombre","01HOMBRE","Ropa"]', "hombre"],
  ['["aw26","filter-available","unisex"]', "unisex"],
  ['["aw26","collection-dice-kids-tees","kids"]', "niños"],
  ['["Man","AW23"]', "hombre"],
  ['["Woman","SS25"]', "mujer"],
  ['["female","all","SS26"]', "mujer"],
  ['["feed-gender-male","AW26-27"]', "hombre"],
  ['["preorder"]', undefined],
];

test("detectGender lee las etiquetas de género reales de cada tienda", () => {
  for (const [tags, esperado] of TAGS_REALES) {
    assert.equal(detectGender(tags), esperado, `tags ${tags}`);
  }
});

test("detectGender no confunde 'female' con 'male'", () => {
  assert.equal(detectGender("feed-gender-female"), "mujer");
  assert.equal(detectGender("feed-gender-male"), "hombre");
  // si aparecen los dos no hay forma de decidir: mejor sin género que mal
  assert.equal(detectGender("hombre mujer"), undefined);
});
