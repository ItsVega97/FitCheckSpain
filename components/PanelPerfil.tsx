"use client";

import { useEffect, useRef, useState } from "react";
import { GRUPOS, perfilVacio, type GrupoTalla, type Perfil } from "@/lib/perfil";
import { ordenarTallas } from "@/lib/sizes";

interface Props {
  perfil: Perfil;
  opciones: Record<GrupoTalla, string[]>;
  soloMiTalla: boolean;
  coincidencias: number;
  onCambiar: (p: Perfil) => void;
  onSoloMiTalla: (v: boolean) => void;
  onBorrar: () => void;
}

/**
 * Panel de tallas de la cabecera.
 *
 * Se guarda en este navegador; cuando existan las cuentas por correo el
 * panel no cambia, solo el almacén que hay detrás (ver lib/perfil.ts).
 */
export default function PanelPerfil({
  perfil,
  opciones,
  soloMiTalla,
  coincidencias,
  onCambiar,
  onSoloMiTalla,
  onBorrar,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

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

  const vacio = perfilVacio(perfil);
  // Resumen corto para el botón: "M · 42 · 43"
  const resumen = [perfil.arriba[0], perfil.pantalon[0], perfil.calzado[0]]
    .filter(Boolean)
    .join(" · ");

  function alternar(grupo: GrupoTalla, talla: string) {
    const actuales = perfil[grupo];
    const nuevas = actuales.includes(talla)
      ? actuales.filter((t) => t !== talla)
      : [...actuales, talla];
    onCambiar({ ...perfil, [grupo]: nuevas });
  }

  return (
    <div ref={contenedor} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className={`flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold transition ${
          vacio
            ? "border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-white"
            : "border-brand-500 bg-brand-500/10 text-brand-400"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        {vacio ? "Mis tallas" : resumen}
      </button>

      {abierto ? (
        <div data-panel="perfil" className="absolute right-0 top-[calc(100%+8px)] z-50 max-h-[75vh] w-[min(92vw,22rem)] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-4 text-left shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="font-display text-lg text-neutral-950 dark:text-white">Mis tallas</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">
            Dinos tus tallas una vez y te enseñamos solo lo que te queda bien y sigue con stock.
          </p>

          {GRUPOS.map(({ id, label, ayuda }) => {
            const disponibles = ordenarTallas(opciones[id]);
            if (!disponibles.length) return null;
            return (
              <div key={id} data-grupo={id} className="mt-4">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] font-bold text-neutral-950 dark:text-white">
                    {label}
                  </span>
                  {perfil[id].length ? (
                    <button
                      type="button"
                      onClick={() => onCambiar({ ...perfil, [id]: [] })}
                      className="text-[11px] font-semibold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                    >
                      quitar
                    </button>
                  ) : null}
                </div>
                <p className="mb-2 text-[11px] text-neutral-400">{ayuda}</p>
                <div className="flex flex-wrap gap-1.5">
                  {disponibles.map((t) => {
                    const puesta = perfil[id].includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={puesta}
                        onClick={() => alternar(id, t)}
                        className={`h-8 min-w-[2.25rem] rounded-lg border px-2 text-[12px] font-semibold transition ${
                          puesta
                            ? "border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-neutral-950"
                            : "border-neutral-300 text-neutral-600 hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-300"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <label
            className={`mt-5 flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 transition ${
              vacio
                ? "cursor-not-allowed border-neutral-200 opacity-50 dark:border-neutral-800"
                : "border-neutral-300 dark:border-neutral-700"
            }`}
          >
            <span>
              <span className="block text-[13px] font-bold text-neutral-950 dark:text-white">
                Ver solo mi talla
              </span>
              <span className="block text-[11px] text-neutral-500">
                {vacio
                  ? "Elige alguna talla para activarlo"
                  : `${coincidencias.toLocaleString("es-ES")} ofertas te valen`}
              </span>
            </span>
            <input
              type="checkbox"
              checked={soloMiTalla && !vacio}
              disabled={vacio}
              onChange={(e) => onSoloMiTalla(e.target.checked)}
              className="h-5 w-5 shrink-0 accent-brand-600"
            />
          </label>

          <p className="mt-4 border-t border-neutral-200 pt-3 text-[11px] leading-relaxed text-neutral-400 dark:border-neutral-800">
            Se guarda solo en este navegador, no se envía a ningún sitio. Pronto podrás crear una
            cuenta con tu correo para llevarte las tallas al móvil.
          </p>
          {!vacio ? (
            <button
              type="button"
              onClick={() => {
                onBorrar();
                setAbierto(false);
              }}
              className="mt-1 text-[11px] font-semibold text-neutral-400 hover:text-chollo"
            >
              Borrar mis tallas
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
