import { chromium } from "playwright";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

const browser = await chromium.launch({
  headless: false,
  args: ["--disable-blink-features=AutomationControlled"],
});
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

console.log("\n================== Pull&Bear: árbol de categorías ==================");
await page.goto("https://www.pullandbear.com/es/rebajas-c1030006000.html", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(2000);

// The sale URL itself has a category id in it: c1030006000 -> likely 1030006000
const guessedSaleCategoryId = "1030006000";

const categoryTree = await page.evaluate(async () => {
  const res = await fetch("https://www.pullandbear.com/itxrest/2/catalog/store/24009400/category?languageId=-5&appId=1", {
    credentials: "include",
  });
  const status = res.status;
  const text = await res.text();
  return { status, len: text.length, sample: text.slice(0, 1500) };
});
console.log("category tree (sin id):", JSON.stringify(categoryTree, null, 2).slice(0, 2000));

for (const catId of [guessedSaleCategoryId, "1030017536", "1030017537"]) {
  const productResp = await page.evaluate(async (id) => {
    const url = `https://www.pullandbear.com/itxrest/2/catalog/store/24009400/category/${id}/product?languageId=-5&appId=1`;
    const res = await fetch(url, { credentials: "include" });
    const status = res.status;
    const text = await res.text();
    return { url, status, len: text.length, sample: text.slice(0, 2000) };
  }, catId);
  console.log(`\nproducts for category ${catId}:`, JSON.stringify(productResp, null, 2).slice(0, 2500));
}

console.log("\n================== Pull&Bear: todas las llamadas itxrest tras click real en menú ==================");
const page2 = await context.newPage();
const itxCalls = [];
page2.on("response", async (resp) => {
  if (resp.url().includes("itxrest") || resp.url().includes("/api/")) {
    itxCalls.push(resp.url());
  }
});
await page2.goto("https://www.pullandbear.com/es/", { waitUntil: "domcontentloaded", timeout: 30000 });
await page2.waitForTimeout(2500);
try {
  const saleLink = page2.locator("a[href*='rebajas'], a:has-text('Rebajas'), a:has-text('SALE')").first();
  await saleLink.click({ timeout: 5000 });
  await page2.waitForTimeout(4000);
  for (let i = 0; i < 4; i++) {
    await page2.mouse.wheel(0, 1500);
    await page2.waitForTimeout(600);
  }
} catch (e) {
  console.log("No se pudo hacer click en el enlace de rebajas:", e.message);
}
console.log("Llamadas itxrest/api capturadas tras navegación real:");
for (const u of itxCalls) console.log(" ", u);

await browser.close();
