import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import { launchBrowser, fetchRenderedHtml } from "./engine-headless";
import { categorize, detectGender } from "./categorize";
import type { Deal, StoreId } from "../../lib/types";

/**
 * Scraper para tiendas sobre Salesforce Commerce Cloud con la plantilla de
 * referencia SFRA: Desigual y Skechers.
 *
 * SFRA marca los precios en el propio HTML, así que no hay que adivinar
 * clases hasheadas. Lo que sí cambia entre tiendas es CÓMO los marca, y hay
 * dos variantes en uso:
 *
 *   Desigual  <span class="sales"><meta itemprop="price" content="51.99">
 *   Skechers  <span class="sales"><span class="value" content="51.99">
 *
 * Se prueban las dos, que es más barato que mantener un scraper por tienda.
 * Lo mismo con el enlace y el título: SFRA los pone en .product-name en
 * unas plantillas y en .pdp-link en otras.
 *
 * El precio anterior vive bajo .strike-through con la misma dualidad, y de
 * ahí sale un % de descuento real, no estimado.
 */
export interface SfraStore {
  id: StoreId;
  name: string;
  listados: { url: string; gender: "hombre" | "mujer" | "niños" }[];
}

export const SFRA_STORES: SfraStore[] = [
  {
    id: "desigual",
    name: "Desigual",
    listados: [{ url: "https://www.desigual.com/es_ES/rebajas/", gender: "mujer" }],
  },
  {
    id: "skechers",
    name: "Skechers",
    listados: [
      { url: "https://www.skechers.es/outlet/mujer/", gender: "mujer" },
      { url: "https://www.skechers.es/outlet/hombre/", gender: "hombre" },
    ],
  },
];

/**
 * Selectores de tarjeta que usan las plantillas SFRA que hemos visto.
 *
 * `.product-tile` es la convención de la plantilla de referencia y funciona
 * en Desigual, pero dar por hecho que vale para todas costó un pase entero
 * con Skechers: el selector no aparecía nunca, waitForSelector agotaba el
 * tiempo y la tienda devolvía cero sin decir por qué. Ahora se prueban
 * varios y, si no casa ninguno, el scraper informa de las clases que más se
 * repiten en la página para no tener que volver a adivinar.
 */
const CARD_SELECTORES = [
  ".product-tile",
  "[data-pid]",
  ".product-grid .product",
  "li.grid-tile",
  ".b-product_tile",
  ".product-item",
];

/** Pista para diagnosticar cuando ningún selector casa. */
function clasesMasRepetidas($: cheerio.CheerioAPI): string {
  const cuenta = new Map<string, number>();
  $("div, li, article").each((_, el) => {
    for (const c of ($(el).attr("class") ?? "").split(/\s+/)) {
      if (c.length > 3) cuenta.set(c, (cuenta.get(c) ?? 0) + 1);
    }
  });
  return [...cuenta.entries()]
    .filter(([, n]) => n >= 8)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([c, n]) => `${c}(${n})`)
    .join(" ");
}

function hashId(input: string): string {
  return createHash("sha256").update(input).digest("base64url").slice(0, 16);
}

/**
 * Precio de un bloque (.sales o .strike-through), probando las dos formas
 * en que SFRA lo publica. Se lee del atributo `content`, que trae el número
 * sin formato, en vez del texto visible, que llega como "51,99 €" y habría
 * que desmenuzar.
 */
function precioDe(card: cheerio.Cheerio<never>, bloque: string): number | null {
  const candidatos = [
    card.find(`${bloque} meta[itemprop="price"]`).first().attr("content"),
    card.find(`${bloque} .value`).first().attr("content"),
  ];
  for (const c of candidatos) {
    if (!c) continue;
    const n = parseFloat(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export async function scrapeSfra(store: SfraStore): Promise<{ deals: Deal[]; cardsFound: number }> {
  const browser = await launchBrowser();
  const byId = new Map<string, Deal>();
  let cardsFound = 0;

  try {
    for (const { url, gender } of store.listados) {
      let html: string;
      try {
        // Se espera a cualquiera de los selectores, no a uno concreto: si se
        // espera solo al que no es, se pierden 30 segundos por listado.
        html = await fetchRenderedHtml(browser, url, {
          waitForSelector: CARD_SELECTORES.join(", "),
        });
      } catch {
        continue; // una sección caída no debe tumbar la otra
      }

      const $ = cheerio.load(html);
      const selector = CARD_SELECTORES.find((sel) => $(sel).length > 0);
      if (!selector) {
        console.warn(
          `[warn] ${store.name}: ninguna tarjeta reconocida en ${url}.` +
            ` Clases más repetidas: ${clasesMasRepetidas($) || "(ninguna)"}`,
        );
        continue;
      }
      const cards = $(selector);
      cardsFound += cards.length;

      cards.each((_, el) => {
        const card = $(el) as unknown as cheerio.Cheerio<never>;

        // El enlace del producto: .product-name en unas plantillas,
        // .pdp-link en otras, y si no cualquier <a> que apunte a una ficha.
        const linkEl = [".product-name", ".pdp-link a", "a.link", "a[href*='.html']"]
          .map((sel) => card.find(sel).first())
          .find((n) => n.attr("href"));
        if (!linkEl) return;
        const href = linkEl.attr("href");
        if (!href) return;

        const productUrl = new URL(href, url).toString();
        const id = `${store.id}-${hashId(productUrl)}`;
        if (byId.has(id)) return;

        const price = precioDe(card, ".sales");
        if (price === null) return;

        const originalPrice = precioDe(card, ".strike-through");
        const discountPercent =
          originalPrice && originalPrice > price
            ? Math.round(((originalPrice - price) / originalPrice) * 100)
            : null;

        const title =
          linkEl.text().trim() ||
          card.find("img").first().attr("alt")?.trim() ||
          "Producto sin título";

        const img = card.find("img.product-image, img.tile-image, img").first();
        const imageUrl = img.attr("src") ?? img.attr("data-src") ?? null;

        byId.set(id, {
          id,
          store: store.id,
          storeName: store.name,
          title,
          imageUrl,
          productUrl,
          price,
          originalPrice,
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

  return { deals: [...byId.values()], cardsFound };
}
