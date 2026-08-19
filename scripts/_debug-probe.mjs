/**
 * Sondeo masivo de tiendas españolas. Dos estrategias:
 *
 * A) Shopify: muchas marcas DTC españolas usan Shopify, que expone
 *    /products.json y /collections/<x>/products.json sin anti-bot. Si
 *    responde, es la via mas fiable y barata que existe.
 *
 * B) Resto: cargar la PORTADA con navegador headed y buscar en ella el
 *    enlace real de rebajas (el fallo recurrente de rondas anteriores fue
 *    adivinar URLs y comerse 404s), luego visitar ese enlace y medir que
 *    datos estructurados hay.
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

// --- A) Candidatas Shopify (marcas españolas populares) ---
const SHOPIFY = [
  ["Hoff", "https://hoffshoes.com"],
  ["Pompeii", "https://pompeiibrand.com"],
  ["Blue Banana", "https://www.bluebananabrand.com"],
  ["Muroexe", "https://muroexe.com"],
  ["Laagam", "https://laagam.com"],
  ["Slowlove", "https://slowlove.es"],
  ["Scalpers", "https://scalperscompany.com"],
  ["Silbon", "https://silbonshop.com"],
  ["El Ganso", "https://www.elganso.com"],
  ["Bimani", "https://bimani.es"],
  ["Coosy", "https://coosy.es"],
  ["Poete", "https://poete.es"],
  ["Mustang", "https://mustang.es"],
  ["Gioseppo", "https://gioseppo.com"],
  ["Wonders", "https://wonders.com"],
  ["Popa", "https://popabrand.com"],
  ["Vogue Shoes", "https://vogueshoes.es"],
  ["Nude Project", "https://nudeproject.co"],
];

// --- B) Cadenas grandes: portada -> encontrar enlace de rebajas ---
const CRAWL = [
  ["El Corte Ingles", "https://www.elcorteingles.es"],
  ["Sfera", "https://www.sfera.com"],
  ["Cortefiel", "https://www.cortefiel.com"],
  ["Springfield", "https://www.springfield.com"],
  ["Parfois", "https://www.parfois.com"],
  ["Bimba y Lola", "https://www.bimbaylola.com"],
  ["Lefties", "https://www.lefties.com"],
  ["Kiabi", "https://www.kiabi.es"],
  ["Sprinter", "https://www.sprinter.es"],
  ["Decimas", "https://www.decimas.com"],
  ["JD Sports", "https://www.jdsports.es"],
  ["Foot Locker", "https://www.footlocker.es"],
  ["Forum Sport", "https://www.forumsport.com"],
  ["Tradeinn", "https://www.tradeinn.com"],
  ["Base", "https://www.base.net"],
  ["Snipes", "https://www.snipes.es"],
  ["Pikolinos", "https://www.pikolinos.com"],
  ["Martinelli", "https://www.martinelli.es"],
  ["Hispanitas", "https://www.hispanitas.com"],
  ["Salsa Jeans", "https://www.salsajeans.com"],
];

const SALE_RE = /rebaja|sale|outlet|descuento|promocion|ofertas|last-?chance|special-?price/i;

async function probeShopify(name, base) {
  // /products.json devuelve el catalogo paginado; probamos tambien una
  // coleccion de rebajas tipica.
  const urls = [
    `${base}/products.json?limit=250`,
    `${base}/collections/rebajas/products.json?limit=250`,
    `${base}/collections/sale/products.json?limit=250`,
    `${base}/collections/outlet/products.json?limit=250`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, "Accept-Language": "es-ES,es;q=0.9" },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("json")) continue;
      const data = await res.json();
      const products = data.products || [];
      if (!products.length) continue;
      // ¿Hay descuento? Shopify da compare_at_price en las variantes.
      let conDescuento = 0;
      for (const p of products) {
        const v = (p.variants || [])[0];
        if (v && v.compare_at_price && Number(v.compare_at_price) > Number(v.price)) conDescuento++;
      }
      const ej = products[0];
      const v0 = (ej.variants || [])[0] || {};
      console.log(
        `[SHOPIFY OK] ${name}: ${products.length} productos en ${url.replace(base, "")} | con descuento: ${conDescuento}`,
      );
      console.log(
        `             ejemplo: "${ej.title}" precio=${v0.price} antes=${v0.compare_at_price ?? "-"} img=${ej.images?.[0]?.src ? "si" : "no"}`,
      );
      return true;
    } catch {
      /* siguiente url */
    }
  }
  console.log(`[shopify no] ${name}`);
  return false;
}

async function probeCrawl(browser, name, home) {
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
    const r1 = await page.goto(home, { waitUntil: "domcontentloaded", timeout: 25000 });
    const st1 = r1 ? r1.status() : "?";
    if (String(st1).startsWith("4") || String(st1).startsWith("5")) {
      console.log(`[${name}] portada HTTP ${st1} -> bloqueada`);
      return;
    }
    await page.waitForTimeout(2500);

    // Buscar el enlace real de rebajas en la portada
    const saleLinks = await page.evaluate((reSrc) => {
      const re = new RegExp(reSrc, "i");
      const out = [];
      for (const a of document.querySelectorAll("a[href]")) {
        const href = a.getAttribute("href") || "";
        const text = (a.textContent || "").trim().slice(0, 40);
        if (re.test(href) || re.test(text)) out.push({ href, text });
        if (out.length > 40) break;
      }
      return out;
    }, SALE_RE.source);

    if (!saleLinks.length) {
      console.log(`[${name}] portada OK (${st1}) pero sin enlace de rebajas detectado`);
      return;
    }

    const target = new URL(saleLinks[0].href, home).toString();
    const r2 = await page.goto(target, { waitUntil: "domcontentloaded", timeout: 25000 });
    const st2 = r2 ? r2.status() : "?";
    await page.waitForTimeout(3000);
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, 1500);
      await page.waitForTimeout(500);
    }

    const html = await page.content();
    const jsonLdProduct = (html.match(/"@type"\s*:\s*"Product"/g) || []).length;
    const itemList = html.includes('"ItemList"');
    const nextData = html.includes('id="__NEXT_DATA__"');
    const microdata = (html.match(/itemtype="https?:\/\/schema\.org\/Product"/g) || []).length;
    const shopifyHint = html.includes("cdn.shopify.com") || html.includes("Shopify.theme");
    const priceNodes = await page
      .locator("[class*='price'], [class*='Price'], [data-testid*='price']")
      .count()
      .catch(() => 0);

    const veredicto =
      jsonLdProduct > 1 || microdata > 1 || itemList
        ? "*** PROMETEDORA (datos estructurados) ***"
        : shopifyHint
          ? "*** SHOPIFY (probar /products.json) ***"
          : priceNodes > 10
            ? "posible (precios en DOM)"
            : "sin datos claros";

    console.log(
      `[${name}] rebajas=${target.replace(home, "")} HTTP ${st2} | ld+Product:${jsonLdProduct} ItemList:${itemList} microdata:${microdata} __NEXT_DATA__:${nextData} nodos-precio:${priceNodes} -> ${veredicto}`,
    );
  } catch (e) {
    console.log(`[${name}] ERROR ${e.message.slice(0, 90)}`);
  } finally {
    await context.close();
  }
}

// El bloque Shopify NO necesita navegador, asi que se ejecuta aparte para
// que sus resultados lleguen aunque la instalacion de Chromium falle.
const modo = process.argv[2] || "todo";

if (modo === "shopify" || modo === "todo") {
  console.log("=================== A) SHOPIFY (fetch simple) ===================");
  for (const [name, base] of SHOPIFY) {
    await probeShopify(name, base);
  }
}

if (modo === "cadenas" || modo === "todo") {
  console.log("\n=================== B) CADENAS (portada -> rebajas) ===================");
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  for (const [name, home] of CRAWL) {
    await probeCrawl(browser, name, home);
  }
  await browser.close();
}
