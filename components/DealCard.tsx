import type { Deal } from "@/lib/types";
import { storeMeta } from "@/lib/stores";

function formatPrice(value: number | null, currency: string) {
  if (value === null) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(value);
}

export default function DealCard({ deal }: { deal: Deal }) {
  const store = storeMeta(deal.store);

  return (
    <a
      href={deal.productUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
        {deal.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={deal.imageUrl}
            alt={deal.title}
            className="h-full w-full object-cover transition group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
            Sin imagen
          </div>
        )}
        {deal.discountPercent ? (
          <span className="absolute left-2 top-2 rounded-full bg-brand-600 px-2 py-1 text-xs font-bold text-white shadow">
            -{deal.discountPercent}%
          </span>
        ) : null}
        <span
          className="absolute right-2 top-2 rounded-full px-2 py-1 text-xs font-semibold text-white shadow"
          style={{ backgroundColor: store.color }}
        >
          {store.name}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        {deal.category ? (
          <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
            {deal.category}
            {deal.gender ? ` · ${deal.gender}` : ""}
          </span>
        ) : null}
        <h3 className="line-clamp-2 text-sm font-medium text-neutral-800 dark:text-neutral-100">
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
