"use client";

import { useEffect } from "react";
import type { StoreId } from "@/lib/types";
import type { StoreMeta } from "@/lib/stores";
import {
  DISCOUNT_STEPS,
  GENDER_LABELS,
  PRICE_BUCKETS,
  type Filtros,
  type Gender,
  type PriceBucketId,
} from "@/lib/filters";

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  filtros: Filtros;
  resultados: number;
  generosDisponibles: Gender[];
  tiendasDisponibles: StoreMeta[];
  categoriasDisponibles: string[];
  /** Recuentos sobre el catálogo completo, para saber qué hay antes de pulsar. */
  recuentoGenero: Record<string, number>;
  recuentoTienda: Record<string, number>;
  recuentoCategoria: Record<string, number>;
  onToggleGenero: (g: Gender) => void;
  onToggleTienda: (s: StoreId) => void;
  onToggleCategoria: (c: string) => void;
  onToggleTramo: (b: PriceBucketId) => void;
  onMinDiscount: (v: number) => void;
  onLimpiar: () => void;
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">{titulo}</h3>
      {children}
    </div>
  );
}

/**
 * Chip de filtro. En móvil la altura mínima es de 44px porque se pulsa con
 * el pulgar; en escritorio puede ser más compacto.
 */
function Chip({
  activo,
  onClick,
  children,
  recuento,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
  recuento?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition sm:min-h-0 sm:py-2 ${
        activo
          ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
          : "border-neutral-300 text-neutral-600 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300"
      }`}
    >
      {children}
      {recuento !== undefined ? (
        <span className={activo ? "text-white/60 dark:text-neutral-900/50" : "text-neutral-400"}>
          {recuento}
        </span>
      ) : null}
    </button>
  );
}

export default function FilterSheet({
  abierto,
  onCerrar,
  filtros,
  resultados,
  generosDisponibles,
  tiendasDisponibles,
  categoriasDisponibles,
  recuentoGenero,
  recuentoTienda,
  recuentoCategoria,
  onToggleGenero,
  onToggleTienda,
  onToggleCategoria,
  onToggleTramo,
  onMinDiscount,
  onLimpiar,
}: Props) {
  // Cerrar con Escape y bloquear el scroll del fondo mientras está abierto.
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", onKey);
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previo;
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Filtros"
    >
      <button
        type="button"
        aria-label="Cerrar filtros"
        onClick={onCerrar}
        className="absolute inset-0 bg-neutral-950/55"
      />

      <div className="relative flex max-h-[88vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl dark:bg-neutral-900 sm:max-h-[82vh] sm:max-w-2xl sm:rounded-3xl">
        {/* asa del panel, solo en móvil */}
        <div className="flex justify-center pb-1 pt-2.5 sm:hidden">
          <span className="block h-1 w-9 rounded-full bg-neutral-300 dark:bg-neutral-700" />
        </div>

        <div className="flex items-center justify-between border-b border-neutral-100 px-5 pb-4 pt-2 dark:border-neutral-800 sm:pt-5">
          <h2 className="font-display text-lg text-neutral-950 dark:text-white">Filtros</h2>
          <button
            type="button"
            onClick={onLimpiar}
            className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-500"
          >
            Limpiar
          </button>
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto px-5 py-5">
          {generosDisponibles.length > 0 ? (
            <Grupo titulo="Género">
              <div className="flex flex-wrap gap-2">
                {generosDisponibles.map((g) => (
                  <Chip
                    key={g}
                    activo={filtros.genders.has(g)}
                    onClick={() => onToggleGenero(g)}
                    recuento={recuentoGenero[g]}
                  >
                    {GENDER_LABELS[g]}
                  </Chip>
                ))}
              </div>
            </Grupo>
          ) : null}

          <Grupo titulo="Precio">
            <div className="flex flex-wrap gap-2">
              {PRICE_BUCKETS.map((b) => (
                <Chip
                  key={b.id}
                  activo={filtros.buckets.has(b.id)}
                  onClick={() => onToggleTramo(b.id)}
                >
                  {b.label}
                </Chip>
              ))}
            </div>
          </Grupo>

          <Grupo titulo="Descuento mínimo">
            <div className="flex gap-2">
              {DISCOUNT_STEPS.map((v) => {
                const activo = filtros.minDiscount === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onMinDiscount(activo ? 0 : v)}
                    className={`min-h-[44px] flex-1 rounded-xl border text-sm font-semibold transition sm:min-h-0 sm:py-2.5 ${
                      activo
                        ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                        : "border-neutral-300 text-neutral-600 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    {v}%
                  </button>
                );
              })}
            </div>
          </Grupo>

          {categoriasDisponibles.length > 0 ? (
            <Grupo titulo="Categoría">
              <div className="flex flex-wrap gap-2">
                {categoriasDisponibles.map((c) => (
                  <Chip
                    key={c}
                    activo={filtros.categories.has(c)}
                    onClick={() => onToggleCategoria(c)}
                    recuento={recuentoCategoria[c]}
                  >
                    {c}
                  </Chip>
                ))}
              </div>
            </Grupo>
          ) : null}

          <Grupo titulo="Marca">
            <div className="flex flex-wrap gap-2">
              {tiendasDisponibles.map((s) => (
                <Chip
                  key={s.id}
                  activo={filtros.stores.has(s.id)}
                  onClick={() => onToggleTienda(s.id)}
                  recuento={recuentoTienda[s.id]}
                >
                  {s.name}
                </Chip>
              ))}
            </div>
          </Grupo>
        </div>

        <div className="border-t border-neutral-100 p-4 dark:border-neutral-800">
          <button
            type="button"
            onClick={onCerrar}
            className="w-full rounded-2xl bg-brand-500 py-4 font-display text-base text-neutral-950 transition hover:bg-brand-400"
          >
            {resultados === 0
              ? "Sin resultados"
              : `Ver ${resultados.toLocaleString("es-ES")} ${resultados === 1 ? "oferta" : "ofertas"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
