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

async function desigualPrice(browser) {
  console.log("\n================== Desigual: JSON-LD completo + card HTML ==================");
  const { context, page } = await newPage(browser);
  try {
    await page.goto("https://www.desigual.com/es_ES/rebajas/", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);
    const block = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      for (const s of scripts) {
        if (s.textContent.includes('"ItemList"')) return s.textContent;
      }
      return null;
    });
    console.log("Full ItemList JSON-LD length:", block ? block.length : 0);
    console.log(block ? block.slice(0, 6000) : "(no encontrado)");

    const cardHtml = await page.evaluate(() => {
      const el = document.querySelector("[class*='product-tile'], [class*='product-item'], .product");
      return el ? el.outerHTML.slice(0, 2500) : null;
    });
    console.log("\n--- card html sample ---");
    console.log(cardHtml);
  } catch (e) {
    console.log("ERROR:", e.message);
  } finally {
    await context.close();
  }
}

async function zalandoPrice(browser) {
  console.log("\n================== Zalando: artículo completo con precio ==================");
  const { context, page } = await newPage(browser);
  try {
    await page.goto("https://www.zalando.es/rebajas/", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);
    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, 1500);
      await page.waitForTimeout(500);
    }
    const sample = await page.evaluate(() => {
      const art = document.querySelectorAll("article")[3];
      return art ? art.outerHTML : null;
    });
    console.log(sample);
  } catch (e) {
    console.log("ERROR:", e.message);
  } finally {
    await context.close();
  }
}

async function bershkaDom(browser) {
  console.log("\n================== Bershka: DOM tras scroll ==================");
  const { context, page } = await newPage(browser);
  try {
    await page.goto("https://www.bershka.com/es/rebajas-c1010276000.html", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(4000);
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, 1500);
      await page.waitForTimeout(700);
    }
    await page.waitForTimeout(2000);
    const info = await page.evaluate(() => {
      const candidates = [
        "[class*='product-grid-product']",
        "[class*='product-item']",
        "[class*='product-card']",
        "[class*='productCard']",
        "li[class*='product']",
        "a[href*='.html'][class*='product']",
      ];
      const results = {};
      for (const sel of candidates) {
        results[sel] = document.querySelectorAll(sel).length;
      }
      return results;
    });
    console.log("selector counts:", JSON.stringify(info, null, 2));
    const anyCard = await page.evaluate(() => {
      for (const sel of ["[class*='product-grid-product']", "[class*='product-item']", "[class*='product-card']", "li[class*='product']"]) {
        const el = document.querySelector(sel);
        if (el) return { sel, html: el.outerHTML.slice(0, 2000) };
      }
      return null;
    });
    console.log("sample card:", JSON.stringify(anyCard, null, 2));
  } catch (e) {
    console.log("ERROR:", e.message);
  } finally {
    await context.close();
  }
}

async function tommyDeep(browser) {
  console.log("\n================== Tommy Hilfiger: buscar productos en __NEXT_DATA__ ==================");
  const { context, page } = await newPage(browser);
  try {
    await page.goto("https://es.tommy.com/sale", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);
    const info = await page.evaluate(() => {
      const el = document.getElementById("__NEXT_DATA__");
      if (!el) return null;
      const txt = el.textContent;
      const idx = txt.indexOf('"products"');
      const idx2 = txt.indexOf('"items"');
      const idx3 = txt.indexOf('"sku"');
      return {
        len: txt.length,
        productsIdx: idx,
        itemsIdx: idx2,
        skuIdx: idx3,
        aroundProducts: idx >= 0 ? txt.slice(idx, idx + 1500) : null,
        aroundSku: idx3 >= 0 ? txt.slice(Math.max(0, idx3 - 500), idx3 + 1000) : null,
      };
    });
    console.log(JSON.stringify(info, null, 2).slice(0, 6000));

    // Also check DOM directly for product cards
    const domInfo = await page.evaluate(() => {
      const candidates = ["[class*='ProductCard']", "[class*='product-card']", "[data-testid*='product']", "a[href*='/p/']"];
      const results = {};
      for (const sel of candidates) results[sel] = document.querySelectorAll(sel).length;
      return results;
    });
    console.log("DOM selector counts:", JSON.stringify(domInfo, null, 2));
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

await desigualPrice(browser);
await zalandoPrice(browser);
await bershkaDom(browser);
await tommyDeep(browser);

await browser.close();
