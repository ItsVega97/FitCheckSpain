import { createHash } from "node:crypto";
import { launchBrowser, fetchRenderedHtml } from "./engine-headless";
import { categorize, detectGender } from "./categorize";
import type { Deal } from "../../lib/types";

/**
 * Womensecret pinta el listado de "remate final" (su sección de rebajas)
 * con JavaScript en el cliente: un fetch simple nunca ve productos. Hace
 * falta un navegador real (Playwright) para que se ejecute el JS.
 *
 * Una vez renderizada, cada tarjeta de producto (.productTile) trae su
 * propio bloque JSON-LD (<script type="application/ld+json"> con
 * @type: "Product") con nombre, url, imagen y precio — igual que Puma,
 * solo que aquí hay un bloque por producto en vez de un ItemList único.
 */
interface JsonLdProduct {
  "@type"?: string;
  name?: string;
  url?: string;
  image?: string;
  offers?: { price?: number; priceCurrency?: string };
}

function extractProductsFromJsonLd(html: string): JsonLdProduct[] {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const products: JsonLdProduct[] = [];
  for (const [, raw] of blocks) {
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      continue;
    }
    const obj = data as JsonLdProduct;
    if (obj["@type"] === "Product") products.push(obj);
  }
  return products;
}

function hashId(input: string): string {
  return createHash("sha256").update(input).digest("base64url").slice(0, 16);
}

const LISTING_URLS: { url: string; gender: "hombre" | "mujer" }[] = [
  { url: "https://womensecret.com/es/es/promociones/remate-final/mujer", gender: "mujer" },
  { url: "https://womensecret.com/es/es/promociones/remate-final/hombre", gender: "hombre" },
];

export async function scrapeWomensecret(): Promise<{ deals: Deal[]; cardsFound: number }> {
  const browser = await launchBrowser();
  const byId = new Map<string, Deal>();
  let totalCards = 0;
  try {
    for (const { url, gender } of LISTING_URLS) {
      const html = await fetchRenderedHtml(browser, url, { waitForSelector: ".productTile" });
      const products = extractProductsFromJsonLd(html);
      totalCards += products.length;

      for (const p of products) {
        if (!p.url || typeof p.offers?.price !== "number") continue;
        const id = `womensecret-${hashId(p.url)}`;
        if (byId.has(id)) continue;

        const title = p.name ?? "Producto sin título";
        byId.set(id, {
          id,
          store: "womensecret",
          storeName: "Womensecret",
          title,
          imageUrl: p.image ?? null,
          productUrl: p.url,
          price: p.offers.price,
          originalPrice: null,
          discountPercent: null,
          currency: p.offers.priceCurrency ?? "EUR",
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

  return { deals: [...byId.values()], cardsFound: totalCards };
}
