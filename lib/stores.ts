import type { StoreId } from "./types";

export interface StoreMeta {
  id: StoreId;
  name: string;
  color: string;
}

export const STORES: StoreMeta[] = [
  { id: "zara", name: "Zara", color: "#111111" },
  { id: "hm", name: "H&M", color: "#e50010" },
  { id: "mango", name: "Mango", color: "#2b2b2b" },
  { id: "bershka", name: "Bershka", color: "#000000" },
  { id: "pullbear", name: "Pull&Bear", color: "#1a1a1a" },
  { id: "nike", name: "Nike", color: "#111111" },
  { id: "adidas", name: "Adidas", color: "#000000" },
  { id: "decathlon", name: "Decathlon", color: "#0082c3" },
  { id: "asos", name: "ASOS", color: "#000000" },
  { id: "zalando", name: "Zalando", color: "#ff6900" },
  { id: "privalia", name: "Privalia", color: "#e2007a" },
  { id: "puma", name: "Puma", color: "#000000" },
  { id: "otros", name: "Otros", color: "#6b7280" },
];

export function storeMeta(id: StoreId): StoreMeta {
  return STORES.find((s) => s.id === id) ?? { id, name: id, color: "#6b7280" };
}
