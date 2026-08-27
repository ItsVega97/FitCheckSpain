import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import { launchBrowser, fetchRenderedHtml } from "./engine-headless";
import { categorize, detectGender } from "./categorize";
import type { Deal, StoreId } from "../../lib/types";

/**
 * Scraper del grupo Tendam: Cortefiel, Springfield y Pedro del Hierro.
 *
 * Las tres montan la misma plataforma, y una vez cargado el listado cada
 * tarjeta trae su propio bloque JSON-LD con @type "Product" — el mismo
 * patrón que ya usaba Womensecret.
 *
 * La diferencia entre ellas es solo si hace falta navegador:
 *
 *   Cortefiel        pinta el listado con JavaScript -> headed + Xvfb
 *   Springfield      devuelve los 60 productos en el HTML -> fetch simple
 *   Pedro del Hierro igual que Springfield -> fetch simple
 *
 * Un fetch simple es mucho más rápido y no gasta navegador, así que se usa
 * siempre que la tienda lo permita.
 *
 * Todas las URLs de rebajas se descubrieron crawleando la portada: las
 * adivinadas devuelven 404, que es fácil confundir con un bloqueo.
 */
interface JsonLdProduct {
  "@type"?: string;
  name?: string;
  url?: string;
  image?: string | string[];
  offers?: { price?: number | string; priceCurrency?: string } | { price?: number | string }[];
}

export type Genero = "hombre" | "mujer" | "niños";

export interface TendamStore {
  id: StoreId;
  name: string;
  /** Si el listado se pinta con JS y hace falta navegador headed. */
  necesitaNavegador: boolean;
  listados: { url: string; gender: Genero }[];
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

export const TENDAM_STORES: TendamStore[] = [
  {
    id: "cortefiel",
    name: "Cortefiel",
    necesitaNavegador: true,
    listados: [
      { url: "https://cortefiel.com/es/es/rebajas/rebajas-mujer", gender: "mujer" },
      { url: "https://cortefiel.com/es/es/rebajas/rebajas-hombre", gender: "hombre" },
    ],
  },
  {
    id: "springfield",
    name: "Springfield",
    necesitaNavegador: false,
    listados: [
      { url: "https://myspringfield.com/es/es/mujer/promociones/rebajas-mujer", gender: "mujer" },
      { url: "https://myspringfield.com/es/es/hombre/promociones/rebajas-hombre", gender: "hombre" },
    ],
  },
  {
    id: "pedrodelhierro",
    name: "Pedro del Hierro",
    necesitaNavegador: false,
    listados: [
      { url: "https://pedrodelhierro.com/es/es/mujer/rebajas", gender: "mujer" },
      { url: "https://pedrodelhierro.com/es/es/hombre/rebajas", gender: "hombre" },
    ],
  },
];

function hashId(input: string): string {
  return createHash("sha256").update(input).digest("base64url").slice(0, 16);
}

export function extractProducts(html: string): JsonLdProduct[] {
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

async function fetchSimple(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "es-ES,es;q=0.9" },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export async function scrapeTendam(
  store: TendamStore,
): Promise<{ deals: Deal[]; cardsFound: number }> {
  const byId = new Map<string, Deal>();
  let cardsFound = 0;
  const browser = store.necesitaNavegador ? await launchBrowser() : null;

  try {
    for (const { url, gender } of store.listados) {
      let html: string;
      try {
        html = browser
          ? await fetchRenderedHtml(browser, url, {
              waitForSelector: 'script[type="application/ld+json"]',
            })
          : await fetchSimple(url);
      } catch {
        continue; // una sección caída no debe tumbar la otra
      }
      const products = extractProducts(html);
      cardsFound += products.length;

      for (const p of products) {
        const price = firstPrice(p.offers);
        if (!p.url || price === null) continue;

        const productUrl = new URL(p.url, url).toString();
        // Tendam publica un JSON-LD por cada COLOR del mismo producto (misma
        // ficha con ?dwvar_XXX_color=NN), lo que llenaría la web de tarjetas
        // idénticas. Se deduplica por la ficha base ignorando la query.
        const claveProducto = new URL(productUrl);
        claveProducto.search = "";
        const id = `${store.id}-${hashId(claveProducto.toString())}`;
        if (byId.has(id)) continue;

        const title = p.name?.trim() || "Producto sin título";
        const imageUrl = Array.isArray(p.image) ? (p.image[0] ?? null) : (p.image ?? null);

        byId.set(id, {
          id,
          store: store.id,
          storeName: store.name,
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
    await browser?.close();
  }

  return { deals: [...byId.values()], cardsFound };
}
