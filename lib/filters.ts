import type { Deal, StoreId } from "./types";
import { tallasDisponibles } from "./sizes";

export type Gender = "hombre" | "mujer" | "niños";

export const GENDER_LABELS: Record<Gender, string> = {
  mujer: "Mujer",
  hombre: "Hombre",
  niños: "Niños",
};

export const GENDER_ORDER: Gender[] = ["mujer", "hombre", "niños"];

export type PriceBucketId = "under10" | "10to25" | "25to50" | "50to100" | "over100";

export interface PriceBucket {
  id: PriceBucketId;
  label: string;
  min: number;
  /** null = sin tope superior. */
  max: number | null;
}

export const PRICE_BUCKETS: PriceBucket[] = [
  { id: "under10", label: "Menos de 10€", min: 0, max: 10 },
  { id: "10to25", label: "10€ – 25€", min: 10, max: 25 },
  { id: "25to50", label: "25€ – 50€", min: 25, max: 50 },
  { id: "50to100", label: "50€ – 100€", min: 50, max: 100 },
  { id: "over100", label: "Más de 100€", min: 100, max: null },
];

export const DISCOUNT_STEPS = [20, 30, 50, 70] as const;

export type SortMode = "discount" | "price-asc" | "price-desc";

export interface Filtros {
  query: string;
  genders: Set<Gender>;
  stores: Set<StoreId>;
  categories: Set<string>;
  buckets: Set<PriceBucketId>;
  /** Etiquetas de talla ya normalizadas (ver lib/sizes.ts). */
  sizes: Set<string>;
  minDiscount: number;
}

export const FILTROS_VACIOS: Filtros = {
  query: "",
  genders: new Set(),
  stores: new Set(),
  categories: new Set(),
  buckets: new Set(),
  sizes: new Set(),
  minDiscount: 0,
};

export function hayFiltrosActivos(f: Filtros): boolean {
  return (
    f.query.trim() !== "" ||
    f.genders.size > 0 ||
    f.stores.size > 0 ||
    f.categories.size > 0 ||
    f.buckets.size > 0 ||
    f.sizes.size > 0 ||
    f.minDiscount > 0
  );
}

/** Cuántos grupos de filtro están en uso (para el contador del botón). */
export function contarFiltrosActivos(f: Filtros): number {
  return (
    f.genders.size +
    f.stores.size +
    f.categories.size +
    f.buckets.size +
    f.sizes.size +
    (f.minDiscount > 0 ? 1 : 0)
  );
}

export function cumpleFiltros(d: Deal, f: Filtros): boolean {
  if (f.stores.size > 0 && !f.stores.has(d.store)) return false;
  if (f.categories.size > 0 && !(d.category && f.categories.has(d.category))) return false;
  // Las prendas unisex pasan cualquier filtro de género.
  if (
    f.genders.size > 0 &&
    d.gender !== "unisex" &&
    !(d.gender && f.genders.has(d.gender as Gender))
  ) {
    return false;
  }
  if (f.buckets.size > 0) {
    if (d.price === null) return false;
    const precio = d.price;
    const encaja = PRICE_BUCKETS.some(
      (b) => f.buckets.has(b.id) && precio >= b.min && (b.max === null || precio < b.max),
    );
    if (!encaja) return false;
  }
  // Filtrar por talla solo tiene sentido sobre las tallas que quedan: una
  // oferta cuya M está agotada no vale de nada a quien gasta la M. Las
  // tiendas que no publican tallas quedan fuera al usar este filtro, que es
  // lo honesto — no sabemos si les queda.
  if (f.sizes.size > 0) {
    const disponibles = tallasDisponibles(d.sizes);
    if (!disponibles.some((t) => f.sizes.has(t))) return false;
  }
  if ((d.discountPercent ?? 0) < f.minDiscount) return false;
  if (f.query.trim()) {
    const q = f.query.trim().toLowerCase();
    if (!d.title.toLowerCase().includes(q)) return false;
  }
  return true;
}

export function ordenar(deals: Deal[], sort: SortMode): Deal[] {
  return [...deals].sort((a, b) => {
    if (sort === "discount") return (b.discountPercent ?? 0) - (a.discountPercent ?? 0);
    if (sort === "price-asc") return (a.price ?? Infinity) - (b.price ?? Infinity);
    return (b.price ?? 0) - (a.price ?? 0);
  });
}
