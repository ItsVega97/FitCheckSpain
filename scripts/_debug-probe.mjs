import { chromium } from "playwright";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

async function newPage(browser) {
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
  return { context, page: await context.newPage() };
}

async function sniffNetwork(browser, name, url) {
  console.log(`\n================== ${name}: sniff de red ==================`);
  const { context, page } = await newPage(browser);
  const candidates = [];
  page.on("response", async (resp) => {
    const ct = resp.headers()["content-type"] || "";
    const u = resp.url();
    if (ct.includes("json") && !u.includes("google") && !u.includes("analytics") && !u.includes("doubleclick")) {
      candidates.push({ url: u, status: resp.status(), contentType: ct });
    }
  });
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, 1600);
      await page.waitForTimeout(700);
    }
    await page.waitForTimeout(2000);
    console.log(`JSON responses capturadas: ${candidates.length}`);
    for (const c of candidates.slice(0, 25)) {
      console.log(`  [${c.status}] ${c.url}`);
    }
    // Try to find the most promising one (contains "product" or is large)
    const promising = candidates.filter((c) => /product|article|catalog|search|grid|listing/i.test(c.url));
    console.log("\nCandidatas prometedoras (url contiene product/article/catalog/search/grid/listing):");
    for (const c of promising) console.log(`  [${c.status}] ${c.url}`);

    const domInfo = await page.evaluate(() => {
      const has = (k) => typeof window[k] !== "undefined";
      return {
        hasNuxt: has("__NUXT__"),
        hasNextData: !!document.getElementById("__NEXT_DATA__"),
        title: document.title,
      };
    });
    console.log("DOM info:", JSON.stringify(domInfo));
  } catch (e) {
    console.log("ERROR:", e.message);
  } finally {
    await context.close();
  }
  return candidates;
}

async function warmupNavigate(browser, name, homeUrl, targetUrl, saleLinkTextPattern) {
  console.log(`\n================== ${name}: calentamiento de sesión ==================`);
  const { context, page } = await newPage(browser);
  try {
    console.log(`1) Visitando portada: ${homeUrl}`);
    const resp1 = await page.goto(homeUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    console.log(`   HTTP: ${resp1 ? resp1.status() : "?"} | Title: ${await page.title()}`);
    await page.waitForTimeout(2500);

    // Try to accept cookie consent (common patterns)
    const consentSelectors = [
      "button:has-text('Aceptar')",
      "button:has-text('ACEPTAR')",
      "#onetrust-accept-btn-handler",
      "button[id*='accept']",
      "button[class*='accept']",
    ];
    for (const sel of consentSelectors) {
      try {
        const btn = page.locator(sel).first();
        if (await btn.isVisible({ timeout: 1500 })) {
          await btn.click({ timeout: 2000 });
          console.log(`   Cookie consent aceptado con selector: ${sel}`);
          await page.waitForTimeout(1000);
          break;
        }
      } catch {
        /* selector not found, try next */
      }
    }

    await page.mouse.move(300, 300);
    await page.mouse.move(500, 400);
    await page.waitForTimeout(1500);

    console.log(`2) Navegando a la página de rebajas: ${targetUrl}`);
    const resp2 = await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    console.log(`   HTTP: ${resp2 ? resp2.status() : "?"} | Title: ${await page.title()}`);
    await page.waitForTimeout(3000);
    const html = await page.content();
    console.log(`   HTML size: ${html.length}`);
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 200));
    console.log(`   Body text: ${JSON.stringify(bodyText)}`);
  } catch (e) {
    console.log("ERROR:", e.message);
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({
  headless: false,
  args: ["--disable-blink-features=AutomationControlled"],
});

await sniffNetwork(browser, "Zara", "https://www.zara.com/es/es/mujer-special-prices-l1309.html");
await sniffNetwork(browser, "Pull&Bear", "https://www.pullandbear.com/es/rebajas-c1030006000.html");
await warmupNavigate(browser, "H&M", "https://www2.hm.com/es_es/index.html", "https://www2.hm.com/es_es/sale/viewall.html");
await warmupNavigate(browser, "Adidas", "https://www.adidas.es/", "https://www.adidas.es/ofertas");

await browser.close();
