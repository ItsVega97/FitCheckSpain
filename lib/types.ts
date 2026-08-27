export type StoreId =
  | "zara"
  | "hm"
  | "mango"
  | "bershka"
  | "pullbear"
  | "nike"
  | "adidas"
  | "decathlon"
  | "asos"
  | "zalando"
  | "privalia"
  | "puma"
  | "womensecret"
  | "desigual"
  | "cortefiel"
  | "springfield"
  | "pedrodelhierro"
  // Tiendas sobre Shopify (ver scripts/scrapers/shopify.ts)
  | "bimani"
  | "popa"
  | "pompeii"
  | "bluebanana"
  | "laagam"
  | "coosy"
  | "scalpers"
  | "poete"
  | "silbon"
  | "ecoalf"
  | "otros";

import type { Talla } from "./sizes";

export interface Deal {
  id: string;
  store: StoreId;
  storeName: string;
  title: string;
  imageUrl: string | null;
  productUrl: string;
  price: number | null;
  originalPrice: number | null;
  discountPercent: number | null;
  currency: string;
  category?: string;
  gender?: "hombre" | "mujer" | "niños" | "unisex";
  /** Tallas con su disponibilidad. Solo las tiendas Shopify las publican. */
  sizes?: Talla[];
  scrapedAt: string;
  source: "auto" | "manual";
}

export interface StoreStatus {
  store: StoreId;
  storeName: string;
  ok: boolean;
  dealsFound: number;
  lastRun: string;
  error?: string;
}

export interface ScrapeLog {
  lastRun: string;
  stores: StoreStatus[];
}
