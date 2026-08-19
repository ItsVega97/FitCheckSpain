/**
 * A/B: Playwright normal vs Patchright (fork parcheado anti-deteccion),
 * ambos en modo headed bajo Xvfb, mismas opciones de contexto.
 * Objetivo: determinar si el 403 de H&M/Adidas depende del fingerprint
 * de automatizacion (CDP leaks) o de algo ajeno al navegador.
 */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

const TARGETS = [
  ["H&M portada", "https://www2.hm.com/es_es/index.html"],
  ["H&M sale", "https://www2.hm.com/es_es/sale/viewall.html"],
  ["Adidas portada", "https://www.adidas.es/"],
  ["Adidas ofertas", "https://www.adidas.es/ofertas"],
  ["Zara rebajas mujer", "https://www.zara.com/es/es/mujer-special-prices-l1309.html"],
  ["Pull&Bear rebajas", "https://www.pullandbear.com/es/rebajas-c1030006000.html"],
];

async function runWith(label, chromium) {
  console.log(`\n########## ${label} ##########`);
  let browser;
  try {
    browser = await chromium.launch({
      headless: false,
      args: ["--disable-blink-features=AutomationControlled"],
    });
  } catch (e) {
    console.log(`No se pudo lanzar ${label}: ${e.message}`);
    return;
  }

  for (const [name, url] of TARGETS) {
    const context = await browser.newContext({
      userAgent: UA,
      locale: "es-ES",
      timezoneId: "Europe/Madrid",
      viewport: { width: 1366, height: 768 },
      extraHTTPHeaders: { "Accept-Language": "es-ES,es;q=0.9,en;q=0.8" },
    });
    const page = await context.newPage();
    try {
      const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      const status = resp ? resp.status() : "?";
      await page.waitForTimeout(3500);
      const title = await page.title();
      const html = await page.content();
      // Senal de producto real en la pagina
      const productish =
        (html.match(/"@type"\s*:\s*"Product"/g) || []).length +
        (html.match(/productpage|data-testid="plp-product-card"|product-item/g) || []).length;
      console.log(
        `[${label}] ${name}: HTTP ${status} | ${html.length} bytes | title="${title}" | senales de producto: ${productish}`,
      );
      if (String(status).startsWith("4")) {
        const body = await page.evaluate(() => document.body.innerText.slice(0, 160));
        console.log(`         body: ${JSON.stringify(body)}`);
      }
    } catch (e) {
      console.log(`[${label}] ${name}: ERROR ${e.message.slice(0, 120)}`);
    } finally {
      await context.close();
    }
  }
  await browser.close();
}

// Playwright estandar
const { chromium: pwChromium } = await import("playwright");
await runWith("PLAYWRIGHT", pwChromium);

// Patchright (drop-in parcheado)
try {
  const { chromium: patchChromium } = await import("patchright");
  await runWith("PATCHRIGHT", patchChromium);
} catch (e) {
  console.log("\nNo se pudo cargar patchright:", e.message);
}
