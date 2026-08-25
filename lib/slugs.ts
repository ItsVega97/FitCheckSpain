import type { Deal, StoreId } from "./types";
import { STORES } from "./stores";

/**
 * Las categorías se inventan en el scraper (`scripts/scrapers/categorize.ts`)
 * y llevan tildes, mayúsculas y "y": "Sudaderas y jerséis". Para usarlas como
 * URL hace falta convertirlas a algo estable y legible, y sobre todo poder
 * volver de la URL a la categoría — de ahí que el mapa se construya siempre
 * a partir de los datos reales en vez de mantener una lista aparte que se
 * desincronizaría en cuanto el clasificador aprendiera una categoría nueva.
 */
export function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita las tildes que NFD ha separado
    .toLowerCase()
    .replace(/&/g, " y ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Categorías presentes en los datos, ordenadas por número de ofertas. */
export function categoriasDeLasOfertas(deals: Deal[]): string[] {
  const recuento = new Map<string, number>();
  for (const d of deals) {
    if (d.category) recuento.set(d.category, (recuento.get(d.category) ?? 0) + 1);
  }
  return [...recuento.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
}

/** Devuelve la categoría cuyo slug coincide, o null si no existe ninguna. */
export function categoriaDesdeSlug(deals: Deal[], slug: string): string | null {
  return categoriasDeLasOfertas(deals).find((c) => slugify(c) === slug) ?? null;
}

/** Tiendas con ofertas, ordenadas por volumen. */
export function tiendasDeLasOfertas(deals: Deal[]): { id: StoreId; name: string; total: number }[] {
  const recuento = new Map<StoreId, number>();
  for (const d of deals) recuento.set(d.store, (recuento.get(d.store) ?? 0) + 1);
  return STORES.filter((s) => recuento.has(s.id))
    .map((s) => ({ id: s.id, name: s.name, total: recuento.get(s.id) ?? 0 }))
    .sort((a, b) => b.total - a.total);
}

export function tiendaDesdeSlug(slug: string): { id: StoreId; name: string } | null {
  return STORES.find((s) => slugify(s.name) === slug) ?? null;
}

export const rutaCategoria = (categoria: string) => `/rebajas/${slugify(categoria)}`;
export const rutaTienda = (nombreTienda: string) => `/tienda/${slugify(nombreTienda)}`;
