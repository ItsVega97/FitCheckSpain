import { createHash } from "node:crypto";
import { categorize, detectGender } from "./categorize";
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
}

export const SHOPIFY_STORES: ShopifyStore[] = [
  { id: "bimani", name: "Bimani", baseUrl: "https://bimani.es" },
  { id: "popa", name: "Popa", baseUrl: "https://popabrand.com" },
  { id: "pompeii", name: "Pompeii", baseUrl: "https://pompeiibrand.com" },
  { id: "bluebanana", name: "Blue Banana", baseUrl: "https://www.bluebananabrand.com" },
  { id: "laagam", name: "Laagam", baseUrl: "https://laagam.com" },
  { id: "coosy", name: "Coosy", baseUrl: "https://coosy.es" },
  { id: "scalpers", name: "Scalpers", baseUrl: "https://scalperscompany.com" },
  { id: "poete", name: "Poete", baseUrl: "https://poete.es" },
];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

/** Máximo de páginas a pedir por tienda (250 productos por página). */
const MAX_PAGES = 4;

interface ShopifyVariant {
  price?: string;
  compare_at_price?: string | null;
}

interface ShopifyProduct {
  title?: string;
  handle?: string;
  product_type?: string;
  variants?: ShopifyVariant[];
  images?: { src?: string }[];
}

function hashId(input: string): string {
  return createHash("sha256").update(input).digest("base64url").slice(0, 16);
}

async function fetchPage(baseUrl: string, page: number): Promise<ShopifyProduct[]> {
  const res = await fetch(`${baseUrl}/products.json?limit=250&page=${page}`, {
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
      // El product_type de Shopify suele ser más fiable que el título para
      // clasificar, así que se le da a categorize() junto con el título.
      const textoParaClasificar = `${title} ${p.product_type ?? ""}`;

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
        category: categorize(textoParaClasificar),
        gender: detectGender(textoParaClasificar),
        scrapedAt: new Date().toISOString(),
        source: "auto",
      });
    }

    if (products.length < 250) break; // última página
  }

  return { deals: [...byId.values()], cardsFound };
}
