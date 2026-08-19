/**
 * Clasificador por palabras clave. No es perfecto, pero da un filtrado útil
 * sin depender de la taxonomía propia de cada tienda (que además no todas
 * exponen).
 *
 * Dos cosas aprendidas con el catálogo real, que explican por qué las
 * reglas son como son:
 *
 * 1. Las tiendas sobre Shopify titulan en inglés ("FRANKIE BURGUNDY SKIRT",
 *    "NILAH BROWN BELT"), así que cada regla lleva también sus términos en
 *    inglés. Sin ellos caían tiendas enteras en "Otros".
 * 2. El orden importa: gana la primera regla que casa, así que lo
 *    específico va antes que lo genérico — "camisón" tiene que caer en
 *    pijamas y no en camisas, y "chaleco" en chaquetas antes de que
 *    "vest" lo reclame desde otra regla.
 */

const RULES: [string, RegExp][] = [
  // Primero de todo: ASOS y Zalando cuelan cosmética en sus rebajas de
  // ropa, y "base de maquillaje" o "máscara de pestañas" casarían con
  // otras reglas si llegaran a ellas.
  [
    "Belleza",
    /maquillaje|colorete|iluminador|bronceador|labial|mascarilla|exfoliante|t[óo]nico|s[ée]rum|perfume|fragancia|champ[úu]|skincare|polvos|sombra de ojos|r[íi]mel|pesta[ñn]as|crema (facial|corporal|de manos|hidratante)|desodorante|afeitado|gel corporal|gel de ba[ñn]o|lipstick|\bmascara\b|foundation|concealer|\bprimer\b/i,
  ],
  // Menaje y regalo: Womensecret y otras cuelan tazas, cojines o postales
  // en sus rebajas. Va pronto porque "delantal" o "babero" no deben acabar
  // en ropa.
  [
    "Hogar y regalos",
    /\btaza\b|\bjarra\b|postal|coj[íi]n|babero|delantal|organizador|felpudo|\bvela\b|portavelas|manta\b|\bs[áa]bana|\bfunda de|difusor|ambientador|libreta|puzzle|\btarjeta regalo|tarjeta de regalo/i,
  ],
  [
    "Calzado",
    /zapatilla|sneaker|zapato|bota|bot[íi]n|botines|sandalia|chancla|mocas[ií]n|n[áa]utico|derby|running|trainer|mule|cu[ñn]a\b|menorquina|alpargata|zueco|bailarina|tac[óo]n|stiletto|plataforma|\bshoe|\bboot|loafer|slipper|sandal|\bheel/i,
  ],
  // Antes que camisas: "camisón" contiene "camis".
  ["Pijamas y homewear", /pijama|pelele|camis[óo]n|bata\b|homewear|zapatilla de casa|albornoz/i],
  ["Vestidos", /vestido|t[úu]nica|dress/i],
  ["Faldas", /falda|skirt/i],
  ["Monos y conjuntos", /\bmono\b|\bmonos\b|jumpsuit|\bpeto\b|conjunto|\bset\b|co-?ord|traje\b/i],
  [
    "Pantalones y vaqueros",
    /pantal[oó]n|vaquer|jean|legging|short|bermuda|trouser|\bpants?\b|chino|jogger|c[áa]rgo/i,
  ],
  // Womensecret escribe "bóxer" con tilde y en plural, y vende muchos packs
  // de "slips" y "bodies": sin estas variantes caían todos en "Otros".
  [
    "Ropa interior",
    /ropa interior|sujetador|braga|calz[oó]ncillo|b[óo]xer|\bslips?\b|lencer[íi]a|bralette|tanga|hipster|culotte|panty|leotardo|\bmedias\b|cubrepez[óo]n|\bbrief|underwear|antirroce/i,
  ],
  // Camisetas antes que camisas a propósito: en "T-SHIRT" el guion cuenta
  // como límite de palabra, así que /\bshirt/ la reclamaría como camisa.
  ["Camisetas y tops", /camiseta|\btops?\b|\bbod(y|ies)\b|\bpolos?\b|\bt-?shirts?\b|\btees?\b|tank\b|\bcrop/i],
  ["Camisas y blusas", /camisa|blusa|\bshirt|overshirt|blouse/i],
  [
    "Sudaderas y jerséis",
    /sudadera|jers[eé](y|is)|su[eé]ter|\bpunto\b|c[áa]rdigan|cardigan|hoodie|sweat|sweater|jumper|\bknit|forro polar|\bfleece/i,
  ],
  [
    "Chaquetas y abrigos",
    /chaqueta|abrigo|cazadora|parka|plum[ií]fero|gabardina|blazer|chaleco|americana|cortavientos|\bcapa\b|\bbiker\b|jacket|\bcoats?\b|\bvest\b|bomber|trench|kimono|kaft[áa]n|kaftan|anorak|windbreaker|softshell|outerwear|outwear/i,
  ],
  ["Bañador y playa", /ba[ñn]ador|bikini|playa|pareo|\bswim|\bbeach/i],
  [
    "Bolsos y accesorios",
    /bolso|bolsa\b|bandolera|mochila|cartera|monedero|cintur[oó]n|faj[íi]n|bufanda|gorro|gorra|sombrero|diadema|cinta de pelo|guante|joyer[ií]a|collar|pulsera|brazalete|anillo|pendiente|reloj|gafas|pa[ñn]uelo|fular|coletero|neceser|llavero|calcetin|toalla|paraguas|bolsas y mochilas|complementos|accesorios|\bbags?\b|handbag|\bbelt|scarf|scarve|shawl|\bcaps?\b|headwear|\bhats?\b|\bsock|wallet|jewel|earring|necklace|bracelet|sunglass|backpack|umbrella/i,
  ],
  ["Ropa de deporte", /leggins|\bmalla|conjunto deportivo|fitness|gimnasio|entrenamiento/i],
];

export function categorize(text: string): string {
  for (const [label, pattern] of RULES) {
    if (pattern.test(text)) return label;
  }
  return "Otros";
}

/**
 * El género rara vez aparece en el título, pero sí en los tags de Shopify,
 * y cada tienda usa su propio vocabulario: Popa etiqueta "Mujer", Scalpers
 * "Hombre"/"Infantil"/"Niña" además de "feed-gender-male", Blue Banana
 * "unisex"/"kids", Pompeii "Man"/"Woman" y Laagam "female". De ahí que se
 * acepten las cuatro variantes (es/en, singular/plural).
 *
 * Ojo con \bmale\b: no casa dentro de "female" porque la "e" anterior es
 * carácter de palabra, así que "feed-gender-female" se resuelve bien.
 */
export function detectGender(text: string): "hombre" | "mujer" | "niños" | "unisex" | undefined {
  const lower = text.toLowerCase();
  const hasNinos =
    /\bni[ñn][oa]s?\b|\bkids?\b|\binfantil\b|\bjunior\b|\bbeb[ée]s?\b|\bboys?\b|\bgirls?\b|\bbaby\b/.test(
      lower,
    );
  if (hasNinos) return "niños";
  const hasHombre = /\bhombres?\b|\bmen\b|\bman\b|\bmale\b|\bmasculino\b/.test(lower);
  const hasMujer = /\bmujer(es)?\b|\bwomen\b|\bwoman\b|\bfemale\b|\bfemenino\b/.test(lower);
  if (hasHombre && !hasMujer) return "hombre";
  if (hasMujer && !hasHombre) return "mujer";
  if (/\bunisex\b/.test(lower)) return "unisex";
  return undefined;
}
