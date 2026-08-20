"use client";

import { useState } from "react";
import type { Deal } from "@/lib/types";
import { storeMeta } from "@/lib/stores";
import { tallasDisponibles } from "@/lib/sizes";

/** A partir de aquí la insignia se pinta en rojo en vez de en verde. */
export const UMBRAL_CHOLLO = 70;

function formatPrice(value: number | null, currency: string) {
  if (value === null) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(value);
}

/** Silueta de prenda para cuando la tienda no da imagen o esta falla. */
function PlaceholderPrenda() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-800 dark:to-neutral-700">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.1}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-12 w-12 text-neutral-400 dark:text-neutral-600"
        aria-hidden="true"
      >
        <path d="M7 21V10L4 8.5 6.5 3h11L20 8.5 17 10v11z" />
        <path d="M9.5 3a2.5 2.5 0 0 0 5 0" />
      </svg>
    </div>
  );
}

export default function DealCard({ deal }: { deal: Deal }) {
  const store = storeMeta(deal.store);
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = deal.imageUrl && !imageFailed;

  // El <img> puede empezar a cargar (y fallar) antes de que React hidrate y
  // conecte onError, así que al montar el ref comprobamos si ya falló.
  function checkAlreadyFailed(img: HTMLImageElement | null) {
    if (img && img.complete && img.naturalWidth === 0) setImageFailed(true);
  }

  const descuento = deal.discountPercent;
  const esChollo = descuento !== null && descuento >= UMBRAL_CHOLLO;
  // Unas 350 ofertas (Mango, Puma, Womensecret, Cortefiel) no traen precio
  // original, así que no se puede calcular el ahorro: en vez de inventarlo,
  // la tarjeta lo dice y se sostiene sin tachado ni porcentaje.
  const ahorro =
    deal.originalPrice !== null && deal.price !== null ? deal.originalPrice - deal.price : null;

  // La frustración típica de las rebajas es encontrar el chollo y que no
  // quede tu talla, así que se dice antes de hacer clic. Solo las tiendas
  // Shopify publican tallas; en el resto no se pinta nada, que es distinto
  // de "no quedan".
  const disponibles = tallasDisponibles(deal.sizes);
  const agotado = deal.sizes !== undefined && deal.sizes.length > 0 && disponibles.length === 0;
  const soloUnica = disponibles.length === 1 && disponibles[0] === "Única";

  return (
    <a
      href={deal.productUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white transition duration-200 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-[0_12px_28px_rgba(10,10,10,0.14)] dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={checkAlreadyFailed}
            src={deal.imageUrl!}
            alt={deal.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <PlaceholderPrenda />
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
          {descuento !== null ? (
            <span
              className={`rounded-lg px-2.5 py-1 font-display text-base leading-none text-white shadow-sm ${
                esChollo ? "bg-chollo" : "bg-brand-600"
              }`}
            >
              -{descuento}%
            </span>
          ) : (
            <span className="rounded-lg bg-neutral-900/70 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm backdrop-blur-sm">
              En rebajas
            </span>
          )}
          <span
            className="max-w-[52%] truncate rounded-full px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm"
            style={{ backgroundColor: store.color }}
          >
            {store.name}
          </span>
        </div>

        {/* Aviso de que el enlace sale a la tienda, solo al pasar el ratón. */}
        <div className="pointer-events-none absolute inset-x-2.5 bottom-2.5 hidden items-center justify-center gap-1.5 rounded-xl bg-neutral-950/90 px-3 py-2.5 text-sm font-semibold text-white opacity-0 backdrop-blur-sm transition duration-200 group-hover:opacity-100 sm:flex">
          Ver en {store.name}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <path d="M7 17L17 7" />
            <path d="M9 7h8v8" />
          </svg>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        {deal.category ? (
          <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
            {deal.category}
            {deal.gender && deal.gender !== "unisex" ? ` · ${deal.gender}` : ""}
          </span>
        ) : null}
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-neutral-800 dark:text-neutral-100">
          {deal.title}
        </h3>
        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pt-2">
          <span className="font-display text-xl leading-none text-neutral-950 dark:text-white">
            {formatPrice(deal.price, deal.currency)}
          </span>
          {deal.originalPrice ? (
            <span className="text-sm text-neutral-400 line-through">
              {formatPrice(deal.originalPrice, deal.currency)}
            </span>
          ) : null}
        </div>
        {ahorro !== null && ahorro > 0 ? (
          <span className="text-xs font-semibold text-brand-600 dark:text-brand-500">
            Te ahorras {formatPrice(ahorro, deal.currency)}
          </span>
        ) : (
          <span className="text-xs text-neutral-400">Precio de rebajas en {store.name}</span>
        )}

        {agotado ? (
          <span className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
            Agotado
          </span>
        ) : soloUnica ? (
          <span className="mt-1.5 text-[11px] text-neutral-400">Talla única</span>
        ) : disponibles.length > 0 ? (
          <span className="mt-1.5 flex flex-wrap items-center gap-1" aria-label="Tallas disponibles">
            {disponibles.slice(0, 7).map((t) => (
              <span
                key={t}
                className="rounded border border-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-neutral-500 dark:border-neutral-700 dark:text-neutral-400"
              >
                {t}
              </span>
            ))}
            {disponibles.length > 7 ? (
              <span className="text-[10px] text-neutral-400">+{disponibles.length - 7}</span>
            ) : null}
          </span>
        ) : null}
      </div>
    </a>
  );
}
