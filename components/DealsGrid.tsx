"use client";

import { useMemo, useState } from "react";
import type { Deal, StoreId } from "@/lib/types";
import { STORES } from "@/lib/stores";
import DealCard from "./DealCard";

type SortMode = "discount" | "price-asc" | "price-desc";

type Gender = "hombre" | "mujer" | "niños";
const GENDER_LABELS: Record<Gender, string> = { hombre: "Hombre", mujer: "Mujer", niños: "Niños" };
const GENDER_ORDER: Gender[] = ["mujer", "hombre", "niños"];

type PriceBucketId = "under10" | "10to25" | "25to50" | "50to100" | "over100";
const PRICE_BUCKETS: { id: PriceBucketId; label: string; min: number; max: number | null }[] = [
  { id: "under10", label: "Menos de 10€", min: 0, max: 10 },
  { id: "10to25", label: "10€ – 25€", min: 10, max: 25 },
  { id: "25to50", label: "25€ – 50€", min: 25, max: 50 },
  { id: "50to100", label: "50€ – 100€", min: 50, max: 100 },
  { id: "over100", label: "Más de 100€", min: 100, max: null },
];

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  variant = "brand",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  variant?: "brand" | "neutral";
}) {
  const activeClass =
    variant === "brand"
      ? "border-brand-600 bg-brand-600 text-white"
      : "border-neutral-800 bg-neutral-800 text-white dark:border-neutral-200 dark:bg-neutral-200 dark:text-neutral-900";
  const inactiveClass =
    variant === "brand"
      ? "border-neutral-300 text-neutral-600 hover:border-brand-500 dark:border-neutral-700 dark:text-neutral-300"
      : "border-neutral-200 text-neutral-500 hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-400";

  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${active ? activeClass : inactiveClass}`}
    >
      {children}
    </button>
  );
}

export default function DealsGrid({ deals }: { deals: Deal[] }) {
  const [query, setQuery] = useState("");
  const [activeStores, setActiveStores] = useState<Set<StoreId>>(new Set());
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
  const [activeGenders, setActiveGenders] = useState<Set<Gender>>(new Set());
  const [activePriceBuckets, setActivePriceBuckets] = useState<Set<PriceBucketId>>(new Set());
  const [minDiscount, setMinDiscount] = useState(0);
  const [sort, setSort] = useState<SortMode>("discount");

  const storesPresent = useMemo(() => {
    const ids = new Set(deals.map((d) => d.store));
    return STORES.filter((s) => ids.has(s.id));
  }, [deals]);

  const categoriesPresent = useMemo(() => {
    const cats = new Set(deals.map((d) => d.category).filter((c): c is string => Boolean(c)));
    return Array.from(cats).sort((a, b) => a.localeCompare(b, "es"));
  }, [deals]);

  const gendersPresent = useMemo(() => {
    const genders = new Set(deals.map((d) => d.gender));
    return GENDER_ORDER.filter((g) => genders.has(g));
  }, [deals]);

  function toggleStore(id: StoreId) {
    setActiveStores((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCategory(category: string) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  function toggleGender(gender: Gender) {
    setActiveGenders((prev) => {
      const next = new Set(prev);
      if (next.has(gender)) next.delete(gender);
      else next.add(gender);
      return next;
    });
  }

  function togglePriceBucket(id: PriceBucketId) {
    setActivePriceBuckets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filtered = useMemo(() => {
    let result = deals.filter((d) => {
      if (activeStores.size > 0 && !activeStores.has(d.store)) return false;
      if (activeCategories.size > 0 && !(d.category && activeCategories.has(d.category))) return false;
      if (
        activeGenders.size > 0 &&
        d.gender !== "unisex" &&
        !(d.gender && activeGenders.has(d.gender as Gender))
      )
        return false;
      if (activePriceBuckets.size > 0) {
        if (d.price === null) return false;
        const matchesBucket = PRICE_BUCKETS.some(
          (b) => activePriceBuckets.has(b.id) && d.price! >= b.min && (b.max === null || d.price! < b.max),
        );
        if (!matchesBucket) return false;
      }
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
  }, [deals, activeStores, activeCategories, activeGenders, activePriceBuckets, minDiscount, query, sort]);

  const hasActiveFilters =
    activeStores.size > 0 ||
    activeCategories.size > 0 ||
    activeGenders.size > 0 ||
    activePriceBuckets.size > 0 ||
    minDiscount > 0 ||
    query.trim() !== "";

  function clearFilters() {
    setQuery("");
    setActiveStores(new Set());
    setActiveGenders(new Set());
    setActiveCategories(new Set());
    setActivePriceBuckets(new Set());
    setMinDiscount(0);
  }

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-4 mb-5 border-b border-neutral-200 bg-neutral-50/95 px-4 py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95 sm:static sm:mx-0 sm:rounded-xl sm:border sm:bg-white sm:px-4 sm:py-4 sm:shadow-sm sm:dark:bg-neutral-900">
        <input
          type="search"
          placeholder="Buscar prenda..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-neutral-700 dark:bg-neutral-900 sm:max-w-xs"
        />

        <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
          <label className="flex items-center gap-2 text-sm text-neutral-500">
            <span className="hidden sm:inline">Descuento mín.</span>
            <select
              value={minDiscount}
              onChange={(e) => setMinDiscount(Number(e.target.value))}
              className="w-full rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 sm:w-auto"
            >
              {[0, 20, 30, 40, 50, 60, 70].map((v) => (
                <option key={v} value={v}>
                  {v === 0 ? "Cualquier descuento" : `${v}%+`}
                </option>
              ))}
            </select>
          </label>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="col-span-2 w-full rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 sm:col-span-1 sm:w-auto"
          >
            <option value="discount">Mayor descuento</option>
            <option value="price-asc">Precio: menor a mayor</option>
            <option value="price-desc">Precio: mayor a menor</option>
          </select>

          {hasActiveFilters ? (
            <button
              onClick={clearFilters}
              className="col-span-2 rounded-lg px-2 py-2 text-sm font-medium text-brand-600 hover:underline sm:col-span-1 sm:ml-auto"
            >
              Limpiar filtros
            </button>
          ) : null}
        </div>
      </div>

      <div className="mb-4 space-y-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 sm:p-5">
        {gendersPresent.length > 0 ? (
          <FilterGroup label="Género">
            {gendersPresent.map((g) => (
              <FilterChip key={g} active={activeGenders.has(g)} onClick={() => toggleGender(g)}>
                {GENDER_LABELS[g]}
              </FilterChip>
            ))}
          </FilterGroup>
        ) : null}

        <FilterGroup label="Marca">
          {storesPresent.map((s) => (
            <FilterChip key={s.id} active={activeStores.has(s.id)} onClick={() => toggleStore(s.id)}>
              {s.name}
            </FilterChip>
          ))}
        </FilterGroup>

        {categoriesPresent.length > 0 ? (
          <FilterGroup label="Categoría">
            {categoriesPresent.map((c) => (
              <FilterChip key={c} variant="neutral" active={activeCategories.has(c)} onClick={() => toggleCategory(c)}>
                {c}
              </FilterChip>
            ))}
          </FilterGroup>
        ) : null}

        <FilterGroup label="Precio">
          {PRICE_BUCKETS.map((b) => (
            <FilterChip key={b.id} active={activePriceBuckets.has(b.id)} onClick={() => togglePriceBucket(b.id)}>
              {b.label}
            </FilterChip>
          ))}
        </FilterGroup>
      </div>

      <p className="mb-3 text-xs text-neutral-400">
        {filtered.length} {filtered.length === 1 ? "oferta" : "ofertas"}
        {hasActiveFilters ? ` de ${deals.length}` : ""}
      </p>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-neutral-500">
          <p>No hay ofertas que coincidan con los filtros.</p>
          {hasActiveFilters ? (
            <button
              onClick={clearFilters}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:border-brand-500 hover:text-brand-600 dark:border-neutral-700 dark:text-neutral-300"
            >
              Limpiar filtros
            </button>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      )}
    </div>
  );
}
