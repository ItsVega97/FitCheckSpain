import { launchBrowser, fetchRenderedHtml } from "./scrapers/engine-headless";

/**
 * Segunda vuelta del sondeo, con navegador de verdad.
 *
 * El sondeo simple (`sondear-tiendas.ts`) marcó nueve tiendas como
 * "necesita navegador", pero peca de pesimista por dos motivos que aquí se
 * corrigen:
 *
 *  1. Cogía el PRIMER enlace de la portada que sonara a rebajas, y muchas
 *     veces es una landing de campaña y no la parrilla de productos. Se
 *     comprobó en Nike (/codigo-promocional en vez de /w/ofertas-3yaep),
 *     ASOS y Springfield, tres tiendas que funcionan en producción y que
 *     aun así salieron como no viables.
 *     Aquí se prueban varios candidatos y se puntúa cada uno, quedándonos
 *     con el mejor en vez de con el primero.
 *
 *  2. No ejecutaba JavaScript. Estas nueve devuelven 200, así que el
 *     problema es de renderizado y no de acceso: con Chromium headed (el
 *     mismo truco que ya desbloqueó Mango y Zalando) la parrilla debería
 *     aparecer.
 *
 *   npx tsx scripts/sondear-navegador.ts
 */

const TIENDAS: [string, string][] = [
  ["uniqlo", "https://www.uniqlo.com/es/es"],
  ["cya", "https://www.c-and-a.com/es/es"],
  ["skechers", "https://www.skechers.es"],
  ["camper", "https://www.camper.com/es_ES"],
  ["elganso", "https://www.elganso.com"],
  ["munich", "https://www.munichsports.com"],
  ["pikolinos", "https://www.pikolinos.com"],
  ["salsajeans", "https://www.salsajeans.com"],
  ["shein", "https://es.shein.com"],
];

/** Enlaces de la portada que apuntan a rebajas, del mismo dominio. */
function candidatos(html: string, base: string): string[] {
  const re = /href="([^"]*(?:rebajas|sale|outlet|descuento|promocion)[^"]*)"/gi;
  const host = new URL(base).host;
  const vistos = new Set<string>();
  for (const m of html.matchAll(re)) {
    let h = m[1];
    if (h.startsWith("//")) h = "https:" + h;
    else if (h.startsWith("/")) h = base.replace(/\/$/, "") + h;
    else if (!h.startsWith("http")) continue;
    try {
      if (new URL(h).host !== host) continue;
    } catch {
      continue;
    }
    // Fuera páginas que nunca son parrillas de producto
    if (/condiciones|terminos|legal|privacidad|cookies|faq|ayuda/i.test(h)) continue;
    vistos.add(h);
    if (vistos.size >= 8) break;
  }
  return [...vistos];
}

interface Analisis {
  jsonLd: number;
  enlacesProducto: number;
  precios: number;
}

function analizar(html: string): Analisis {
  let jsonLd = 0;
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const t = JSON.stringify(JSON.parse(m[1]));
      jsonLd += (t.match(/"@type"\s*:\s*"Product"/g) ?? []).length;
    } catch {
      /* JSON-LD roto */
    }
  }
  const enlacesProducto = new Set(
    [...html.matchAll(/href="([^"]*\/(?:p|producto|product|prod|item)[\/-][^"]*)"/gi)].map(
      (m) => m[1],
    ),
  ).size;
  const precios = (html.match(/\d{1,4}[.,]\d{2}\s*(?:&nbsp;|\s)?€|€\s?\d{1,4}[.,]\d{2}/g) ?? [])
    .length;
  return { jsonLd, enlacesProducto, precios };
}

/** Cuanto más alto, más parece una parrilla de productos de verdad. */
function puntuar(a: Analisis): number {
  return a.jsonLd * 10 + Math.min(a.enlacesProducto, 60) + Math.min(a.precios, 60);
}

async function main() {
  const browser = await launchBrowser();
  try {
    for (const [id, base] of TIENDAS) {
      console.log(`\n########## ${id}`);
      let portada: string;
      try {
        portada = await fetchRenderedHtml(browser, base, { timeoutMs: 40000 });
      } catch (e) {
        console.log(`  portada: error — ${e instanceof Error ? e.message : e}`);
        continue;
      }

      const urls = candidatos(portada, base);
      if (!urls.length) {
        console.log("  sin enlaces de rebajas en la portada ni con navegador");
        continue;
      }
      console.log(`  ${urls.length} candidatos, probando hasta 4`);

      let mejor: { url: string; a: Analisis; p: number } | null = null;
      for (const url of urls.slice(0, 4)) {
        try {
          const html = await fetchRenderedHtml(browser, url, { timeoutMs: 40000 });
          const a = analizar(html);
          const p = puntuar(a);
          console.log(
            `    ${p.toString().padStart(4)}  ${url.slice(0, 76)}` +
              `  [JSON-LD ${a.jsonLd}, enlaces ${a.enlacesProducto}, precios ${a.precios}]`,
          );
          if (!mejor || p > mejor.p) mejor = { url, a, p };
        } catch (e) {
          console.log(`     err  ${url.slice(0, 76)} — ${e instanceof Error ? e.message : e}`);
        }
      }

      if (!mejor || mejor.p < 20) {
        console.log("  => sigue sin verse catálogo ni con navegador");
      } else if (mejor.a.jsonLd >= 3) {
        console.log(`  => VIABLE por JSON-LD (${mejor.a.jsonLd} productos): ${mejor.url}`);
      } else {
        console.log(
          `  => VIABLE por DOM (${mejor.a.enlacesProducto} enlaces, ${mejor.a.precios} precios): ${mejor.url}`,
        );
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
