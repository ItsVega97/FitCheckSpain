import { createHash } from "node:crypto";
import { fetchHtml } from "./engine";
import { categorize, detectGender } from "./categorize";
import type { Deal } from "../../lib/types";

/**
 * Puma expone el listado de la página de ofertas como JSON-LD estándar
 * (<script type="application/ld+json">) con un bloque @type "ItemList"
 * cuyos itemListElement son Product con offers.price. No incluye precio
 * original ni descuento (solo el precio ya rebajado), así que esos campos
 * quedan a null: la UI ya soporta mostrarlos sin la insignia de descuento.
 */
function extractProductItemList(html: string): PumaListItem[] {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  let best: PumaListItem[] = [];
  for (const [, raw] of blocks) {
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      continue;
    }
    const obj = data as Record<string, unknown>;
    const items = (obj.itemListElement ??
      (obj.mainEntity as Record<string, unknown> | undefined)?.itemListElement) as
      | PumaListItem[]
      | undefined;
    if (!Array.isArray(items) || items.length === 0) continue;
    // Descarta bloques como BreadcrumbList (sus itemListElement no son Product)
    const looksLikeProducts = items.some((i) => i.item?.["@type"] === "Product" || i.item?.offers);
    if (looksLikeProducts && items.length > best.length) best = items;
  }
  return best;
}

interface PumaListItem {
  item?: {
    "@type"?: string;
    name?: string;
    url?: string;
    image?: string;
    offers?: { price?: number; priceCurrency?: string };
  };
}

function hashId(input: string): string {
  return createHash("sha256").update(input).digest("base64url").slice(0, 16);
}

const LISTING_URL = "https://es.puma.com/es/es/sale";

export async function scrapePuma(): Promise<{ deals: Deal[]; cardsFound: number }> {
  const html = await fetchHtml(LISTING_URL);
  const items = extractProductItemList(html);
  if (items.length === 0) return { deals: [], cardsFound: 0 };

  const deals: Deal[] = [];
  for (const { item } of items) {
    const url = item?.url;
    const price = item?.offers?.price;
    if (!url || typeof price !== "number") continue;

    const title = item?.name ?? "Producto sin título";

    deals.push({
      id: `puma-${hashId(url)}`,
      store: "puma",
      storeName: "Puma",
      title,
      imageUrl: item?.image ?? null,
      productUrl: url,
      price,
      originalPrice: null,
      discountPercent: null,
      currency: item?.offers?.priceCurrency ?? "EUR",
      category: categorize(title),
      gender: detectGender(title),
      scrapedAt: new Date().toISOString(),
      source: "auto",
    });
  }

  return { deals, cardsFound: items.length };
}
