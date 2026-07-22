import { createHash } from "node:crypto";
import { fetchHtml } from "./engine";
import type { Deal } from "../../lib/types";

/**
 * ASOS embebe el estado de la página de listado en una línea de JS:
 *   window.asos.plp._data=JSON.parse('{...}')
 * El JSON va entre comillas simples y puede contener comillas dobles sin
 * escapar (delimitador JS es la comilla simple), así que no se puede tratar
 * como un JSON.parse normal ni con una regex ingenua: hace falta escanear
 * carácter a carácter respetando los pares \X como una unidad, y además
 * algunos campos (p.ej. medidas en pulgadas, `5"`) llegan sobre-escapados
 * con más de una barra invertida antes de la comilla.
 */
function extractPlpData(html: string): unknown | null {
  const marker = "window.asos.plp._data=JSON.parse('";
  const start = html.indexOf(marker);
  if (start === -1) return null;

  let i = start + marker.length;
  const buf: string[] = [];
  while (i < html.length) {
    const c = html[i];
    if (c === "\\" && i + 1 < html.length) {
      buf.push(c, html[i + 1]);
      i += 2;
      continue;
    }
    if (c === "'") break;
    buf.push(c);
    i += 1;
  }

  let captured = buf.join("").replace(/\\'/g, "'");
  // Colapsa comillas sobre-escapadas (\\\\" -> \") hasta estabilizar.
  while (captured.includes('\\\\"')) {
    captured = captured.replace(/\\\\"/g, '\\"');
  }

  try {
    return JSON.parse(captured);
  } catch {
    return null;
  }
}

function findProducts(obj: unknown, depth = 0): unknown[] | null {
  if (depth > 6 || obj === null || typeof obj !== "object") return null;
  if (Array.isArray(obj)) {
    for (const item of obj.slice(0, 5)) {
      const found = findProducts(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (key.toLowerCase() === "products" && Array.isArray(value) && value.length > 0) {
      return value;
    }
    const found = findProducts(value, depth + 1);
    if (found) return found;
  }
  return null;
}

interface AsosProduct {
  id?: number | string;
  url?: string;
  price?: number;
  reducedPrice?: number;
  description?: string;
  image?: string;
  isSale?: boolean;
  brandName?: string;
}

function hashId(input: string): string {
  return createHash("sha256").update(input).digest("base64url").slice(0, 16);
}

async function scrapeListing(listingUrl: string): Promise<{ deals: Deal[]; cardsFound: number }> {
  const html = await fetchHtml(listingUrl);
  const data = extractPlpData(html);
  if (!data) return { deals: [], cardsFound: 0 };

  const products = findProducts(data) as AsosProduct[] | null;
  if (!products) return { deals: [], cardsFound: 0 };

  const deals: Deal[] = [];
  for (const p of products) {
    if (!p.url || typeof p.price !== "number" || typeof p.reducedPrice !== "number") continue;
    if (!p.isSale || p.reducedPrice >= p.price) continue;

    const productUrl = `https://www.asos.com/es/${p.url}`;
    const discountPercent = Math.round(((p.price - p.reducedPrice) / p.price) * 100);
    const description = p.description ?? "";
    const title =
      p.brandName && !description.toLowerCase().startsWith(p.brandName.toLowerCase())
        ? `${p.brandName} - ${description}`.trim()
        : description || "Producto sin título";

    deals.push({
      id: `asos-${hashId(productUrl)}`,
      store: "asos",
      storeName: "ASOS",
      title,
      imageUrl: p.image ? `https://${p.image}` : null,
      productUrl,
      price: p.reducedPrice,
      originalPrice: p.price,
      discountPercent,
      currency: "EUR",
      scrapedAt: new Date().toISOString(),
      source: "auto",
    });
  }
  return { deals, cardsFound: products.length };
}

const LISTING_URLS = [
  "https://www.asos.com/es/mujer/rebajas/cat/?cid=7046",
  "https://www.asos.com/es/hombre/rebajas/cat/?cid=8409",
];

export async function scrapeAsos(): Promise<{ deals: Deal[]; cardsFound: number }> {
  const allDeals: Deal[] = [];
  let totalCards = 0;
  for (const url of LISTING_URLS) {
    const { deals, cardsFound } = await scrapeListing(url);
    allDeals.push(...deals);
    totalCards += cardsFound;
  }
  return { deals: allDeals, cardsFound: totalCards };
}
