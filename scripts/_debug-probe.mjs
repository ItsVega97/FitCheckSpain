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
await page.goto("https://www.desigual.com/es_ES/rebajas/", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(3000);

console.log("\n================== Desigual: card completa (con precio) ==================");
const full = await page.evaluate(() => {
  const el = document.querySelector(".product-tile, [data-pid]");
  return el ? el.outerHTML : null;
});
console.log("length:", full ? full.length : 0);
console.log(full);

console.log("\n================== Desigual: solo el bloque de precio ==================");
const priceBlock = await page.evaluate(() => {
  const card = document.querySelector(".product-tile, [data-pid]");
  if (!card) return null;
  const priceEl = card.querySelector("[class*='rice']");
  return priceEl ? priceEl.outerHTML : "(no encontrado con [class*=rice])";
});
console.log(priceBlock);

await context.close();
await browser.close();
