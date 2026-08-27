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
  { id: "womensecret", name: "Womensecret", color: "#e6007e" },
  { id: "desigual", name: "Desigual", color: "#000000" },
  { id: "cortefiel", name: "Cortefiel", color: "#1c3f6e" },
  { id: "springfield", name: "Springfield", color: "#00843d" },
  { id: "pedrodelhierro", name: "Pedro del Hierro", color: "#8c1d40" },
  { id: "bimani", name: "Bimani", color: "#c2185b" },
  { id: "popa", name: "Popa", color: "#d4a017" },
  { id: "pompeii", name: "Pompeii", color: "#1f3a5f" },
  { id: "bluebanana", name: "Blue Banana", color: "#1565c0" },
  { id: "laagam", name: "Laagam", color: "#b3005e" },
  { id: "coosy", name: "Coosy", color: "#8e24aa" },
  { id: "scalpers", name: "Scalpers", color: "#0d0d0d" },
  { id: "poete", name: "Poete", color: "#7b1fa2" },
  { id: "otros", name: "Otros", color: "#6b7280" },
];

export function storeMeta(id: StoreId): StoreMeta {
  return STORES.find((s) => s.id === id) ?? { id, name: id, color: "#6b7280" };
}
