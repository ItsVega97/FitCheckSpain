import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import { launchBrowser, fetchRenderedHtml } from "./engine-headless";
import { categorize, detectGender } from "./categorize";
import type { Deal } from "../../lib/types";

/**
 * Cortefiel (grupo Tendam, mismo que Springfield y Womensecret) pinta el
 * listado con JavaScript, pero una vez renderizado cada tarjeta trae su
 * propio bloque JSON-LD con @type "Product" — el mismo patrón que
 * Womensecret, de ahí que se reutilice la misma técnica de extracción.
 *
 * El sondeo encontró 60 bloques de producto en la página de rebajas de
 * mujer. La URL real de rebajas se descubrió crawleando la portada (las
 * adivinadas daban 404).
 */
interface JsonLdProduct {
  "@type"?: string;
  name?: string;
  url?: string;
  image?: string | string[];
  offers?: { price?: number | string; priceCurrency?: string } | { price?: number | string }[];
}

const LISTING_URLS: { url: string; gender: "hombre" | "mujer" | "niños" }[] = [
  { url: "https://cortefiel.com/es/es/rebajas/rebajas-mujer", gender: "mujer" },
  { url: "https://cortefiel.com/es/es/rebajas/rebajas-hombre", gender: "hombre" },
];

function hashId(input: string): string {
  return createHash("sha256").update(input).digest("base64url").slice(0, 16);
}

function extractProducts(html: string): JsonLdProduct[] {
  const $ = cheerio.load(html);
  const out: JsonLdProduct[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw.trim()) return;
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    // Puede venir un producto suelto, un array, o un @graph
    const candidatos: unknown[] = Array.isArray(data)
      ? data
      : typeof data === "object" && data !== null && "@graph" in data
        ? ((data as { "@graph": unknown[] })["@graph"] ?? [])
        : [data];
    for (const c of candidatos) {
      const obj = c as JsonLdProduct;
      if (obj && obj["@type"] === "Product") out.push(obj);
    }
  });
  return out;
}

function firstPrice(offers: JsonLdProduct["offers"]): number | null {
  if (!offers) return null;
  const o = Array.isArray(offers) ? offers[0] : offers;
  if (!o || o.price === undefined) return null;
  const n = typeof o.price === "number" ? o.price : Number(String(o.price).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function scrapeCortefiel(): Promise<{ deals: Deal[]; cardsFound: number }> {
  const browser = await launchBrowser();
  const byId = new Map<string, Deal>();
  let cardsFound = 0;

  try {
    for (const { url, gender } of LISTING_URLS) {
      let html: string;
      try {
        html = await fetchRenderedHtml(browser, url, { waitForSelector: 'script[type="application/ld+json"]' });
      } catch {
        continue; // una sección caída no debe tumbar la otra
      }
      const products = extractProducts(html);
      cardsFound += products.length;

      for (const p of products) {
        const price = firstPrice(p.offers);
        if (!p.url || price === null) continue;

        const productUrl = new URL(p.url, url).toString();
        // Cortefiel publica un JSON-LD por cada COLOR del mismo producto
        // (misma ficha con ?dwvar_XXX_color=NN), lo que llenaría la web de
        // tarjetas idénticas. Se deduplica por la ficha base ignorando la
        // query, quedándonos con el primer color de cada producto.
        const claveProducto = new URL(productUrl);
        claveProducto.search = "";
        const id = `cortefiel-${hashId(claveProducto.toString())}`;
        if (byId.has(id)) continue;

        const title = p.name?.trim() || "Producto sin título";
        const imageUrl = Array.isArray(p.image) ? (p.image[0] ?? null) : (p.image ?? null);

        byId.set(id, {
          id,
          store: "cortefiel",
          storeName: "Cortefiel",
          title,
          imageUrl,
          productUrl,
          price,
          originalPrice: null,
          discountPercent: null,
          currency: "EUR",
          category: categorize(title),
          gender: detectGender(title) ?? gender,
          scrapedAt: new Date().toISOString(),
          source: "auto",
        });
      }
    }
  } finally {
    await browser.close();
  }

  return { deals: [...byId.values()], cardsFound };
}
