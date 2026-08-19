"use client";

import { useEffect, useRef, useState } from "react";

export interface OpcionMenu {
  id: string;
  label: string;
  count: number;
}

interface Props {
  titulo: string;
  opciones: OpcionMenu[];
  seleccion: Set<string>;
  onToggle: (id: string) => void;
  onLimpiar: () => void;
}

/**
 * Desplegable de selección múltiple para la barra de filtros.
 *
 * Marca y precio ya estaban en el panel de filtros, pero ahí no se ven sin
 * abrirlo; son dos de los filtros que más se usan, así que se sacan también
 * a la barra. El estado sigue siendo el mismo objeto `Filtros`, de modo que
 * marcar aquí una marca se refleja en el panel y al revés.
 */
export default function MenuFiltro({ titulo, opciones, seleccion, onToggle, onLimpiar }: Props) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera o con Escape: sin esto el menú se queda
  // abierto tapando el grid mientras el usuario sigue navegando.
  useEffect(() => {
    if (!abierto) return;
    function fuera(e: MouseEvent) {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    }
    function escape(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [abierto]);

  const activos = seleccion.size;

  return (
    <div ref={contenedor} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className={`flex h-11 items-center gap-1.5 rounded-full border px-4 text-[13px] font-medium transition ${
          activos > 0
            ? "border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-neutral-950"
            : "border-neutral-300 text-neutral-600 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300"
        }`}
      >
        {titulo}
        {activos > 0 ? (
          <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-500 px-1 text-[11px] font-bold text-neutral-950">
            {activos}
          </span>
        ) : null}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-3.5 w-3.5 transition-transform ${abierto ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {abierto ? (
        <div className="absolute left-0 top-[calc(100%+6px)] z-40 max-h-[60vh] w-64 overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
          {opciones.map((o) => {
            const marcado = seleccion.has(o.id);
            return (
              <label
                key={o.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <input
                  type="checkbox"
                  checked={marcado}
                  onChange={() => onToggle(o.id)}
                  className="h-4 w-4 shrink-0 accent-brand-600"
                />
                <span className="flex-1 truncate text-[13px] text-neutral-800 dark:text-neutral-100">
                  {o.label}
                </span>
                <span className="text-[11px] tabular-nums text-neutral-400">{o.count}</span>
              </label>
            );
          })}
          {activos > 0 ? (
            <button
              type="button"
              onClick={onLimpiar}
              className="mt-1 w-full rounded-xl px-2.5 py-2 text-left text-[13px] font-semibold text-brand-600 hover:bg-neutral-100 dark:text-brand-500 dark:hover:bg-neutral-800"
            >
              Quitar {titulo.toLowerCase()}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
