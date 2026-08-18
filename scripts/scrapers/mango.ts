import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import { launchBrowser, fetchRenderedHtml } from "./engine-headless";
import { parsePrice } from "./engine";
import { categorize, detectGender } from "./categorize";
import type { Deal } from "../../lib/types";

/**
 * Mango bloquea con Akamai (403 Access Denied) cualquier fetch simple e
 * incluso Chromium en modo headless — pero deja pasar la petición en modo
 * headed (con Xvfb), ver engine-headless.ts. Una vez renderizada, el
 * listado usa CSS Modules con nombres de clase con sufijo hasheado
 * (p.ej. "ProductCard-module__JeZ2zG__productCard"), así que los
 * selectores usan `[class*="..."]` para no depender del hash exacto, que
 * puede cambiar entre despliegues de Mango.
 *
 * No hay precio original visible en la tarjeta, solo el precio ya
 * rebajado y el % de descuento en una insignia aparte.
 */
const CARD_SELECTOR = '[class*="productCard"]';

const LISTING_URLS: { url: string; gender: "hombre" | "mujer" | "niños" }[] = [
  { url: "https://shop.mango.com/es/es/c/mujer/rebajas--70/93ea7423", gender: "mujer" },
  { url: "https://shop.mango.com/es/es/c/hombre/rebajas--70/3b6679e9", gender: "hombre" },
  { url: "https://shop.mango.com/es/es/c/ninos/nina/rebajas--70/0a0619fb", gender: "niños" },
  { url: "https://shop.mango.com/es/es/c/ninos/nino/rebajas--70/edbe34fc", gender: "niños" },
];

function hashId(input: string): string {
  return createHash("sha256").update(input).digest("base64url").slice(0, 16);
}

export async function scrapeMango(): Promise<{ deals: Deal[]; cardsFound: number }> {
  const browser = await launchBrowser();
  const byId = new Map<string, Deal>();
  let totalCards = 0;

  try {
    for (const { url, gender } of LISTING_URLS) {
      const html = await fetchRenderedHtml(browser, url, { waitForSelector: CARD_SELECTOR });
      const $ = cheerio.load(html);
      const cards = $(CARD_SELECTOR);
      totalCards += cards.length;

      cards.each((_, el) => {
        const card = $(el);
        const href = card.find("a[href]").first().attr("href");
        if (!href) return;

        const productUrl = new URL(href, url).toString();
        const id = `mango-${hashId(productUrl)}`;
        if (byId.has(id)) return;

        const price = parsePrice(card.find('[class*="priceSlot"]').first().text());
        if (price === null) return;

        const title = card.find('[class*="productTitle"]').first().text().trim() || "Producto sin título";
        const discountMatch = card.find('[class*="discountRateHighlighted"]').first().text().match(/(\d+)/);
        const discountPercent = discountMatch ? Number(discountMatch[1]) : null;
        const imageUrl = card.find("img").first().attr("src") ?? null;

        byId.set(id, {
          id,
          store: "mango",
          storeName: "Mango",
          title,
          imageUrl,
          productUrl,
          price,
          originalPrice: null,
          discountPercent,
          currency: "EUR",
          category: categorize(title),
          gender: detectGender(title) ?? gender,
          scrapedAt: new Date().toISOString(),
          source: "auto",
        });
      });
    }
  } finally {
    await browser.close();
  }

  return { deals: [...byId.values()], cardsFound: totalCards };
}
