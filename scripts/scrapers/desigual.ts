import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import { launchBrowser, fetchRenderedHtml } from "./engine-headless";
import { categorize, detectGender } from "./categorize";
import type { Deal } from "../../lib/types";

/**
 * Desigual usa Salesforce Commerce Cloud (Demandware) con la plantilla de
 * referencia SFRA, así que cada tarjeta (.product-tile) trae microdatos
 * schema.org completos con precio actual y original en <meta itemprop=
 * "price"> — no hace falta ni JSON-LD ni adivinar selectores por clase
 * hasheada. No se ha confirmado bloqueo con fetch simple, pero se usa el
 * mismo navegador headed que el resto de tiendas por consistencia.
 *
 * Solo se ha verificado la URL de rebajas de mujer; Desigual también vende
 * hombre y niños pero no se han localizado esas URLs de rebajas todavía.
 */
const LISTING_URL = "https://www.desigual.com/es_ES/rebajas/";
const CARD_SELECTOR = ".product-tile";

function hashId(input: string): string {
  return createHash("sha256").update(input).digest("base64url").slice(0, 16);
}

export async function scrapeDesigual(): Promise<{ deals: Deal[]; cardsFound: number }> {
  const browser = await launchBrowser();
  const byId = new Map<string, Deal>();
  let totalCards = 0;

  try {
    const html = await fetchRenderedHtml(browser, LISTING_URL, { waitForSelector: CARD_SELECTOR });
    const $ = cheerio.load(html);
    const cards = $(CARD_SELECTOR);
    totalCards = cards.length;

    cards.each((_, el) => {
      const card = $(el);
      const linkEl = card.find(".product-name").first();
      const href = linkEl.attr("href");
      if (!href) return;

      const productUrl = new URL(href, LISTING_URL).toString();
      const id = `desigual-${hashId(productUrl)}`;
      if (byId.has(id)) return;

      const title = linkEl.text().trim() || "Producto sin título";

      const priceContent = card.find(".sales meta[itemprop='price']").first().attr("content");
      const price = priceContent ? parseFloat(priceContent) : null;
      if (price === null || !Number.isFinite(price)) return;

      const originalContent = card.find(".strike-through meta[itemprop='price']").first().attr("content");
      const originalPrice = originalContent ? parseFloat(originalContent) : null;
      const discountPercent =
        originalPrice && Number.isFinite(originalPrice) && originalPrice > price
          ? Math.round(((originalPrice - price) / originalPrice) * 100)
          : null;

      const imageUrl = card.find("img.product-image").first().attr("src") ?? null;

      byId.set(id, {
        id,
        store: "desigual",
        storeName: "Desigual",
        title,
        imageUrl,
        productUrl,
        price,
        originalPrice: originalPrice ?? null,
        discountPercent,
        currency: "EUR",
        category: categorize(title),
        gender: detectGender(title) ?? "mujer",
        scrapedAt: new Date().toISOString(),
        source: "auto",
      });
    });
  } finally {
    await browser.close();
  }

  return { deals: [...byId.values()], cardsFound: totalCards };
}
