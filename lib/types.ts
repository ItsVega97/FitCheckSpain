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
  | "otros";

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
