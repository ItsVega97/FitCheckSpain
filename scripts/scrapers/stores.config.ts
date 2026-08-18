import type { StoreConfig } from "./types";

/**
 * Configuración de tiendas para el scraper.
 *
 * Estado verificado ejecutando el scraper de verdad en GitHub Actions
 * (con acceso a internet real), última comprobación 22/07/2026:
 *
 * - ASOS, Nike y Puma: scraping automático fiable con fetch simple, sin
 *   protección anti-bot. Las tres exponen el listado en JSON embebido (ver
 *   scripts/scrapers/asos.ts, nike.ts y puma.ts). Puma no incluye precio
 *   original en su JSON-LD, solo el precio ya rebajado.
 * - Womensecret y Mango: el listado se pinta con JavaScript en el cliente Y
 *   además Akamai bloquea con 403 tanto el fetch simple como Chromium en
 *   modo headless normal (incluso el "new headless" moderno). El hallazgo
 *   clave (18/08/2026): lanzando Chromium en modo **headed** de verdad
 *   (con Xvfb como display virtual en el runner) Akamai deja pasar la
 *   petición — deja de devolver 403 y sirve el contenido real. Ver
 *   scripts/scrapers/engine-headless.ts (lanza siempre headed) y
 *   scripts/scrapers/womensecret.ts / mango.ts. Ninguna de las dos incluye
 *   precio original en el HTML, solo precio ya rebajado (+ % de descuento
 *   en Mango). El workflow de scrape.yml arranca Xvfb antes de `npm run
 *   scrape`.
 * - Zalando: mismo bypass headed+Xvfb confirmado (HTTP 200 en vez de 403) —
 *   además la URL real de rebajas es `/rebajas/`, no `/outlet/` (que sí
 *   estaba bloqueada, de ahí la confusión en rondas anteriores). Pendiente:
 *   el listado usa un grid virtualizado con clases ofuscadas sin ninguna
 *   palabra reconocible ("product", "tile"...), hace falta investigar más
 *   para extraer los datos.
 * - Zara: mismo bypass headed+Xvfb confirmado (HTTP 200, carga 1.2MB en vez
 *   del interstitial anti-bot). Pendiente: no se encontró JSON-LD ni
 *   __NEXT_DATA__ ni enlaces de producto nada más cargar — probablemente
 *   necesita scroll/interacción para que el grid virtualizado pinte los
 *   productos.
 * - Adidas: con headed+Xvfb la petición sigue devolviendo 403 pero con un
 *   título "adidas" en vez de una página de error genérica — resultado
 *   ambiguo, no investigado a fondo.
 * - H&M: 403 Akamai confirmado incluso con headed+Xvfb — el bypass no es
 *   universal, cada despliegue de Akamai puede tener reglas distintas.
 * - Decathlon: Cloudflare (no Akamai) sigue devolviendo el challenge "Un
 *   momento…" incluso con headed+Xvfb.
 * - Superdry y Skechers: HTTP 200 con fetch simple pero su JSON-LD solo
 *   trae BreadcrumbList/datos de la organización, no el listado de
 *   productos; no probado con navegador headed todavía.
 * - Bershka, Pull&Bear (Inditex): mismo interstitial anti-bot que Zara con
 *   fetch simple; no probado con headed+Xvfb todavía.
 * - Privalia: catálogo tras login, no hay nada público que rastrear.
 * - Ronda de 18/08/2026 (fetch simple, antes de descubrir el bypass
 *   headed): sondeadas 35 marcas más (Under Armour, New Balance, Reebok,
 *   Converse, Vans, The North Face, Champion, Fila, Lacoste, Levi's, Tommy
 *   Hilfiger, Calvin Klein, Springfield, C&A, Timberland, Diesel, Guess,
 *   Bimba y Lola, Uniqlo, Kiabi, Naf Naf, Blanco, El Ganso, Ecoalf, Sfera,
 *   Etam, Neck&Neck, Purificación García, Adolfo Domínguez, Panama Jack,
 *   Camper, Geox, Pepe Jeans, Munich). Ninguna viable con fetch simple: la
 *   mayoría 403/418 (bot detection) o 404 (URL de rebajas adivinada
 *   incorrecta), las que sí cargan no tienen ni JSON-LD de producto ni
 *   tarjetas HTML server-renderizadas. Ninguna de estas se ha vuelto a
 *   probar con headed+Xvfb todavía — son las candidatas más prometedoras
 *   para una próxima ronda, dado que el bypass funcionó en 3 de 4 tiendas
 *   con Akamai probadas hasta ahora.
 *
 * Las tiendas que siguen bloqueadas incluso con headed+Xvfb (H&M,
 * Decathlon, Adidas) necesitarían algo más costoso (proxies residenciales,
 * fingerprinting más sofisticado), lo cual queda fuera de alcance de un
 * scraper personal gratuito. Para esas, usa `npm run add-deal -- <url>` —
 * añadir a mano una oferta puntual funciona bien, es una sola petición
 * ocasional.
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
    enabled: true,
    // Las URLs de listado están hardcodeadas en scripts/scrapers/mango.ts;
    // este campo no se usa (Mango tiene un scraper especializado), se deja
    // solo a título informativo.
    listingUrls: ["https://shop.mango.com/es/es/c/mujer/rebajas--70/93ea7423"],
    selectors: {
      card: "",
      link: "",
      title: "",
      image: "",
      price: "",
    },
    notes: "Scraper especializado con navegador headed (Xvfb) + selectores cheerio, ver scripts/scrapers/mango.ts. Akamai bloqueaba con 403 tanto el fetch simple como el navegador headless normal, pero deja pasar la petición en modo headed real. Sin precio original ni % de descuento visibles en la tarjeta, solo el precio ya rebajado. Confirmado funcionando (32 ofertas reales en la primera ejecución).",
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
    enabled: true,
    // Las URLs de listado están hardcodeadas en scripts/scrapers/zalando.ts;
    // este campo no se usa (Zalando tiene un scraper especializado), se deja
    // solo a título informativo.
    listingUrls: ["https://www.zalando.es/rebajas/"],
    selectors: {
      card: "",
      link: "",
      title: "",
      image: "",
      price: "",
    },
    notes: "Scraper especializado con navegador headed (Xvfb), ver scripts/scrapers/zalando.ts. Akamai bloqueaba con 403 el fetch simple, pero deja pasar la petición en modo headed. El grid usa CSS Modules con clases totalmente hasheadas sin ninguna palabra reconocible, así que el scraper navega por la estructura fija de cada <article> (enlaces, <h3> con marca+nombre, <section> con el/los <p> de precio) en vez de por nombre de clase — más frágil ante cambios de layout que un selector por clase, pero es lo único estable disponible. Confirmado funcionando.",
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
    notes: "Desactivado (por ahora): confirmado interstitial anti-bot con fetch simple, pero con navegador headed (Xvfb) la página carga entera (HTTP 200, 1.2MB). No tiene JSON-LD ni __NEXT_DATA__ ni enlaces de producto visibles nada más cargar — probablemente necesita scroll/interacción para que el grid pinte los productos. No investigado a fondo todavía. Usa 'npm run add-deal'.",
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
  {
    id: "womensecret",
    name: "Womensecret",
    enabled: true,
    // Las URLs de listado están hardcodeadas en scripts/scrapers/womensecret.ts;
    // este campo no se usa, se deja solo a título informativo.
    listingUrls: ["https://womensecret.com/es/es/promociones/remate-final/mujer"],
    selectors: {
      card: "",
      link: "",
      title: "",
      image: "",
      price: "",
    },
    notes: "Scraper especializado con navegador headless (Playwright), ver scripts/scrapers/womensecret.ts. El listado se pinta con JS en el cliente, así que un fetch simple no ve productos; cada tarjeta trae su propio JSON-LD con precio ya rebajado (sin precio original). Confirmado funcionando.",
  },
];
