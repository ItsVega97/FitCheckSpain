import type { StoreId } from "../../lib/types";

export interface StoreSelectors {
  /** Selector del contenedor repetido de cada producto en la página de listado */
  card: string;
  /** Selector del <a> con el enlace al producto, relativo a `card` */
  link: string;
  /** Selector del título, relativo a `card` */
  title: string;
  /** Selector de la imagen, relativo a `card` */
  image: string;
  /** Selector del precio actual (con descuento), relativo a `card` */
  price: string;
  /** Selector del precio original (tachado), relativo a `card`. Opcional. */
  originalPrice?: string;
}

export interface StoreConfig {
  id: StoreId;
  name: string;
  enabled: boolean;
  /** Páginas de "rebajas"/"outlet" donde buscar productos con descuento */
  listingUrls: string[];
  selectors: StoreSelectors;
  maxProducts?: number;
  notes?: string;
  /** true si el listado se pinta con JS en el cliente y hace falta un navegador headless para verlo */
  headless?: boolean;
}
