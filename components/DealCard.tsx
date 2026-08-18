"use client";

import { useState } from "react";
import type { Deal } from "@/lib/types";
import { storeMeta } from "@/lib/stores";

function formatPrice(value: number | null, currency: string) {
  if (value === null) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(value);
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

  return (
    <a
      href={deal.productUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
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
          <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
            Sin imagen
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-between p-2">
          {deal.discountPercent ? (
            <span className="rounded-full bg-brand-600 px-2 py-1 text-xs font-bold text-white shadow">
              -{deal.discountPercent}%
            </span>
          ) : (
            <span />
          )}
          <span
            className="rounded-full px-2 py-1 text-xs font-semibold text-white shadow"
            style={{ backgroundColor: store.color }}
          >
            {store.name}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        {deal.category ? (
          <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
            {deal.category}
            {deal.gender ? ` · ${deal.gender}` : ""}
          </span>
        ) : null}
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-neutral-800 dark:text-neutral-100">
          {deal.title}
        </h3>
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="text-lg font-bold text-brand-600">
            {formatPrice(deal.price, deal.currency)}
          </span>
          {deal.originalPrice ? (
            <span className="text-sm text-neutral-400 line-through">
              {formatPrice(deal.originalPrice, deal.currency)}
            </span>
          ) : null}
        </div>
        {deal.source === "manual" ? (
          <span className="text-[11px] text-neutral-400">Añadido manualmente</span>
        ) : null}
      </div>
    </a>
  );
}
