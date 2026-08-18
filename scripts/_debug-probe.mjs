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

async function inspectDesigual(browser) {
  console.log("\n================== Desigual: contenido JSON-LD ==================");
  const { context, page } = await newPage(browser);
  try {
    await page.goto("https://www.desigual.com/es_ES/rebajas/", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);
    const blocks = await page.evaluate(() =>
      Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((s) => s.textContent.slice(0, 2000)),
    );
    blocks.forEach((b, i) => console.log(`--- block ${i} ---\n${b}`));
    const cardCount = await page.locator("[class*='product-tile'], [class*='product-item'], .product").count();
    console.log("card-like elements:", cardCount);
  } catch (e) {
    console.log("ERROR:", e.message);
  } finally {
    await context.close();
  }
}

async function inspectBershkaNuxt(browser) {
  console.log("\n================== Bershka: __NUXT__ ==================");
  const { context, page } = await newPage(browser);
  try {
    await page.goto("https://www.bershka.com/es/rebajas-c1010276000.html", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);
    const info = await page.evaluate(() => {
      const n = window.__NUXT__;
      if (!n) return null;
      const keys = Object.keys(n);
      let str;
      try {
        str = JSON.stringify(n);
      } catch {
        str = "(no serializable)";
      }
      return { keys, len: str.length, sample: str.slice(0, 3000) };
    });
    console.log(JSON.stringify(info, null, 2).slice(0, 4000));
  } catch (e) {
    console.log("ERROR:", e.message);
  } finally {
    await context.close();
  }
}

async function inspectTommyNextData(browser) {
  console.log("\n================== Tommy Hilfiger: __NEXT_DATA__ ==================");
  const { context, page } = await newPage(browser);
  try {
    await page.goto("https://es.tommy.com/sale", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);
    const info = await page.evaluate(() => {
      const el = document.getElementById("__NEXT_DATA__");
      if (!el) return null;
      const txt = el.textContent;
      return { len: txt.length, sample: txt.slice(0, 3000) };
    });
    console.log(JSON.stringify(info, null, 2).slice(0, 4000));
  } catch (e) {
    console.log("ERROR:", e.message);
  } finally {
    await context.close();
  }
}

async function inspectZalando(browser) {
  console.log("\n================== Zalando: HTML de un artículo ==================");
  const { context, page } = await newPage(browser);
  try {
    await page.goto("https://www.zalando.es/rebajas/", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);
    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, 1500);
      await page.waitForTimeout(500);
    }
    const sample = await page.evaluate(() => {
      const art = document.querySelector("article");
      return art ? art.outerHTML.slice(0, 3000) : null;
    });
    console.log(sample);
    const count = await page.locator("article").count();
    console.log("total <article> count:", count);
  } catch (e) {
    console.log("ERROR:", e.message);
  } finally {
    await context.close();
  }
}

async function inspectConverse(browser) {
  console.log("\n================== Converse: enlaces de producto ==================");
  const { context, page } = await newPage(browser);
  try {
    await page.goto("https://www.converse.com/es/sale", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);
    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll("a[href]"))
        .map((a) => a.getAttribute("href"))
        .filter((h) => h && /\/p\/|product/i.test(h))
        .slice(0, 10),
    );
    console.log("sample links:", JSON.stringify(links, null, 2));
    const cardHtml = await page.evaluate(() => {
      const a = Array.from(document.querySelectorAll("a[href]")).find((a) => /\/p\/|product/i.test(a.getAttribute("href") || ""));
      if (!a) return null;
      let node = a;
      for (let i = 0; i < 3 && node.parentElement; i++) node = node.parentElement;
      return node.outerHTML.slice(0, 2500);
    });
    console.log("card html sample:", cardHtml);
  } catch (e) {
    console.log("ERROR:", e.message);
  } finally {
    await context.close();
  }
}

async function retryUrls(browser) {
  const retries = [
    ["Stradivarius rebajas (alt)", "https://www.stradivarius.com/es/mujer/rebajas-c1030299.html"],
    ["Camper sale (alt)", "https://www.camper.com/es_ES/women/sale"],
    ["Calvin Klein sale (alt)", "https://www.calvinklein.es/es/mujer/sale"],
    ["Guess sale (alt)", "https://www.guess.eu/es-es/women/sale"],
    ["Pepe Jeans sale (alt)", "https://www.pepejeans.com/es/mujer/rebajas/"],
    ["Superdry sale (alt)", "https://www.superdry.com/es/rebajas"],
    ["Skechers sale (alt)", "https://www.skechers.com/es-es/rebajas/"],
    ["Levi's sale (alt domain)", "https://www.levi.com/ES/es_ES/sale/c/levi_clothing_sale"],
    ["Springfield rebajas (retry, timeout largo)", "https://www.springfield.com/es/rebajas", 45000],
    ["Under Armour sale (alt)", "https://www.underarmour.es/es-es/c/sale-c1/"],
    ["Massimo Dutti rebajas mujer (alt)", "https://www.massimodutti.com/es/mujer/rebajas-n5017"],
  ];
  for (const [name, url, timeout] of retries) {
    console.log(`\n================== ${name} ==================`);
    console.log(`URL: ${url}`);
    const { context, page } = await newPage(browser);
    try {
      const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeout ?? 30000 });
      console.log(`HTTP: ${resp ? resp.status() : "?"}`);
      await page.waitForTimeout(3000);
      const title = await page.title();
      console.log(`Title: ${title}`);
      const html = await page.content();
      console.log(`HTML size: ${html.length}`);
      const hasJsonLdProduct = /"@type"\s*:\s*"Product"/.test(html);
      const hasNextData = html.includes('id="__NEXT_DATA__"');
      const hasNuxtData = html.includes("__NUXT__");
      console.log(`JSON-LD Product: ${hasJsonLdProduct} | __NEXT_DATA__: ${hasNextData} | __NUXT__: ${hasNuxtData}`);
      const linkCount = await page.locator("a[href*='/p/'], a[href*='product'], a[href*='.html']").count().catch(() => 0);
      console.log(`Product-like links: ${linkCount}`);
    } catch (e) {
      console.log("ERROR:", e.message);
    } finally {
      await context.close();
    }
  }
}

const browser = await chromium.launch({
  headless: false,
  args: ["--disable-blink-features=AutomationControlled"],
});

await inspectDesigual(browser);
await inspectBershkaNuxt(browser);
await inspectTommyNextData(browser);
await inspectZalando(browser);
await inspectConverse(browser);
await retryUrls(browser);

await browser.close();
