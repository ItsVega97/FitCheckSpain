import { chromium, type Browser } from "playwright";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

/**
 * Algunas tiendas (Mango, Womensecret...) no bloquean el scraping a nivel de
 * red, pero pintan el listado de productos con JavaScript en el cliente, así
 * que un `fetch` normal nunca ve el HTML real. Para esas hace falta un
 * navegador de verdad que ejecute el JS antes de leer la página.
 *
 * Además, algunas tiendas con Akamai Bot Manager (Mango, Zalando) bloquean
 * con 403 el modo headless de Chromium aunque sea el "new headless"
 * moderno, pero dejan pasar la petición si el navegador corre en modo
 * headed de verdad (con display, aunque sea uno virtual vía Xvfb). Por eso
 * lanzamos siempre en modo headed — en GitHub Actions el workflow arranca
 * Xvfb antes de ejecutar el scraper (ver .github/workflows/scrape.yml).
 *
 * PLAYWRIGHT_CHROMIUM_PATH permite apuntar a un Chromium ya instalado en el
 * entorno (usado en desarrollo local); en GitHub Actions se usa el Chromium
 * que instala `npx playwright install chromium` en el propio workflow.
 */
export async function launchBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: false,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
    args: ["--disable-blink-features=AutomationControlled"],
  });
}

export async function fetchRenderedHtml(
  browser: Browser,
  url: string,
  opts?: { waitForSelector?: string; timeoutMs?: number },
): Promise<string> {
  const timeoutMs = opts?.timeoutMs ?? 30000;
  const context = await browser.newContext({
    userAgent: UA,
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
    viewport: { width: 1366, height: 768 },
    extraHTTPHeaders: { "Accept-Language": "es-ES,es;q=0.9,en;q=0.8" },
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    await page.waitForTimeout(2000);
    if (opts?.waitForSelector) {
      // Si el selector nunca aparece (p.ej. la tienda cambió el markup),
      // seguimos igualmente: el extractor simplemente encontrará 0
      // tarjetas y el aviso de "selector desactualizado" avisará en logs.
      await page.waitForSelector(opts.waitForSelector, { timeout: timeoutMs }).catch(() => {});
    }
    return await page.content();
  } finally {
    await context.close();
  }
}
