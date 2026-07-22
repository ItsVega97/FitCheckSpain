import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import type { Deal } from "../../lib/types";
import type { StoreConfig } from "./types";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export async function fetchHtml(url: string, timeoutMs = 15000): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        "Accept-Language": "es-ES,es;q=0.9",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} al pedir ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

function absoluteUrl(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

/** Convierte texto de precio ("19,99 €", "1.234,56€", "$19.99") a número. */
export function parsePrice(text: string | undefined | null): number | null {
  if (!text) return null;
  const match = text.match(/[\d.,]+/);
  if (!match) return null;
  let num = match[0];
  const hasComma = num.includes(",");
  const hasDot = num.includes(".");
  if (hasComma && hasDot) {
    // formato europeo: punto de miles, coma decimal -> "1.234,56"
    num = num.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    num = num.replace(",", ".");
  }
  const value = parseFloat(num);
  return Number.isFinite(value) ? value : null;
}

function textOf($: cheerio.CheerioAPI, root: cheerio.Cheerio<any>, selector: string): string | null {
  if (!selector) return null;
  const el = root.find(selector).first();
  if (!el.length) return null;
  const text = el.text().trim();
  return text || null;
}

function imageOf($: cheerio.CheerioAPI, root: cheerio.Cheerio<any>, selector: string, base: string): string | null {
  const el = root.find(selector).first();
  if (!el.length) return null;
  const src =
    el.attr("src") || el.attr("data-src") || el.attr("data-srcset")?.split(" ")[0] || el.attr("srcset")?.split(" ")[0];
  if (!src) return null;
  return absoluteUrl(src, base);
}

function hashId(input: string): string {
  return createHash("sha256").update(input).digest("base64url").slice(0, 16);
}

export interface ScrapeOutcome {
  deals: Deal[];
  cardsFound: number;
}

export function parseListing(html: string, baseUrl: string, config: StoreConfig): ScrapeOutcome {
  const $ = cheerio.load(html);
  const cards = $(config.selectors.card);
  const deals: Deal[] = [];
  const max = config.maxProducts ?? 24;

  cards.each((i, el) => {
    if (deals.length >= max) return;
    const card = $(el);

    const linkEl = card.find(config.selectors.link).first();
    const href = linkEl.attr("href");
    const productUrl = href ? absoluteUrl(href, baseUrl) : null;
    if (!productUrl) return;

    const title = textOf($, card, config.selectors.title) ?? "Producto sin título";
    const imageUrl = imageOf($, card, config.selectors.image, baseUrl);
    const price = parsePrice(textOf($, card, config.selectors.price));
    const originalPrice = config.selectors.originalPrice
      ? parsePrice(textOf($, card, config.selectors.originalPrice))
      : null;

    if (price === null) return;

    const discountPercent =
      originalPrice && originalPrice > price
        ? Math.round(((originalPrice - price) / originalPrice) * 100)
        : null;

    deals.push({
      id: `${config.id}-${hashId(productUrl)}`,
      store: config.id,
      storeName: config.name,
      title,
      imageUrl,
      productUrl,
      price,
      originalPrice: originalPrice ?? null,
      discountPercent,
      currency: "EUR",
      scrapedAt: new Date().toISOString(),
      source: "auto",
    });
  });

  return { deals, cardsFound: cards.length };
}

export async function scrapeStore(config: StoreConfig): Promise<ScrapeOutcome> {
  const combined: ScrapeOutcome = { deals: [], cardsFound: 0 };
  for (const listingUrl of config.listingUrls) {
    const html = await fetchHtml(listingUrl);
    const result = parseListing(html, listingUrl, config);
    combined.deals.push(...result.deals);
    combined.cardsFound += result.cardsFound;
  }
  // Solo se conservan ofertas con descuento real detectado
  combined.deals = combined.deals.filter((d) => (d.discountPercent ?? 0) > 0);
  return combined;
}
