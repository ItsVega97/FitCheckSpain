/**
 * Sondea si el catálogo de rebajas de una tienda se puede extraer, y por qué
 * vía. Sirve para decidir a cuáles merece la pena dedicar un scraper.
 *
 *   npx tsx scripts/sondear-tiendas.ts            # todas
 *   npx tsx scripts/sondear-tiendas.ts zara mango # solo esas
 *
 * Hay que ejecutarlo con salida a internet de verdad (un runner de GitHub
 * Actions vale; el entorno de desarrollo no llega a las tiendas).
 *
 * Dos cosas aprendidas a base de equivocarse y que el sondeo tiene en cuenta:
 *
 *  1. Las URLs de rebajas NO se adivinan. Las inventadas devuelven 404 y es
 *     facilísimo confundir eso con un bloqueo. Por eso se busca el enlace
 *     real crawleando la portada.
 *  2. Un 403 en la primera petición es bloqueo de red (Akamai, Cloudflare);
 *     un 200 sin productos reconocibles es otra cosa muy distinta: la
 *     página se pinta con JavaScript y hace falta navegador. Se distinguen
 *     porque la solución es diferente en cada caso.
 */

export type Via =
  | "shopify" // /products.json abierto: la mejor con diferencia
  | "json-ld" // JSON-LD de producto en el HTML
  | "next-data" // __NEXT_DATA__ o __NUXT__ con el listado
  | "microdatos" // schema.org en los atributos
  | "navegador" // 200 pero sin datos en la carga inicial
  | "bloqueada" // 403 / challenge
  | "sin-rebajas" // no se encontró sección de rebajas
  | "error";

export interface Resultado {
  id: string;
  dominio: string;
  via: Via;
  detalle: string;
  urlRebajas?: string;
  productos?: number;
  conPrecioOriginal?: boolean;
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

async function pedir(url: string): Promise<{ status: number; body: string; error?: string }> {
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "es-ES,es;q=0.9" },
      redirect: "follow",
      signal: AbortSignal.timeout(25000),
    });
    return { status: r.status, body: await r.text() };
  } catch (e) {
    return { status: 0, body: "", error: e instanceof Error ? e.message : String(e) };
  }
}

/** Enlaces de la portada que apuntan a rebajas/outlet, ya absolutos. */
function enlacesRebajas(html: string, base: string): string[] {
  const re = /href="([^"]*(?:rebajas|sale|outlet|descuento|promocion)[^"]*)"/gi;
  const host = new URL(base).host;
  const vistos = new Set<string>();
  for (const m of html.matchAll(re)) {
    let h = m[1];
    if (h.startsWith("//")) h = "https:" + h;
    else if (h.startsWith("/")) h = base.replace(/\/$/, "") + h;
    else if (!h.startsWith("http")) continue;
    // Fuera enlaces a terceros (newsletters, outlets de otra marca)
    try {
      if (new URL(h).host !== host) continue;
    } catch {
      continue;
    }
    vistos.add(h);
    if (vistos.size >= 6) break;
  }
  return [...vistos];
}

function contarJsonLd(html: string): number {
  let n = 0;
  for (const m of html.matchAll(
    /<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const t = JSON.stringify(JSON.parse(m[1]));
      n += (t.match(/"@type"\s*:\s*"Product"/g) ?? []).length;
    } catch {
      /* JSON-LD roto: no cuenta */
    }
  }
  return n;
}

export async function sondear(id: string, dominio: string): Promise<Resultado> {
  const base = dominio.replace(/\/$/, "");

  // 1. Shopify. Es la vía más fácil y además trae precio original.
  const shop = await pedir(`${base}/products.json?limit=5&country=ES`);
  if (shop.status === 200) {
    try {
      const d = JSON.parse(shop.body) as {
        products?: { variants?: { price?: string; compare_at_price?: string | null }[] }[];
      };
      if (Array.isArray(d.products) && d.products.length) {
        const conOriginal = d.products.some((p) => p.variants?.[0]?.compare_at_price);
        return {
          id,
          dominio: base,
          via: "shopify",
          detalle: "/products.json abierto",
          productos: d.products.length,
          conPrecioOriginal: conOriginal,
        };
      }
    } catch {
      /* 200 pero no es Shopify */
    }
  }

  // 2. Portada: distingue bloqueo de red de "hay que renderizar".
  const home = await pedir(base);
  if (home.status === 403 || home.status === 429) {
    return { id, dominio: base, via: "bloqueada", detalle: `portada HTTP ${home.status}` };
  }
  if (home.status !== 200) {
    return {
      id,
      dominio: base,
      via: "error",
      detalle: home.error ?? `portada HTTP ${home.status}`,
    };
  }

  // 3. El enlace real de rebajas, nunca adivinado.
  const candidatos = enlacesRebajas(home.body, base);
  if (!candidatos.length) {
    return { id, dominio: base, via: "sin-rebajas", detalle: "sin enlace de rebajas en la portada" };
  }

  for (const url of candidatos.slice(0, 3)) {
    const r = await pedir(url);
    if (r.status === 403) {
      return { id, dominio: base, via: "bloqueada", detalle: "rebajas HTTP 403", urlRebajas: url };
    }
    if (r.status !== 200) continue;

    const ld = contarJsonLd(r.body);
    if (ld >= 3) {
      return {
        id,
        dominio: base,
        via: "json-ld",
        detalle: `${ld} productos en JSON-LD`,
        urlRebajas: url,
        productos: ld,
      };
    }
    if (/__NEXT_DATA__|window\.__NUXT__/.test(r.body)) {
      // Solo cuenta si además hay rastro de productos; si no, es una cáscara.
      const pistas = (r.body.match(/"price"|"currentPrice"|"salePrice"/g) ?? []).length;
      if (pistas >= 10) {
        return {
          id,
          dominio: base,
          via: "next-data",
          detalle: `JSON embebido con ${pistas} precios`,
          urlRebajas: url,
        };
      }
    }
    const micro = (r.body.match(/itemprop="price"/g) ?? []).length;
    if (micro >= 3) {
      return {
        id,
        dominio: base,
        via: "microdatos",
        detalle: `${micro} precios en microdatos`,
        urlRebajas: url,
        productos: micro,
      };
    }
  }

  return {
    id,
    dominio: base,
    via: "navegador",
    detalle: "200 pero sin datos en la carga inicial",
    urlRebajas: candidatos[0],
  };
}

/**
 * Las 50 tiendas de ropa con más presencia en España. El orden de esta lista
 * NO es el del informe: aquí solo importa cubrirlas todas.
 */
export const CANDIDATAS: [string, string][] = [
  ["zara", "https://www.zara.com/es"],
  ["hm", "https://www2.hm.com/es_es"],
  ["shein", "https://es.shein.com"],
  ["primark", "https://www.primark.com/es-es"],
  ["mango", "https://shop.mango.com/es"],
  ["bershka", "https://www.bershka.com/es"],
  ["pullbear", "https://www.pullandbear.com/es"],
  ["stradivarius", "https://www.stradivarius.com/es"],
  ["massimodutti", "https://www.massimodutti.com/es"],
  ["oysho", "https://www.oysho.com/es"],
  ["lefties", "https://www.lefties.com/es"],
  ["decathlon", "https://www.decathlon.es"],
  ["elcorteingles", "https://www.elcorteingles.es"],
  ["zalando", "https://www.zalando.es"],
  ["asos", "https://www.asos.com/es"],
  ["nike", "https://www.nike.com/es"],
  ["adidas", "https://www.adidas.es"],
  ["kiabi", "https://www.kiabi.es"],
  ["cya", "https://www.c-and-a.com/es/es"],
  ["uniqlo", "https://www.uniqlo.com/es/es"],
  ["springfield", "https://www.myspringfield.com"],
  ["cortefiel", "https://cortefiel.com"],
  ["womensecret", "https://womensecret.com"],
  ["pedrodelhierro", "https://www.pedrodelhierro.com"],
  ["sfera", "https://www.sfera.com"],
  ["desigual", "https://www.desigual.com"],
  ["bimbaylola", "https://www.bimbaylola.com"],
  ["scalpers", "https://scalperscompany.com"],
  ["pepejeans", "https://www.pepejeans.com"],
  ["levis", "https://www.levi.com/ES/es_ES"],
  ["tommy", "https://es.tommy.com"],
  ["calvinklein", "https://www.calvinklein.es"],
  ["puma", "https://es.puma.com"],
  ["newbalance", "https://www.newbalance.es"],
  ["vans", "https://www.vans.es"],
  ["converse", "https://www.converse.com/es"],
  ["thenorthface", "https://www.thenorthface.es"],
  ["timberland", "https://www.timberland.es"],
  ["skechers", "https://www.skechers.es"],
  ["camper", "https://www.camper.com/es_ES"],
  ["munich", "https://www.munichsports.com"],
  ["pikolinos", "https://www.pikolinos.com"],
  ["adolfodominguez", "https://www.adolfodominguez.com"],
  ["purificaciongarcia", "https://www.purificaciongarcia.com"],
  ["elganso", "https://www.elganso.com"],
  ["silbon", "https://silbonshop.com"],
  ["hoss", "https://hossintropia.com"],
  ["salsajeans", "https://www.salsajeans.com"],
  ["nudeproject", "https://nudeproject.com"],
  ["ecoalf", "https://ecoalf.com"],
];

async function main() {
  const filtro = process.argv.slice(2);
  const lista = filtro.length ? CANDIDATAS.filter(([id]) => filtro.includes(id)) : CANDIDATAS;
  const resultados: Resultado[] = [];

  for (const [id, dominio] of lista) {
    const r = await sondear(id, dominio);
    resultados.push(r);
    const extra = r.productos ? ` (${r.productos})` : "";
    const orig = r.conPrecioOriginal ? " +precio original" : "";
    console.log(`${r.via.padEnd(12)} ${id.padEnd(20)} ${r.detalle}${extra}${orig}`);
  }

  console.log("\n===JSON===");
  console.log(JSON.stringify(resultados, null, 2));
}

if (process.argv[1]?.includes("sondear-tiendas")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
