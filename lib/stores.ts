import type { StoreId } from "./types";

export interface StoreMeta {
  id: StoreId;
  name: string;
  color: string;
  /**
   * Puesto en el ranking de marcas de ropa más populares en España
   * (informe del 27/08/2026). Cuanto más bajo, más reconocible.
   *
   * Es una estimación apoyada en rankings publicados de tráfico, no una
   * medición propia, y solo se usa para ordenar: nunca para filtrar ni
   * para esconder nada. Las marcas sin puesto van al final.
   */
  popularidad?: number;
}

/** Marcas sin puesto conocido: se ordenan detrás de las 50 del ranking. */
const SIN_RANKING = 999;

/**
 * Empujón que da el reconocimiento de marca al ordenar por "Destacados".
 *
 * Va sumado al % de descuento, así que conviene que no lo aplaste: con 20
 * puntos como techo, un -60% de Zalando (puesto 10) adelanta a un -70% de
 * una marca desconocida, pero un -80% real sigue ganando a casi todo. La
 * idea es inclinar la balanza, no sustituir el descuento por la marca.
 */
export const BONO_MARCA_MAX = 20;

export function bonoMarca(id: StoreId): number {
  const puesto = storeMeta(id).popularidad ?? SIN_RANKING;
  if (puesto >= 50) return 0;
  return Math.round(BONO_MARCA_MAX * (1 - puesto / 50));
}

export const STORES: StoreMeta[] = [
  { id: "zara", name: "Zara", color: "#111111", popularidad: 2 },
  { id: "hm", name: "H&M", color: "#e50010", popularidad: 3 },
  { id: "mango", name: "Mango", color: "#2b2b2b", popularidad: 5 },
  { id: "bershka", name: "Bershka", color: "#000000", popularidad: 6 },
  { id: "pullbear", name: "Pull&Bear", color: "#1a1a1a", popularidad: 8 },
  { id: "nike", name: "Nike", color: "#111111", popularidad: 15 },
  { id: "adidas", name: "Adidas", color: "#000000", popularidad: 16 },
  { id: "decathlon", name: "Decathlon", color: "#0082c3", popularidad: 11 },
  { id: "asos", name: "ASOS", color: "#000000", popularidad: 17 },
  { id: "zalando", name: "Zalando", color: "#ff6900", popularidad: 10 },
  { id: "privalia", name: "Privalia", color: "#e2007a" },
  { id: "puma", name: "Puma", color: "#000000", popularidad: 30 },
  { id: "womensecret", name: "Womensecret", color: "#e6007e", popularidad: 25 },
  { id: "desigual", name: "Desigual", color: "#000000", popularidad: 24 },
  { id: "cortefiel", name: "Cortefiel", color: "#1c3f6e", popularidad: 23 },
  { id: "springfield", name: "Springfield", color: "#00843d", popularidad: 19 },
  { id: "pedrodelhierro", name: "Pedro del Hierro", color: "#8c1d40", popularidad: 33 },
  { id: "bimani", name: "Bimani", color: "#c2185b" },
  { id: "popa", name: "Popa", color: "#d4a017" },
  { id: "pompeii", name: "Pompeii", color: "#1f3a5f" },
  { id: "bluebanana", name: "Blue Banana", color: "#1565c0" },
  { id: "laagam", name: "Laagam", color: "#b3005e" },
  { id: "coosy", name: "Coosy", color: "#8e24aa" },
  { id: "scalpers", name: "Scalpers", color: "#0d0d0d", popularidad: 32 },
  { id: "poete", name: "Poete", color: "#7b1fa2" },
  { id: "silbon", name: "Silbon", color: "#1b3a5c", popularidad: 47 },
  { id: "ecoalf", name: "Ecoalf", color: "#00695c", popularidad: 48 },
  { id: "otros", name: "Otros", color: "#6b7280" },
];

export function storeMeta(id: StoreId): StoreMeta {
  return STORES.find((s) => s.id === id) ?? { id, name: id, color: "#6b7280" };
}
