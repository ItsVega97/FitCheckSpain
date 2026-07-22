import fs from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import { fetchHtml, parsePrice } from "./scrapers/engine";
import type { Deal, StoreId } from "../lib/types";
import { STORES } from "../lib/stores";

const DATA_DIR = path.join(process.cwd(), "data");

/**
 * Añade una oferta a mano, ideal para tiendas sin scraper automático
 * (Zara, Nike, Adidas, Privalia...) o cuando el scraper no ha detectado un
 * producto concreto.
 *
 * Uso:
 *   npm run add-deal -- <url> [tienda] [precio] [precioOriginal]
 *
 * Si no se indican precio/precioOriginal, se intenta detectarlos
 * automáticamente a partir de las etiquetas Open Graph / JSON-LD de la
 * página. No siempre funciona (depende de cada web); en ese caso pásalos
 * a mano, por ejemplo:
 *   npm run add-deal -- https://www.zara.com/es/... zara 19.99 39.99
 */

function guessStore(url: string): StoreId {
  const host = new URL(url).hostname;
  const found = STORES.find((s) => host.includes(s.id) || host.includes(s.name.toLowerCase().replace(/[^a-z]/g, "")));
  return found?.id ?? "otros";
}

function meta($: cheerio.CheerioAPI, name: string): string | undefined {
  return (
    $(`meta[property='${name}']`).attr("content") ?? $(`meta[name='${name}']`).attr("content")
  );
}

async function main() {
  const [url, storeArg, priceArg, originalPriceArg] = process.argv.slice(2);

  if (!url) {
    console.error("Uso: npm run add-deal -- <url> [tienda] [precio] [precioOriginal]");
    process.exit(1);
  }

  console.log(`Descargando ${url} ...`);
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const title = meta($, "og:title") ?? $("title").text().trim() ?? "Producto sin título";
  const imageUrl = meta($, "og:image") ?? null;

  let price = priceArg ? parsePrice(priceArg) : null;
  let originalPrice = originalPriceArg ? parsePrice(originalPriceArg) : null;

  if (price === null) {
    const ogPrice = meta($, "product:price:amount") ?? meta($, "og:price:amount");
    price = parsePrice(ogPrice ?? null);
  }

  if (price === null) {
    console.error(
      "No se ha podido detectar el precio automáticamente. Vuelve a ejecutar pasando el precio a mano:\n" +
        `npm run add-deal -- ${url} ${storeArg ?? "otros"} <precio> <precioOriginal>`,
    );
    process.exit(1);
  }

  const store = (storeArg as StoreId) ?? guessStore(url);
  const storeMeta = STORES.find((s) => s.id === store);
  const discountPercent =
    originalPrice && originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : null;

  const deal: Deal = {
    id: `manual-${Date.now()}`,
    store,
    storeName: storeMeta?.name ?? store,
    title,
    imageUrl,
    productUrl: url,
    price,
    originalPrice,
    discountPercent,
    currency: "EUR",
    scrapedAt: new Date().toISOString(),
    source: "manual",
  };

  const manualPath = path.join(DATA_DIR, "manual-deals.json");
  const existing: Deal[] = JSON.parse(await fs.readFile(manualPath, "utf-8").catch(() => "[]"));
  existing.unshift(deal);
  await fs.writeFile(manualPath, JSON.stringify(existing, null, 2), "utf-8");

  console.log(`Añadida: "${deal.title}" (${deal.price}€${deal.originalPrice ? `, antes ${deal.originalPrice}€` : ""})`);
  console.log("Recuerda hacer commit + push de data/manual-deals.json para que se publique.");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
