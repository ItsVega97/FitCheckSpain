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

async function pullAndBearCatalog(browser) {
  console.log("\n================== Pull&Bear: estructura de itxrest/catalog ==================");
  const { context, page } = await newPage(browser);
  try {
    await page.goto("https://www.pullandbear.com/es/rebajas-c1030006000.html", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForTimeout(3000);

    const catalogJson = await page.evaluate(async () => {
      const res = await fetch("https://www.pullandbear.com/itxrest/2/catalog/store/24009400?languageId=-5&appId=1", {
        credentials: "include",
      });
      const text = await res.text();
      return { status: res.status, len: text.length, sample: text.slice(0, 3000) };
    });
    console.log("catalog response:", JSON.stringify(catalogJson, null, 2).slice(0, 4000));

    // Try to find the "rebajas"/sale category id from the catalog tree
    let saleCategoryId = null;
    try {
      const parsed = JSON.parse(catalogJson.sample.length < catalogJson.len ? catalogJson.sample : catalogJson.sample);
    } catch {
      /* sample may be truncated, handled below via full fetch */
    }

    const fullCatalog = await page.evaluate(async () => {
      const res = await fetch("https://www.pullandbear.com/itxrest/2/catalog/store/24009400?languageId=-5&appId=1", {
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (!json) return null;
      // Depth-first search for anything with "rebaja" or "sale" in its name
      const found = [];
      function walk(node, path) {
        if (!node || typeof node !== "object") return;
        if (Array.isArray(node)) {
          node.forEach((n, i) => walk(n, path + `[${i}]`));
          return;
        }
        if (typeof node.name === "string" && /rebaja|sale/i.test(node.name)) {
          found.push({ path, name: node.name, id: node.id, sectionId: node.sectionId, keys: Object.keys(node) });
        }
        for (const k of Object.keys(node)) {
          if (typeof node[k] === "object") walk(node[k], path + "." + k);
        }
      }
      walk(json, "root");
      return { topKeys: Object.keys(json), foundCount: found.length, found: found.slice(0, 15) };
    });
    console.log("\nfullCatalog search for rebajas/sale:", JSON.stringify(fullCatalog, null, 2).slice(0, 4000));
  } catch (e) {
    console.log("ERROR:", e.message);
  } finally {
    await context.close();
  }
}

async function zaraCategoriesApi(browser) {
  console.log("\n================== Zara: estructura de /categories ajax ==================");
  const { context, page } = await newPage(browser);
  const captured = [];
  page.on("response", async (resp) => {
    if (resp.url().includes("/categories?") && resp.url().includes("ajax=true")) {
      try {
        const json = await resp.json();
        captured.push({ url: resp.url(), json });
      } catch {
        /* not JSON or already consumed */
      }
    }
  });
  try {
    await page.goto("https://www.zara.com/es/es/mujer-special-prices-l1309.html", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForTimeout(4000);
    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, 1500);
      await page.waitForTimeout(600);
    }
    await page.waitForTimeout(1500);
    console.log(`Capturadas ${captured.length} respuestas de /categories`);
    for (const c of captured) {
      const str = JSON.stringify(c.json);
      console.log(`\nURL: ${c.url}`);
      console.log(`JSON length: ${str.length}`);
      console.log(`top-level keys: ${Object.keys(c.json)}`);
      console.log(`sample: ${str.slice(0, 2500)}`);
    }
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

await pullAndBearCatalog(browser);
await zaraCategoriesApi(browser);

await browser.close();
