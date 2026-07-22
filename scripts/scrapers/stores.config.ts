import type { StoreConfig } from "./types";

/**
 * Configuración de tiendas para el scraper.
 *
 * Estado verificado ejecutando el scraper de verdad en GitHub Actions
 * (con acceso a internet real) el 22/07/2026:
 *
 * - ASOS: única tienda con scraping automático fiable. No tiene protección
 *   anti-bot para peticiones simples y expone un JSON completo de producto
 *   embebido en la página de listado (ver scripts/scrapers/asos.ts).
 * - H&M, Decathlon, Zalando: bloquean con un 403 (Akamai / Cloudflare)
 *   incluso la portada, no solo la página de rebajas. No es un problema de
 *   URL ni de selectores: hace falta un navegador real (headless) para
 *   sortear el challenge, lo cual queda fuera del alcance de un scraper
 *   gratuito por fetch simple.
 * - Mango: la portada carga bien, pero las rutas de rebajas devuelven la
 *   página de error de Next.js (__next_error__) incluso con la URL
 *   corregida; el listado se pinta por JavaScript en el cliente, así que un
 *   fetch simple nunca vería productos aunque la URL fuera exacta.
 * - Zara, Bershka, Pull&Bear (Inditex), Nike, Adidas, Privalia: no
 *   verificadas de nuevo aquí, pero por el mismo motivo (protección
 *   anti-bot fuerte conocida, o catálogo tras login en el caso de
 *   Privalia) se mantienen desactivadas.
 *
 * Para todas las desactivadas usa `npm run add-deal -- <url>` — añadir a
 * mano una oferta puntual sí funciona bien, ya que es una sola petición
 * ocasional, no un rastreo repetido.
 */
export const STORE_CONFIGS: StoreConfig[] = [
  {
    id: "asos",
    name: "ASOS",
    enabled: true,
    // Las URLs de listado están hardcodeadas en scripts/scrapers/asos.ts;
    // este campo no se usa (ASOS tiene un scraper especializado), se deja
    // solo a título informativo.
    listingUrls: ["https://www.asos.com/es/mujer/rebajas/cat/?cid=7046"],
    selectors: {
      card: "",
      link: "",
      title: "",
      image: "",
      price: "",
    },
    notes: "Scraper especializado (JSON embebido), ver scripts/scrapers/asos.ts. Confirmado funcionando.",
  },
  {
    id: "hm",
    name: "H&M",
    enabled: false,
    listingUrls: ["https://www2.hm.com/es_es/sale/viewall.html"],
    selectors: {
      card: "[class*='product-item'], li.product-item, article[class*='product']",
      link: "a[href*='/es_es/productpage']",
      title: "[class*='product-item-headline'], [class*='item-heading'], h3",
      image: "img",
      price: "[class*='price-value'], [class*='price'] span",
      originalPrice: "[class*='regular-price'], del, s",
    },
    maxProducts: 24,
    notes: "Desactivado: confirmado que Akamai bloquea con 403 incluso la portada (no es un problema de selectores). Usa 'npm run add-deal'.",
  },
  {
    id: "mango",
    name: "Mango",
    enabled: false,
    listingUrls: ["https://shop.mango.com/es/es/mujer/rebajas"],
    selectors: {
      card: "[class*='product-tile'], article[class*='product']",
      link: "a[href*='/es/mujer'], a[href*='/es/hombre']",
      title: "[class*='product-name'], h3, h2",
      image: "img",
      price: "[class*='price']:not([class*='old'])",
      originalPrice: "[class*='old-price'], del, s",
    },
    maxProducts: 24,
    notes: "Desactivado: la app es Next.js con listado renderizado por JavaScript en el cliente; un fetch simple no ve productos aunque la URL sea correcta. Usa 'npm run add-deal'.",
  },
  {
    id: "decathlon",
    name: "Decathlon",
    enabled: false,
    listingUrls: ["https://www.decathlon.es/browse/~/promociones"],
    selectors: {
      card: "[data-testid*='product'], article[class*='product']",
      link: "a[href*='/p/']",
      title: "[class*='product-name'], h3",
      image: "img",
      price: "[class*='price']:not([class*='strike']):not([class*='old'])",
      originalPrice: "[class*='strike'], del, s",
    },
    maxProducts: 24,
    notes: "Desactivado: confirmado que Cloudflare devuelve el challenge 'Just a moment...' incluso en la portada. Usa 'npm run add-deal'.",
  },
  {
    id: "zalando",
    name: "Zalando",
    enabled: false,
    listingUrls: ["https://www.zalando.es/outlet/"],
    selectors: {
      card: "article, [class*='catalogArticle'], [class*='articleCard']",
      link: "a[href]",
      title: "h3, [class*='name']",
      image: "img",
      price: "[class*='price']:not([class*='strike']):not([class*='original'])",
      originalPrice: "[class*='strike'], [class*='original-price'], del, s",
    },
    maxProducts: 24,
    notes: "Desactivado: confirmado bloqueo Akamai (403) incluso en la portada. Usa 'npm run add-deal'.",
  },
  {
    id: "zara",
    name: "Zara",
    enabled: false,
    listingUrls: ["https://www.zara.com/es/es/mujer-special-prices-l1309.html"],
    selectors: {
      card: "li[class*='product'], article",
      link: "a[href*='/es/es/']",
      title: "[class*='name'], h3",
      image: "img",
      price: "[class*='price']:not([class*='old'])",
      originalPrice: "[class*='old-price'], del, s",
    },
    maxProducts: 24,
    notes: "Desactivado por defecto: Zara (Inditex) usa protección anti-bot fuerte y renderizado por JavaScript. Usa 'npm run add-deal' para estas ofertas.",
  },
  {
    id: "bershka",
    name: "Bershka",
    enabled: false,
    listingUrls: ["https://www.bershka.com/es/rebajas-c1010276000.html"],
    selectors: {
      card: "li[class*='product'], article",
      link: "a[href*='/es/']",
      title: "[class*='name'], h3",
      image: "img",
      price: "[class*='price']:not([class*='old'])",
      originalPrice: "[class*='old-price'], del, s",
    },
    maxProducts: 24,
    notes: "Desactivado por defecto: mismo grupo Inditex que Zara, misma protección anti-bot esperada.",
  },
  {
    id: "pullbear",
    name: "Pull&Bear",
    enabled: false,
    listingUrls: ["https://www.pullandbear.com/es/rebajas-c1030006000.html"],
    selectors: {
      card: "li[class*='product'], article",
      link: "a[href*='/es/']",
      title: "[class*='name'], h3",
      image: "img",
      price: "[class*='price']:not([class*='old'])",
      originalPrice: "[class*='old-price'], del, s",
    },
    maxProducts: 24,
    notes: "Desactivado por defecto: mismo grupo Inditex que Zara, misma protección anti-bot esperada.",
  },
  {
    id: "nike",
    name: "Nike",
    enabled: false,
    listingUrls: ["https://www.nike.com/es/w/ofertas-3yaep"],
    selectors: {
      card: "[data-testid='product-card']",
      link: "a[href*='/t/']",
      title: "[data-testid='product-card__title']",
      image: "img",
      price: "[data-testid='product-price']",
      originalPrice: "[data-testid='product-price__original']",
    },
    maxProducts: 24,
    notes: "Desactivado por defecto: Nike usa Akamai Bot Manager, un fetch simple normalmente es bloqueado. Usa 'npm run add-deal' para estas ofertas.",
  },
  {
    id: "adidas",
    name: "Adidas",
    enabled: false,
    listingUrls: ["https://www.adidas.es/ofertas"],
    selectors: {
      card: "[data-testid='plp-product-card']",
      link: "a[href*='.html']",
      title: "[data-testid='product-card-description-title']",
      image: "img",
      price: "[data-testid='gl-price-item']",
      originalPrice: "[data-testid='gl-price-item--crossed']",
    },
    maxProducts: 24,
    notes: "Desactivado por defecto: protección anti-bot equivalente a Nike. Usa 'npm run add-deal' para estas ofertas.",
  },
  {
    id: "privalia",
    name: "Privalia",
    enabled: false,
    listingUrls: [],
    selectors: {
      card: "",
      link: "",
      title: "",
      image: "",
      price: "",
    },
    notes: "Privalia es un club de venta privada: la mayoría del catálogo solo es visible tras iniciar sesión, así que no es viable un scraper público. Usa 'npm run add-deal' pegando el enlace de un producto concreto si tienes cuenta.",
  },
];
