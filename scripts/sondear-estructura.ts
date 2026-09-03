import { launchBrowser, fetchRenderedHtml } from "./scrapers/engine-headless";

/**
 * Tercera vuelta: cómo están montadas por dentro las tres que sobrevivieron.
 *
 * Saber que una página "tiene 136 precios" no basta para escribir un
 * scraper; hace falta ver de dónde salen. Esto busca, por orden de lo que
 * daría un scraper más robusto a lo más frágil:
 *
 *   1. Una API propia. Uniqlo tiene una documentada de sobra
 *      (/api/commerce/v5/es/products), y si responde nos ahorramos el
 *      navegador entero.
 *   2. JSON embebido en la página (__NEXT_DATA__, __NUXT__, dataLayer).
 *   3. La estructura del DOM alrededor de los precios, que es el último
 *      recurso y el que se rompe en cuanto la tienda toca el maquetado.
 *
 *   npx tsx scripts/sondear-estructura.ts
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

/** APIs propias que merece la pena probar antes de tocar el DOM. */
const APIS: [string, string][] = [
  [
    "uniqlo",
    "https://www.uniqlo.com/es/api/commerce/v5/es/products?path=%2C%2C&flagCodes=discount&limit=36&offset=0&httpFailure=true",
  ],
  ["uniqlo alt", "https://www.uniqlo.com/es/api/commerce/v5/es/products?limit=36&offset=0"],
  [
    "pikolinos",
    "https://www.pikolinos.com/us-es/filtrocatalogo/search/query?cgid=WOM_SALE&format=ajax",
  ],
];

const PAGINAS: [string, string][] = [
  ["uniqlo", "https://www.uniqlo.com/es/es/feature/sale/women"],
  ["skechers", "https://www.skechers.es/outlet/"],
  ["pikolinos", "https://www.pikolinos.com/us-es/filtrocatalogo/search/query?cgid=WOM_SALE"],
];

async function probarApis() {
  console.log("########## 1. ¿Hay API propia?\n");
  for (const [id, url] of APIS) {
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/json", "Accept-Language": "es-ES,es;q=0.9" },
        signal: AbortSignal.timeout(25000),
      });
      const cuerpo = await r.text();
      let pista = "no es JSON";
      try {
        const d = JSON.parse(cuerpo);
        const texto = JSON.stringify(d);
        const precios = (texto.match(/"price"|"priceValue"|"salePrice"|"base"/g) ?? []).length;
        pista = `JSON, ${Math.round(texto.length / 1024)} KB, ${precios} marcas de precio`;
      } catch {
        pista = `${cuerpo.length} bytes de HTML/texto`;
      }
      console.log(`  ${id.padEnd(12)} HTTP ${r.status}  ${pista}`);
    } catch (e) {
      console.log(`  ${id.padEnd(12)} error: ${e instanceof Error ? e.message : e}`);
    }
  }
}

/** Alrededor de cada precio, qué etiqueta y qué clase lo envuelve. */
function contextoPrecios(html: string): string[] {
  const out: string[] = [];
  const re = /(\d{1,4}[.,]\d{2})\s*(?:&nbsp;|\s)?€/g;
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = re.exec(html)) && n < 4) {
    const desde = Math.max(0, m.index - 320);
    const trozo = html
      .slice(desde, m.index + 40)
      .replace(/\s+/g, " ")
      .replace(/></g, ">\n  <");
    out.push(trozo.slice(-300));
    n++;
    re.lastIndex = m.index + 400; // saltar al siguiente bloque, no al siguiente carácter
  }
  return out;
}

async function main() {
  await probarApis();

  console.log("\n\n########## 2. JSON embebido y estructura del DOM\n");
  const browser = await launchBrowser();
  try {
    for (const [id, url] of PAGINAS) {
      console.log(`\n===== ${id}  ${url}`);
      let html: string;
      try {
        html = await fetchRenderedHtml(browser, url, { timeoutMs: 45000 });
      } catch (e) {
        console.log(`  error: ${e instanceof Error ? e.message : e}`);
        continue;
      }
      console.log(`  ${Math.round(html.length / 1024)} KB renderizados`);

      for (const clave of ["__NEXT_DATA__", "window.__NUXT__", "dataLayer", "__PRELOADED_STATE__"]) {
        if (html.includes(clave)) console.log(`  contiene ${clave}`);
      }
      const ld = (html.match(/application\/ld\+json/g) ?? []).length;
      if (ld) console.log(`  ${ld} bloques JSON-LD`);

      const ctx = contextoPrecios(html);
      if (!ctx.length) {
        console.log("  sin precios en el HTML renderizado");
      } else {
        console.log(`  contexto de ${ctx.length} precios:`);
        ctx.forEach((c, i) => console.log(`\n  --- precio ${i + 1} ---\n  ${c}`));
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
