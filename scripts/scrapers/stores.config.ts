import type { StoreConfig } from "./types";

/**
 * Configuración de tiendas para el scraper.
 *
 * Los selectores son un punto de partida razonable (basado en patrones
 * habituales de e-commerce) pero NO han podido probarse en vivo contra las
 * webs reales durante la generación de este proyecto, porque el entorno en
 * el que se generó no tiene acceso a internet general. Es normal tener que
 * ajustarlos tras la primera ejecución real: ver "Arreglar un scraper roto"
 * en el README.
 *
 * Tiendas con protección anti-bot fuerte conocida (Zara/Inditex, Nike,
 * Adidas, Privalia) empiezan con enabled=false para no generar ejecuciones
 * que fallen siempre: en su lugar usa `npm run add-deal <url>` para
 * añadir sus ofertas a mano en segundos.
 */
export const STORE_CONFIGS: StoreConfig[] = [
  {
    id: "hm",
    name: "H&M",
    enabled: true,
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
    notes: "Listado de rebajas de H&M España.",
  },
  {
    id: "mango",
    name: "Mango",
    enabled: true,
    listingUrls: ["https://shop.mango.com/es/mujer/rebajas"],
    selectors: {
      card: "[class*='product-tile'], article[class*='product']",
      link: "a[href*='/es/mujer'], a[href*='/es/hombre']",
      title: "[class*='product-name'], h3, h2",
      image: "img",
      price: "[class*='price']:not([class*='old'])",
      originalPrice: "[class*='old-price'], del, s",
    },
    maxProducts: 24,
    notes: "Listado de rebajas de mujer de Mango; duplicar la entrada para /es/hombre/rebajas si se quiere esa sección.",
  },
  {
    id: "decathlon",
    name: "Decathlon",
    enabled: true,
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
    notes: "Sección de promociones de Decathlon España.",
  },
  {
    id: "asos",
    name: "ASOS",
    enabled: true,
    listingUrls: ["https://www.asos.com/es/ofertas/rebajas/cat/?cid=15078"],
    selectors: {
      card: "article, [class*='productTile']",
      link: "a[href*='/prd/']",
      title: "[class*='productDescription'], h2, h3",
      image: "img",
      price: "[class*='price'] [data-testid='current-price'], [class*='current-price']",
      originalPrice: "[data-testid='previous-price'], [class*='previous-price']",
    },
    maxProducts: 24,
    notes: "ASOS suele renderizar el listado con JavaScript; si el scraper devuelve 0 productos, considera cambiar a la API interna api.asos.com o a un headless browser.",
  },
  {
    id: "zalando",
    name: "Zalando",
    enabled: true,
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
    notes: "Outlet general de Zalando España.",
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
    notes: "Desactivado por defecto: Zara (Inditex) usa protección anti-bot fuerte y renderizado por JavaScript; un fetch simple probablemente reciba un bloqueo o una página vacía. Usa 'npm run add-deal' para estas ofertas.",
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
