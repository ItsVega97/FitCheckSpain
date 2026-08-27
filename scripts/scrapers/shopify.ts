import { createHash } from "node:crypto";
import { categorize, detectGender } from "./categorize";
import { normalizarTalla, ordenarTallas, type Talla } from "../../lib/sizes";
import type { Deal, StoreId } from "../../lib/types";

/**
 * Scraper genérico para tiendas montadas sobre Shopify.
 *
 * Shopify expone `/products.json` en abierto (es parte de su Storefront
 * "AJAX API"), sin protección anti-bot y sin necesidad de navegador: un
 * fetch simple devuelve el catálogo en JSON ya estructurado. Es con
 * diferencia la fuente más fiable que tenemos, y además es la única —
 * junto con Zalando y Desigual — que trae **precio original**
 * (`compare_at_price`), así que aquí sí podemos calcular el % de descuento
 * de verdad en vez de dejarlo a null.
 *
 * Una sola función sirve para todas las tiendas Shopify: solo cambia la
 * URL base. Para añadir otra tienda basta con meterla en SHOPIFY_STORES.
 */
export interface ShopifyStore {
  id: StoreId;
  name: string;
  baseUrl: string;
  /**
   * Género a aplicar cuando los tags no lo digan. Solo se pone en marcas
   * que venden a un único público: Bimani, Coosy, Laagam y Poete no
   * etiquetan el género en ninguna parte porque todo su catálogo es de
   * mujer, y sin esto sus ~1.500 ofertas se quedan fuera del filtro.
   * Scalpers, Blue Banana y Pompeii sí lo etiquetan, así que no llevan
   * valor por defecto.
   */
  defaultGender?: "hombre" | "mujer" | "niños" | "unisex";
}

export const SHOPIFY_STORES: ShopifyStore[] = [
  { id: "bimani", name: "Bimani", baseUrl: "https://bimani.es", defaultGender: "mujer" },
  { id: "popa", name: "Popa", baseUrl: "https://popabrand.com", defaultGender: "mujer" },
  { id: "pompeii", name: "Pompeii", baseUrl: "https://pompeiibrand.com" },
  { id: "bluebanana", name: "Blue Banana", baseUrl: "https://www.bluebananabrand.com" },
  { id: "laagam", name: "Laagam", baseUrl: "https://laagam.com", defaultGender: "mujer" },
  { id: "coosy", name: "Coosy", baseUrl: "https://coosy.es", defaultGender: "mujer" },
  { id: "scalpers", name: "Scalpers", baseUrl: "https://scalperscompany.com" },
  { id: "poete", name: "Poete", baseUrl: "https://poete.es", defaultGender: "mujer" },
  // Sondeadas el 27/08/2026 sobre 750 productos cada una: Ecoalf marca
  // precio anterior en el 58% (mejor que Scalpers, que va al 23%);
  // Silbon solo en el 2%, así que aportará poco, pero el coste de
  // tenerla es una línea.
  { id: "silbon", name: "Silbon", baseUrl: "https://silbonshop.com" },
  { id: "ecoalf", name: "Ecoalf", baseUrl: "https://ecoalf.com" },
];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

/** Máximo de páginas a pedir por tienda (250 productos por página). */
const MAX_PAGES = 4;

interface ShopifyVariant {
  price?: string;
  compare_at_price?: string | null;
  available?: boolean;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
}

interface ShopifyOption {
  name?: string;
  position?: number;
  values?: string[];
}

interface ShopifyProduct {
  title?: string;
  handle?: string;
  product_type?: string;
  tags?: string[];
  body_html?: string;
  options?: ShopifyOption[];
  variants?: ShopifyVariant[];
  images?: { src?: string }[];
}

function hashId(input: string): string {
  return createHash("sha256").update(input).digest("base64url").slice(0, 16);
}

function sinHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Saca las tallas con su disponibilidad.
 *
 * La opción de talla no está siempre en la misma posición ni se llama
 * igual: Coosy y Poete la llaman "Talla", Pompeii y Laagam "Size", Blue
 * Banana la mete dentro del nombre del producto ("SUDADERA ... (TALLA)") y
 * Scalpers pone "Color" primero y "Talla" segundo. Por eso se busca por
 * nombre en vez de asumir la posición 1, y se lee el `optionN` que
 * corresponda a esa posición.
 */
function extraerTallas(p: ShopifyProduct): Talla[] | undefined {
  const opciones = p.options ?? [];
  const indice = opciones.findIndex((o) => /talla|size/i.test(o.name ?? ""));
  if (indice < 0 || indice > 2) return undefined;

  const clave = (["option1", "option2", "option3"] as const)[indice];
  // Una misma talla puede repetirse entre variantes (por ejemplo cuando la
  // tienda tiene también opción de color), y basta con que quede stock en
  // una de ellas para que la talla esté disponible.
  const porTalla = new Map<string, boolean>();
  for (const v of p.variants ?? []) {
    const bruta = v[clave];
    if (!bruta) continue;
    const label = normalizarTalla(bruta);
    if (!label) continue;
    porTalla.set(label, (porTalla.get(label) ?? false) || v.available === true);
  }

  if (porTalla.size === 0) return undefined;
  return ordenarTallas([...porTalla.keys()]).map((label) => ({
    label,
    available: porTalla.get(label) ?? false,
  }));
}

/**
 * Muchas de estas marcas titulan solo con el nombre del modelo ("HIGBY TAUPE
 * SAGE", "VELOURS BLUE"), así que el título por sí solo no dice qué es la
 * prenda. Se intenta clasificar con las señales de más fiable a menos:
 *
 *   1. product_type — el campo que la propia tienda usa para su taxonomía
 *      ("SNEAKERS", "Cuña Baja", "TOPS & BLOUSES"). Es el mejor con
 *      diferencia, pero hay tiendas que lo dejan vacío (Poete, todas).
 *   2. tags — ruidosos (llevan campañas, tallas y colores), por eso van
 *      después: solo se consultan si lo anterior no ha resuelto nada.
 *   3. body_html — la descripción. Último recurso, porque menciona muchas
 *      prendas de pasada, pero rescata catálogos sin ningún metadato.
 */
function clasificar(p: ShopifyProduct, title: string): string {
  const intentos = [
    `${title} ${p.product_type ?? ""}`,
    (p.tags ?? []).join(" "),
    sinHtml(p.body_html ?? "").slice(0, 300),
  ];
  for (const texto of intentos) {
    if (!texto.trim()) continue;
    const categoria = categorize(texto);
    if (categoria !== "Otros") return categoria;
  }
  return "Otros";
}

/**
 * Shopify asigna el mercado por geolocalización de IP, y los runners de
 * GitHub Actions salen por Estados Unidos: la tienda nos servía su lista de
 * precios internacional. En Coosy eso significaba publicar unas sandalias a
 * 41,90 € cuando en su web se venden a 39,00 €, con el precio tachado
 * inflado en el mismo factor (1,0744) — un desfase constante y silencioso,
 * porque las cifras parecían perfectamente plausibles.
 *
 * `country=ES` fuerza el mercado español. Se comprobó que la cookie
 * `localization` y las cabeceras de país no sirven: solo el parámetro.
 */
const PAIS = "ES";

async function fetchPage(baseUrl: string, page: number): Promise<ShopifyProduct[]> {
  const res = await fetch(`${baseUrl}/products.json?limit=250&page=${page}&country=${PAIS}`, {
    headers: { "User-Agent": UA, "Accept-Language": "es-ES,es;q=0.9" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { products?: ShopifyProduct[] };
  return data.products ?? [];
}

export async function scrapeShopifyStore(store: ShopifyStore): Promise<{ deals: Deal[]; cardsFound: number }> {
  const byId = new Map<string, Deal>();
  let cardsFound = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const products = await fetchPage(store.baseUrl, page);
    if (products.length === 0) break; // se acabó el catálogo
    cardsFound += products.length;

    for (const p of products) {
      const variant = p.variants?.[0];
      if (!variant || !p.handle) continue;

      const price = Number(variant.price);
      // compare_at_price puede venir null, ausente o "0.00" en productos
      // sin rebaja; solo nos interesa cuando es un precio anterior real.
      const originalPrice = variant.compare_at_price ? Number(variant.compare_at_price) : null;
      if (!Number.isFinite(price) || price <= 0) continue;
      if (originalPrice === null || !Number.isFinite(originalPrice) || originalPrice <= price) continue;

      const productUrl = `${store.baseUrl}/products/${p.handle}`;
      const id = `${store.id}-${hashId(productUrl)}`;
      if (byId.has(id)) continue;

      const title = p.title?.trim() || "Producto sin título";
      // El género casi nunca está en el título pero sí en los tags: Popa
      // etiqueta "Mujer", Scalpers "Hombre"/"Infantil"/"Niña", Blue Banana
      // "unisex"/"kids", Pompeii "Man"/"Woman", Laagam "female".
      const textoParaGenero = `${title} ${(p.tags ?? []).join(" ")}`;

      byId.set(id, {
        id,
        store: store.id,
        storeName: store.name,
        title,
        imageUrl: p.images?.[0]?.src ?? null,
        productUrl,
        price,
        originalPrice,
        discountPercent: Math.round(((originalPrice - price) / originalPrice) * 100),
        currency: "EUR",
        category: clasificar(p, title),
        gender: detectGender(textoParaGenero) ?? store.defaultGender,
        sizes: extraerTallas(p),
        scrapedAt: new Date().toISOString(),
        source: "auto",
      });
    }

    if (products.length < 250) break; // última página
  }

  return { deals: [...byId.values()], cardsFound };
}
