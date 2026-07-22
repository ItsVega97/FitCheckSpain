/**
 * Clasificador simple por palabras clave. No es perfecto (algún producto
 * puede caer en "Otros" o en una categoría poco precisa), pero da un
 * filtrado útil sin depender de una taxonomía propia de cada tienda.
 */

const RULES: [string, RegExp][] = [
  ["Calzado", /zapatilla|sneaker|zapato|bota|sandalia|chancla|mocas[ií]n|náutico|derby|running|mule/i],
  ["Vestidos", /vestido/i],
  ["Faldas", /falda/i],
  ["Pantalones y vaqueros", /pantal[oó]n|vaquer|jean|legging|short|bermuda/i],
  ["Camisetas y tops", /camiseta|top\b|body\b|polo\b/i],
  ["Camisas y blusas", /camisa|blusa/i],
  ["Sudaderas y jerséis", /sudadera|jers[eé]y|su[eé]ter|punto\b|cárdigan|cardigan/i],
  ["Chaquetas y abrigos", /chaqueta|abrigo|cazadora|parka|plum[ií]fero|gabardina|blazer/i],
  ["Bañador y playa", /ba[ñn]ador|bikini|playa/i],
  ["Ropa interior", /ropa interior|sujetador|braga|calz[oó]ncillo|boxer/i],
  ["Bolsos y accesorios", /bolso|mochila|cartera|monedero|cintur[oó]n|bufanda|gorro|gorra|guante|joyer[ií]a|collar|pulsera|pendiente|reloj|gafas de sol/i],
  ["Ropa de deporte", /leggins|malla|conjunto deportivo|fitness|gimnasio|entrenamiento/i],
];

export function categorize(text: string): string {
  for (const [label, pattern] of RULES) {
    if (pattern.test(text)) return label;
  }
  return "Otros";
}

export function detectGender(text: string): "hombre" | "mujer" | "unisex" | undefined {
  const lower = text.toLowerCase();
  const hasHombre = /\bhombre\b|\bmen\b/.test(lower);
  const hasMujer = /\bmujer\b|\bwomen\b/.test(lower);
  if (hasHombre && !hasMujer) return "hombre";
  if (hasMujer && !hasHombre) return "mujer";
  if (/\bunisex\b/.test(lower)) return "unisex";
  return undefined;
}
