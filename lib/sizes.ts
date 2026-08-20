/**
 * Normalización de tallas.
 *
 * Cada tienda escribe las tallas a su manera, y esto está medido sobre los
 * valores reales de las ocho tiendas Shopify, no inventado:
 *
 *   Coosy        XS S M L XL, 35-44, U, S/M, M/L, L/XL, XS/S
 *   Blue Banana  XS..XXL, ÚNICA, 36/39, "8 AÑOS (134 cm)", 4-16
 *   Popa         35-46, U
 *   Pompeii      XXS..XXL, 36-47, U, 40-46
 *   Laagam       XS..XL, 32-42, "One Size", "Unique", S-M, M-L
 *   Scalpers     XS..XL, 28-46, UNICA, 4-16 (infantil)
 *   Poete        XS..XL
 *
 * De ahí que "talla única" tenga cinco grafías distintas y que las
 * combinadas usen barra o guion según la tienda.
 */

export interface Talla {
  /** Etiqueta ya normalizada, tal y como se muestra. */
  label: string;
  /** Si queda stock de esa talla. */
  available: boolean;
}

export type FamiliaTalla = "letra" | "numero" | "infantil" | "unica";

const UNICA = /^(u|t\.?u\.?|[úu]nica|one size|talla [úu]nica|unique|os)$/i;
const LETRAS = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];

/**
 * Convierte el valor bruto de la opción a una etiqueta estable, o null si
 * no es una talla (Shopify pone "Default Title" en los productos sin
 * variantes, y alguna tienda cuela "Denominaciones" en las tarjetas regalo).
 */
export function normalizarTalla(bruta: string): string | null {
  const t = bruta.trim().replace(/\s+/g, " ");
  if (!t) return null;
  if (/^(default title|title|denominaciones)$/i.test(t)) return null;

  if (UNICA.test(t)) return "Única";

  // "8 AÑOS (134 cm)" -> "8 años". La altura sobra en un filtro.
  const infantil = t.match(/^(\d{1,2})\s*A[ÑN]OS/i);
  if (infantil) return `${infantil[1]} años`;

  const may = t.toUpperCase();

  // Combinadas: "S/M", "S-M", "XS / S" -> "S/M"
  const combinada = may.match(/^(XXS|XS|S|M|L|XL|XXL|XXXL)\s*[/-]\s*(XXS|XS|S|M|L|XL|XXL|XXXL)$/);
  if (combinada) return `${combinada[1]}/${combinada[2]}`;

  if (LETRAS.includes(may)) return may;

  // Rangos numéricos: "36/39", "40-46"
  const rango = may.match(/^(\d{1,3})\s*[/-]\s*(\d{1,3})$/);
  if (rango) return `${Number(rango[1])}/${Number(rango[2])}`;

  if (/^\d{1,3}$/.test(may)) return String(Number(may));

  // Cualquier otra cosa se deja tal cual: es preferible mostrar una talla
  // rara a perderla.
  return t;
}

export function familiaTalla(label: string): FamiliaTalla {
  if (label === "Única") return "unica";
  if (/años$/i.test(label)) return "infantil";
  if (/^\d/.test(label)) return "numero";
  return "letra";
}

/**
 * Ordena para que el filtro se lea como en una tienda: primero las letras
 * de menor a mayor (no alfabéticamente, que pondría L antes que M), luego
 * los números, luego las tallas infantiles y al final la única.
 */
export function ordenarTallas(tallas: string[]): string[] {
  const peso = (t: string): [number, number, string] => {
    const familia = familiaTalla(t);
    if (familia === "letra") {
      const i = LETRAS.indexOf(t);
      // Las combinadas ("S/M") van justo detrás de su primera letra.
      const base = i >= 0 ? i * 2 : LETRAS.indexOf(t.split("/")[0]) * 2 + 1;
      return [0, base, t];
    }
    if (familia === "numero") return [1, parseInt(t, 10), t];
    if (familia === "infantil") return [2, parseInt(t, 10), t];
    return [3, 0, t];
  };
  return [...tallas].sort((a, b) => {
    const [fa, na, sa] = peso(a);
    const [fb, nb, sb] = peso(b);
    return fa - fb || na - nb || sa.localeCompare(sb, "es");
  });
}

/** Tallas con stock, listas para pintar en la tarjeta. */
export function tallasDisponibles(tallas: Talla[] | undefined): string[] {
  if (!tallas) return [];
  return ordenarTallas(tallas.filter((t) => t.available).map((t) => t.label));
}
