import type { Deal } from "./types";
import { familiaTalla } from "./sizes";

/**
 * Perfil de tallas del visitante.
 *
 * Hoy vive en el navegador, pero todo lo que hay aquí está separado en dos
 * mitades a propósito:
 *
 *   - La lógica (qué grupo de tallas le toca a cada categoría, si una oferta
 *     encaja con tu perfil) es pura y no sabe dónde se guarda nada.
 *   - El guardado está detrás de `AlmacenPerfil`, con una implementación
 *     sobre localStorage.
 *
 * Cuando se añadan cuentas con correo bastará con escribir un segundo
 * almacén que hable con la base de datos y elegir uno u otro según haya
 * sesión iniciada. Nada de lo demás cambia.
 */

/** Los tres grupos que una persona sabe decir de memoria. */
export type GrupoTalla = "arriba" | "pantalon" | "calzado";

export const GRUPOS: { id: GrupoTalla; label: string; ayuda: string }[] = [
  { id: "arriba", label: "Parte de arriba", ayuda: "Camisetas, camisas, vestidos, abrigos…" },
  { id: "pantalon", label: "Pantalón", ayuda: "Pantalones, vaqueros y faldas" },
  { id: "calzado", label: "Calzado", ayuda: "Zapatillas, botas y sandalias" },
];

export interface Perfil {
  arriba: string[];
  pantalon: string[];
  calzado: string[];
}

export const PERFIL_VACIO: Perfil = { arriba: [], pantalon: [], calzado: [] };

export function perfilVacio(p: Perfil | null | undefined): boolean {
  return !p || (!p.arriba.length && !p.pantalon.length && !p.calzado.length);
}

/**
 * Qué grupo de tallas aplica a cada categoría del clasificador.
 *
 * Las categorías que no llevan talla (bolsos, belleza, menaje) devuelven
 * null: filtrar "solo mi talla" no debe hacerlas desaparecer sin más, así
 * que se tratan aparte en `encajaConPerfil`.
 */
export function grupoDeCategoria(categoria: string | undefined): GrupoTalla | null {
  if (!categoria) return null;
  if (/calzado/i.test(categoria)) return "calzado";
  if (/pantalones|faldas/i.test(categoria)) return "pantalon";
  if (
    /camisetas|camisas|sudaderas|chaquetas|vestidos|monos|ropa interior|pijamas|ba[ñn]ador|deporte/i.test(
      categoria,
    )
  ) {
    return "arriba";
  }
  return null;
}

/**
 * ¿Queda alguna de mis tallas en esta oferta?
 *
 * Dos decisiones que se notan al usarlo:
 *
 *  - Solo cuentan las tallas **con stock**. Decir que algo es de tu talla
 *    cuando está agotada es peor que no decir nada.
 *  - Las prendas de talla única y las que no llevan talla (un bolso, un
 *    perfume) pasan el filtro. Si no, activar "solo mi talla" vaciaría
 *    medio catálogo por categorías donde la talla ni siquiera aplica.
 */
export function encajaConPerfil(deal: Deal, perfil: Perfil | null): boolean {
  if (perfilVacio(perfil)) return true;

  const grupo = grupoDeCategoria(deal.category);
  if (!grupo) return true; // categoría sin talla

  const mias = perfil![grupo];
  if (!mias.length) return true; // no has dicho tu talla de este grupo

  const disponibles = deal.sizes?.filter((t) => t.available) ?? [];
  if (!disponibles.length) return false; // agotada del todo

  return disponibles.some(
    (t) => t.label === "Única" || mias.includes(t.label) || familiaTalla(t.label) === "unica",
  );
}

const MINIMO_OFERTAS = 5;

/**
 * Tallas que tiene sentido ofrecer en cada grupo, sacadas del catálogo real
 * en vez de una lista fija: así el panel nunca ofrece una talla por la que
 * no se puede filtrar, y una tienda nueva con tallaje distinto aparece sola.
 */
export function tallasPorGrupo(deals: Deal[]): Record<GrupoTalla, string[]> {
  const acc: Record<GrupoTalla, Map<string, number>> = {
    arriba: new Map(),
    pantalon: new Map(),
    calzado: new Map(),
  };
  for (const d of deals) {
    const grupo = grupoDeCategoria(d.category);
    if (!grupo || !d.sizes) continue;
    // El tallaje infantil es numérico (4, 6, 8, 10…) y se mezclaría con el
    // de adulto en el mismo grupo, donde no significa nada. Se reconoce por
    // el género de la oferta, no por la etiqueta: "8" a secas es
    // indistinguible de una talla de adulto mirándola sola.
    if (d.gender === "niños") continue;
    for (const t of d.sizes) {
      // La talla única no se ofrece: no describe a nadie y siempre encaja.
      if (t.label === "Única" || familiaTalla(t.label) === "infantil") continue;
      acc[grupo].set(t.label, (acc[grupo].get(t.label) ?? 0) + 1);
    }
  }
  // Se descartan las tallas con muy pocas ofertas detrás. Son de dos tipos y
  // ninguno ayuda: tallajes infantiles numéricos (4, 6, 8) que aparecen
  // mezclados con los de adulto y confunden, y grafías sueltas de una sola
  // tienda. Ofrecer un filtro que apenas filtra es peor que no ofrecerlo.
  const util = (m: Map<string, number>) =>
    [...m.entries()].filter(([, n]) => n >= MINIMO_OFERTAS).map(([t]) => t);
  return { arriba: util(acc.arriba), pantalon: util(acc.pantalon), calzado: util(acc.calzado) };
}

/* ------------------------------------------------------------------ */
/* Guardado                                                            */
/* ------------------------------------------------------------------ */

export interface AlmacenPerfil {
  leer(): Promise<Perfil | null>;
  guardar(p: Perfil): Promise<void>;
  borrar(): Promise<void>;
}

const CLAVE = "fitcheck.perfil.v1";

function saneado(valor: unknown): Perfil | null {
  if (typeof valor !== "object" || valor === null) return null;
  const v = valor as Record<string, unknown>;
  const lista = (x: unknown) =>
    Array.isArray(x) ? x.filter((i): i is string => typeof i === "string") : [];
  return { arriba: lista(v.arriba), pantalon: lista(v.pantalon), calzado: lista(v.calzado) };
}

/**
 * Almacén sobre localStorage.
 *
 * Todos los accesos van en try/catch porque el navegador puede lanzar al
 * tocarlo (ventana privada, cookies de terceros bloqueadas), y un perfil de
 * tallas no vale una pantalla en blanco.
 */
export const almacenNavegador: AlmacenPerfil = {
  async leer() {
    try {
      const bruto = window.localStorage.getItem(CLAVE);
      return bruto ? saneado(JSON.parse(bruto)) : null;
    } catch {
      return null;
    }
  },
  async guardar(p) {
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify(p));
    } catch {
      /* sin espacio o sin permiso: el perfil solo dura la sesión */
    }
  },
  async borrar() {
    try {
      window.localStorage.removeItem(CLAVE);
    } catch {
      /* nada que hacer */
    }
  },
};
