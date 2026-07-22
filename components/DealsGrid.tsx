"use client";

import { useMemo, useState } from "react";
import type { Deal, StoreId } from "@/lib/types";
import { STORES } from "@/lib/stores";
import DealCard from "./DealCard";

type SortMode = "discount" | "price-asc" | "price-desc";

export default function DealsGrid({ deals }: { deals: Deal[] }) {
  const [query, setQuery] = useState("");
  const [activeStores, setActiveStores] = useState<Set<StoreId>>(new Set());
  const [minDiscount, setMinDiscount] = useState(0);
  const [sort, setSort] = useState<SortMode>("discount");

  const storesPresent = useMemo(() => {
    const ids = new Set(deals.map((d) => d.store));
    return STORES.filter((s) => ids.has(s.id));
  }, [deals]);

  function toggleStore(id: StoreId) {
    setActiveStores((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filtered = useMemo(() => {
    let result = deals.filter((d) => {
      if (activeStores.size > 0 && !activeStores.has(d.store)) return false;
      if ((d.discountPercent ?? 0) < minDiscount) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        if (!d.title.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      if (sort === "discount") return (b.discountPercent ?? 0) - (a.discountPercent ?? 0);
      if (sort === "price-asc") return (a.price ?? Infinity) - (b.price ?? Infinity);
      return (b.price ?? 0) - (a.price ?? 0);
    });

    return result;
  }, [deals, activeStores, minDiscount, query, sort]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 md:flex-row md:items-center md:justify-between">
        <input
          type="search"
          placeholder="Buscar prenda..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-neutral-700 md:max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-neutral-500">Descuento mín.</label>
          <select
            value={minDiscount}
            onChange={(e) => setMinDiscount(Number(e.target.value))}
            className="rounded-lg border border-neutral-300 bg-transparent px-2 py-2 text-sm dark:border-neutral-700"
          >
            {[0, 20, 30, 40, 50, 60, 70].map((v) => (
              <option key={v} value={v}>
                {v}%+
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="rounded-lg border border-neutral-300 bg-transparent px-2 py-2 text-sm dark:border-neutral-700"
          >
            <option value="discount">Mayor descuento</option>
            <option value="price-asc">Precio: menor a mayor</option>
            <option value="price-desc">Precio: mayor a menor</option>
          </select>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {storesPresent.map((s) => (
          <button
            key={s.id}
            onClick={() => toggleStore(s.id)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              activeStores.has(s.id)
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-neutral-300 text-neutral-600 hover:border-brand-500 dark:border-neutral-700 dark:text-neutral-300"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-neutral-500">
          No hay ofertas que coincidan con los filtros.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      )}
    </div>
  );
}
