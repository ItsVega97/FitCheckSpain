import { chromium } from "playwright";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

async function probe(browser, name, url, opts = {}) {
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
  console.log(`\n================== ${name} ==================`);
  console.log(`URL: ${url}`);
  try {
    const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    console.log(`HTTP: ${resp ? resp.status() : "?"}`);
    await page.waitForTimeout(opts.waitMs ?? 3000);

    if (opts.scroll) {
      for (let i = 0; i < 6; i++) {
        await page.mouse.wheel(0, 1500);
        await page.waitForTimeout(600);
      }
      await page.waitForTimeout(1500);
    }

    const title = await page.title();
    console.log(`Title: ${title}`);

    const html = await page.content();
    console.log(`HTML size: ${html.length} bytes`);

    const hasJsonLdProduct = /"@type"\s*:\s*"Product"/.test(html);
    const hasNextData = html.includes('id="__NEXT_DATA__"');
    const hasNuxtData = html.includes("__NUXT__") || html.includes("window.__NUXT__");
    const jsonLdBlocks = (html.match(/<script type="application\/ld\+json"/g) || []).length;
    console.log(
      `JSON-LD Product: ${hasJsonLdProduct} | __NEXT_DATA__: ${hasNextData} | __NUXT__: ${hasNuxtData} | ld+json blocks: ${jsonLdBlocks}`,
    );

    const productLinkCount = await page
      .locator(
        opts.linkSelector ||
          "a[href*='/p/'], a[href*='/product'], a[href*='.html'][href*='-p'], a[href*='/prod/']",
      )
      .count()
      .catch(() => 0);
    console.log(`Product-like links found: ${productLinkCount}`);

    if (opts.classSample) {
      const sample = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const out = [];
        let node = el;
        for (let i = 0; i < 4 && node; i++) {
          out.push({ tag: node.tagName, cls: node.className });
          node = node.parentElement;
        }
        return out;
      }, opts.classSample);
      console.log(`Class sample around "${opts.classSample}":`, JSON.stringify(sample));
    }

    if (opts.dumpBodyChars) {
      const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 300));
      console.log(`Body text (first 300 chars): ${JSON.stringify(bodyText)}`);
    }
  } catch (err) {
    console.log(`ERROR: ${err.message}`);
  } finally {
    await context.close();
  }
}

const targets = [
  ["Zara mujer rebajas", "https://www.zara.com/es/es/mujer-special-prices-l1309.html", { scroll: true, waitMs: 3000 }],
  ["Bershka rebajas", "https://www.bershka.com/es/rebajas-c1010276000.html", { scroll: true, waitMs: 3000 }],
  ["Pull&Bear rebajas", "https://www.pullandbear.com/es/rebajas-c1030006000.html", { scroll: true, waitMs: 3000 }],
  ["Stradivarius rebajas", "https://www.stradivarius.com/es/rebajas-c1020021500.html", { scroll: true, waitMs: 3000 }],
  ["Oysho rebajas", "https://www.oysho.com/es/rebajas-c1010193505.html", { scroll: true, waitMs: 3000 }],
  ["Massimo Dutti rebajas", "https://www.massimodutti.com/es/rebajas-mujer-n1855", { scroll: true, waitMs: 3000 }],
  ["Zalando rebajas", "https://www.zalando.es/rebajas/", { scroll: true, waitMs: 3000, classSample: "article, [class*='catalogArticle']" }],
  ["H&M sale", "https://www2.hm.com/es_es/sale/viewall.html", { waitMs: 4000, dumpBodyChars: true }],
  ["Decathlon promociones", "https://www.decathlon.es/browse/~/promociones", { waitMs: 6000, dumpBodyChars: true }],
  ["Adidas ofertas", "https://www.adidas.es/ofertas", { waitMs: 4000, dumpBodyChars: true }],
  ["Levi's rebajas", "https://www.levi.es/es_es/sale/", { waitMs: 3000 }],
  ["Tommy Hilfiger sale", "https://es.tommy.com/sale", { waitMs: 3000 }],
  ["Calvin Klein sale", "https://www.calvinklein.es/es/sale", { waitMs: 3000 }],
  ["Springfield rebajas", "https://www.springfield.com/es/rebajas", { waitMs: 3000 }],
  ["Desigual rebajas", "https://www.desigual.com/es_ES/rebajas/", { waitMs: 3000 }],
  ["Guess sale", "https://www.guess.eu/es-es/sale", { waitMs: 3000 }],
  ["Pepe Jeans sale", "https://www.pepejeans.com/es/sale/", { waitMs: 3000 }],
  ["Camper sale", "https://www.camper.com/es_ES/sale", { waitMs: 3000 }],
  ["The North Face sale", "https://www.thenorthface.es/shop/sale", { waitMs: 3000 }],
  ["Converse sale", "https://www.converse.com/es/sale", { waitMs: 3000 }],
  ["Vans sale", "https://www.vans.es/sale.html", { waitMs: 3000 }],
  ["New Balance sale", "https://www.newbalance.es/sale/", { waitMs: 3000 }],
  ["Under Armour sale", "https://www.underarmour.es/es-es/c/sale/", { waitMs: 3000 }],
  ["Timberland sale", "https://www.timberland.es/es/sale.html", { waitMs: 3000 }],
  ["C&A rebajas", "https://www.c-and-a.com/es/es/shop/rebajas", { waitMs: 3000 }],
  ["Superdry sale", "https://www.superdry.com/es/sale", { waitMs: 3000 }],
  ["Skechers sale", "https://www.skechers.com/es-es/sale/", { waitMs: 3000 }],
];

const browser = await chromium.launch({
  headless: false,
  args: ["--disable-blink-features=AutomationControlled"],
});

for (const [name, url, opts] of targets) {
  await probe(browser, name, url, opts);
}

await browser.close();
