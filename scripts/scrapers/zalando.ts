import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import { launchBrowser, fetchRenderedHtml } from "./engine-headless";
import { parsePrice } from "./engine";
import { categorize, detectGender } from "./categorize";
import type { Deal } from "../../lib/types";

/**
 * Zalando bloquea con Akamai (403) el fetch simple, pero deja pasar la
 * petición en modo headed (con Xvfb), igual que Mango/Womensecret. Una vez
 * renderizada, el grid de rebajas usa CSS Modules con clases totalmente
 * hasheadas y sin ninguna palabra reconocible ("price", "title"...), así
 * que no se puede seleccionar por nombre de clase como en Mango. En su
 * lugar se navega por la estructura fija de cada <article>: dos enlaces
 * (imagen y ficha), un <h3> con dos <span> (marca, nombre) y una <section>
 * con uno o dos <p> (precio actual, y si hay descuento, un segundo <p> con
 * el precio de referencia + el % de descuento). Esta estructura es más
 * frágil que un selector por clase si Zalando cambia el layout, pero es lo
 * único estable disponible.
 */
const LISTING_URL = "https://www.zalando.es/rebajas/";
const ARTICLE_SELECTOR = "article";

function hashId(input: string): string {
  return createHash("sha256").update(input).digest("base64url").slice(0, 16);
}

export async function scrapeZalando(): Promise<{ deals: Deal[]; cardsFound: number }> {
  const browser = await launchBrowser();
  const byId = new Map<string, Deal>();
  let totalCards = 0;

  try {
    const html = await fetchRenderedHtml(browser, LISTING_URL, { waitForSelector: ARTICLE_SELECTOR });
    const $ = cheerio.load(html);
    const articles = $(ARTICLE_SELECTOR);
    totalCards = articles.length;

    articles.each((_, el) => {
      const article = $(el);
      const href = article.find("a[href]").last().attr("href");
      if (!href) return;

      const productUrl = new URL(href, LISTING_URL).toString();
      const id = `zalando-${hashId(productUrl)}`;
      if (byId.has(id)) return;

      const spans = article.find("header h3 span");
      const brand = spans.eq(0).text().trim();
      const name = spans.eq(1).text().trim();
      if (!name) return;
      const title = brand ? `${brand} ${name}` : name;

      const priceParagraphs = article.find("section p");
      const price = parsePrice(priceParagraphs.eq(0).find("span").first().text());
      if (price === null) return;

      let originalPrice: number | null = null;
      if (priceParagraphs.length > 1) {
        originalPrice = parsePrice(priceParagraphs.eq(1).find("span").eq(1).text());
      }
      const discountPercent =
        originalPrice && originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : null;

      const imageUrl = article.find("img").first().attr("src") ?? null;

      byId.set(id, {
        id,
        store: "zalando",
        storeName: "Zalando",
        title,
        imageUrl,
        productUrl,
        price,
        originalPrice,
        discountPercent,
        currency: "EUR",
        category: categorize(title),
        gender: detectGender(title),
        scrapedAt: new Date().toISOString(),
        source: "auto",
      });
    });
  } finally {
    await browser.close();
  }

  return { deals: [...byId.values()], cardsFound: totalCards };
}
