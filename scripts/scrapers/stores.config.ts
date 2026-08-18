import type { StoreConfig } from "./types";

/**
 * Configuración de tiendas para el scraper.
 *
 * Estado verificado ejecutando el scraper de verdad en GitHub Actions
 * (con acceso a internet real), última comprobación 22/07/2026:
 *
 * - ASOS, Nike y Puma: scraping automático fiable, sin protección anti-bot
 *   para peticiones simples. Las tres exponen el listado en JSON embebido
 *   (ver scripts/scrapers/asos.ts, nike.ts y puma.ts). Puma no incluye
 *   precio original en su JSON-LD, solo el precio ya rebajado.
 * - Superdry y Skechers: HTTP 200 pero su JSON-LD solo trae
 *   BreadcrumbList/datos de la organización, no el listado de productos;
 *   haría falta parsear las tarjetas HTML directamente (no investigado
 *   todavía).
 * - H&M, Decathlon, Zalando, Adidas: 403 (Akamai / Cloudflare) confirmado
 *   incluso en la portada, no solo en la página de rebajas.
 * - Zara, Bershka, Pull&Bear (Inditex): confirmado que sirven una página
 *   de redirección/verificación (meta-refresh o parámetro bm-verify de
 *   Akamai Bot Manager) en vez del contenido real a peticiones sin
 *   JavaScript.
 * - Mango: la portada carga bien, pero las rutas de rebajas devuelven la
 *   página de error de Next.js (__next_error__); el listado se pinta por
 *   JavaScript en el cliente, así que un fetch simple nunca ve productos
 *   aunque la URL sea exacta.
 * - Privalia: catálogo tras login, no hay nada público que rastrear.
 * - Ronda de 18/08/2026: sondeadas 35 marcas más (Under Armour, New Balance,
 *   Reebok, Converse, Vans, The North Face, Champion, Fila, Lacoste, Levi's,
 *   Tommy Hilfiger, Calvin Klein, Springfield, Womensecret, C&A, Timberland,
 *   Diesel, Guess, Bimba y Lola, Uniqlo, Kiabi, Naf Naf, Blanco, El Ganso,
 *   Ecoalf, Sfera, Etam, Neck&Neck, Purificación García, Adolfo Domínguez,
 *   Panama Jack, Camper, Geox, Pepe Jeans, Munich). Ninguna viable: la
 *   mayoría 403/418 (bot detection) o 404 (URL de rebajas adivinada
 *   incorrecta — habría que confirmar la ruta real a mano por tienda), las
 *   que sí cargan (Etam, C&A, Diesel, Bimba y Lola, Geox) no tienen ni
 *   JSON-LD de producto ni tarjetas HTML server-renderizadas. Womensecret
 *   dio un falso positivo: el texto "product-tile" solo aparece dentro de
 *   un JSON de configuración de analítica (selectores CSS para tracking de
 *   clics), no hay productos reales en el HTML — el listado se pinta por
 *   JavaScript en el cliente.
 *
 * Ninguno de estos bloqueos es un problema de selectores o de URL: hace
 * falta un navegador real (headless) con gestión de cookies/JS para
 * sortearlos, lo cual queda fuera del alcance de un scraper gratuito por
 * fetch simple. Para todas las desactivadas usa `npm run add-deal -- <url>`
 * — añadir a mano una oferta puntual sí funciona bien, ya que es una sola
 * petición ocasional, no un rastreo repetido.
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
    id: "nike",
    name: "Nike",
    enabled: true,
    // La URL de listado está hardcodeada en scripts/scrapers/nike.ts; este
    // campo no se usa (Nike tiene un scraper especializado), se deja solo
    // a título informativo.
    listingUrls: ["https://www.nike.com/es/w/ofertas-3yaep"],
    selectors: {
      card: "",
      link: "",
      title: "",
      image: "",
      price: "",
    },
    notes: "Scraper especializado (JSON __NEXT_DATA__), ver scripts/scrapers/nike.ts. Confirmado funcionando.",
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
    notes: "Desactivado: confirmado que sirve una página de redirección meta-refresh (interstitial anti-bot) a peticiones sin JavaScript. Usa 'npm run add-deal'.",
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
    notes: "Desactivado: confirmado el mismo interstitial anti-bot que Zara (mismo grupo Inditex). Usa 'npm run add-deal'.",
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
    notes: "Desactivado: confirmado el parámetro bm-verify de Akamai Bot Manager en la respuesta (interstitial anti-bot). Usa 'npm run add-deal'.",
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
    notes: "Desactivado: confirmado 403 de AkamaiNetStorage incluso en la portada. Usa 'npm run add-deal'.",
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
  {
    id: "puma",
    name: "Puma",
    enabled: true,
    // La URL de listado está hardcodeada en scripts/scrapers/puma.ts; este
    // campo no se usa (Puma tiene un scraper especializado), se deja solo
    // a título informativo.
    listingUrls: ["https://es.puma.com/es/es/sale"],
    selectors: {
      card: "",
      link: "",
      title: "",
      image: "",
      price: "",
    },
    notes: "Scraper especializado (JSON-LD ItemList), ver scripts/scrapers/puma.ts. Sin precio original en la fuente, solo precio ya rebajado. Confirmado funcionando.",
  },
];
