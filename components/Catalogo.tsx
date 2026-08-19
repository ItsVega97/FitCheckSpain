"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { Deal, StoreId } from "@/lib/types";
import { STORES, storeMeta } from "@/lib/stores";
import {
  contarFiltrosActivos,
  cumpleFiltros,
  FILTROS_VACIOS,
  GENDER_LABELS,
  GENDER_ORDER,
  hayFiltrosActivos,
  ordenar,
  PRICE_BUCKETS,
  type Filtros,
  type Gender,
  type PriceBucketId,
  type SortMode,
} from "@/lib/filters";
import DealCard, { UMBRAL_CHOLLO } from "./DealCard";
import FilterSheet from "./FilterSheet";

/** Cuántas tarjetas se pintan de golpe: con 3.000 ofertas, todas a la vez van lentas. */
const POR_PAGINA = 60;

function formatPrice(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);
}

function IconoCategoria({ nombre, className }: { nombre: string; className?: string }) {
  const comun = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
  if (/calzado|zapat/i.test(nombre)) {
    return (
      <svg {...comun}>
        <path d="M3 17h13a4 4 0 0 0 4-4l-4-1-3-3-3 1H5a2 2 0 0 0-2 2z" />
        <path d="M8 10l1.5 2" />
      </svg>
    );
  }
  if (/vestido/i.test(nombre)) {
    return (
      <svg {...comun}>
        <path d="M9 3h6l-1 4 4 14H6L10 7z" />
        <path d="M9 3l3 3 3-3" />
      </svg>
    );
  }
  if (/pantal|falda/i.test(nombre)) {
    return (
      <svg {...comun}>
        <path d="M8 3h8l1 18h-5l-.5-9-.5 9H6z" />
      </svg>
    );
  }
  if (/bolso|accesorio/i.test(nombre)) {
    return (
      <svg {...comun}>
        <path d="M4 8h16l-1.2 12H5.2z" />
        <path d="M8.5 8V6a3.5 3.5 0 0 1 7 0v2" />
      </svg>
    );
  }
  if (/chaqueta|abrigo/i.test(nombre)) {
    return (
      <svg {...comun}>
        <path d="M6 21V8l-2-1 2-4h12l2 4-2 1v13z" />
        <path d="M12 4v17" />
      </svg>
    );
  }
  if (/camisa|blusa/i.test(nombre)) {
    return (
      <svg {...comun}>
        <path d="M7 21V9L4 7.5 7 3l5 3 5-3 3 4.5L17 9v12z" />
        <path d="M12 6v13" />
      </svg>
    );
  }
  if (/sudadera|jers/i.test(nombre)) {
    return (
      <svg {...comun}>
        <path d="M7 21V11L4 9l3-6h10l3 6-3 2v10z" />
        <path d="M9 3h6v3H9z" />
      </svg>
    );
  }
  if (/interior|ba[ñn]ador|playa/i.test(nombre)) {
    return (
      <svg {...comun}>
        <path d="M4 7h16l-2 5-6 8-6-8z" />
      </svg>
    );
  }
  return (
    <svg {...comun}>
      <path d="M7 21V10L4 8.5 6.5 3h11L20 8.5 17 10v11z" />
      <path d="M9.5 3a2.5 2.5 0 0 0 5 0" />
    </svg>
  );
}

function TarjetaDestacada({ deal }: { deal: Deal }) {
  const store = storeMeta(deal.store);
  const [imagenFallida, setImagenFallida] = useState(false);
  const ahorro =
    deal.originalPrice !== null && deal.price !== null ? deal.originalPrice - deal.price : null;
  const esChollo = deal.discountPercent !== null && deal.discountPercent >= UMBRAL_CHOLLO;
  const mostrarImagen = deal.imageUrl && !imagenFallida;

  return (
    <a
      href={deal.productUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 transition hover:border-neutral-700"
    >
      <div className="relative w-32 shrink-0 overflow-hidden bg-neutral-800 sm:w-44">
        {mostrarImagen ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            // Si la imagen ya falló antes de que React hidratara, el onError
            // no llega: se comprueba también al montar.
            ref={(img) => {
              if (img && img.complete && img.naturalWidth === 0) setImagenFallida(true);
            }}
            src={deal.imageUrl!}
            alt={deal.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
            onError={() => setImagenFallida(true)}
          />
        ) : (
          <div className="flex h-full min-h-[150px] w-full items-center justify-center">
            <IconoCategoria
              nombre={deal.category ?? ""}
              className="h-10 w-10 text-neutral-700 sm:h-12 sm:w-12"
            />
          </div>
        )}
        {deal.discountPercent !== null ? (
          <span
            className={`absolute left-2.5 top-2.5 rounded-lg px-2.5 py-1 font-display text-lg leading-none text-white ${
              esChollo ? "bg-chollo" : "bg-brand-600"
            }`}
          >
            -{deal.discountPercent}%
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4 sm:p-5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
          {store.name}
          {deal.category ? ` · ${deal.category}` : ""}
        </span>
        <span className="line-clamp-2 text-sm font-semibold leading-snug text-white sm:text-[15px]">
          {deal.title}
        </span>
        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-3">
          <span className="font-display text-2xl leading-none text-brand-500">
            {formatPrice(deal.price)}
          </span>
          {deal.originalPrice ? (
            <span className="text-sm text-neutral-500 line-through">
              {formatPrice(deal.originalPrice)}
            </span>
          ) : null}
        </div>
        {ahorro !== null && ahorro > 0 ? (
          <span className="text-xs font-semibold text-brand-500">
            Te ahorras {formatPrice(ahorro)}
          </span>
        ) : null}
      </div>
    </a>
  );
}

export default function Catalogo({
  deals,
  lastRun,
  failedStores,
}: {
  deals: Deal[];
  lastRun: string;
  failedStores: number;
}) {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);
  const [sort, setSort] = useState<SortMode>("discount");
  const [sheetAbierto, setSheetAbierto] = useState(false);
  const [visibles, setVisibles] = useState(POR_PAGINA);

  const destacados = useMemo(
    () =>
      deals
        .filter((d) => d.discountPercent !== null)
        .sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0))
        .slice(0, 3),
    [deals],
  );

  const tiendasDisponibles = useMemo(() => {
    const ids = new Set(deals.map((d) => d.store));
    const recuento = new Map<StoreId, number>();
    for (const d of deals) recuento.set(d.store, (recuento.get(d.store) ?? 0) + 1);
    return STORES.filter((s) => ids.has(s.id)).sort(
      (a, b) => (recuento.get(b.id) ?? 0) - (recuento.get(a.id) ?? 0),
    );
  }, [deals]);

  const recuentoTienda = useMemo(() => {
    const r: Record<string, number> = {};
    for (const d of deals) r[d.store] = (r[d.store] ?? 0) + 1;
    return r;
  }, [deals]);

  const recuentoCategoria = useMemo(() => {
    const r: Record<string, number> = {};
    for (const d of deals) if (d.category) r[d.category] = (r[d.category] ?? 0) + 1;
    return r;
  }, [deals]);

  const recuentoGenero = useMemo(() => {
    const r: Record<string, number> = {};
    for (const d of deals) if (d.gender) r[d.gender] = (r[d.gender] ?? 0) + 1;
    return r;
  }, [deals]);

  // Ordenadas por volumen: con un reparto tan desigual, el orden alfabético
  // escondería justo las categorías con más ofertas.
  const categoriasDisponibles = useMemo(
    () =>
      Object.keys(recuentoCategoria).sort(
        (a, b) => recuentoCategoria[b] - recuentoCategoria[a],
      ),
    [recuentoCategoria],
  );

  // "Otros" es el cajón de sastre del catalogador y resulta ser la categoría
  // más numerosa, así que se queda fuera de los accesos visuales (donde
  // ocuparía el primer sitio sin decir nada) pero sigue disponible como
  // filtro para quien lo busque.
  const categoriasDestacadas = useMemo(
    () => categoriasDisponibles.filter((c) => c !== "Otros").slice(0, 6),
    [categoriasDisponibles],
  );

  const generosDisponibles = useMemo(() => {
    const g = new Set(deals.map((d) => d.gender));
    return GENDER_ORDER.filter((x) => g.has(x));
  }, [deals]);

  const filtradas = useMemo(() => {
    const r = deals.filter((d) => cumpleFiltros(d, filtros));
    return ordenar(r, sort);
  }, [deals, filtros, sort]);

  const activos = contarFiltrosActivos(filtros);
  const conFiltros = hayFiltrosActivos(filtros);

  function actualizar(cambio: Partial<Filtros>) {
    setFiltros((prev) => ({ ...prev, ...cambio }));
    setVisibles(POR_PAGINA);
  }

  function alternar<T>(conjunto: Set<T>, valor: T): Set<T> {
    const s = new Set(conjunto);
    if (s.has(valor)) s.delete(valor);
    else s.add(valor);
    return s;
  }

  const limpiar = () => {
    setFiltros(FILTROS_VACIOS);
    setVisibles(POR_PAGINA);
  };

  return (
    <>
      {/* ================= CABECERA ================= */}
      <header className="bg-neutral-950">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3.5 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-8 sm:px-10 sm:py-0 sm:h-[76px]">
          <div className="flex items-center justify-between sm:justify-start">
            <h1 className="sr-only">FitCheckSpain</h1>
            <Image
              src="/logo-horizontal.png"
              alt="FitCheckSpain"
              width={700}
              height={132}
              priority
              className="h-7 w-auto sm:h-[34px]"
            />
            <span className="flex items-center gap-1.5 rounded-full bg-brand-500 px-3 py-1.5 sm:hidden">
              <span className="block h-1.5 w-1.5 rounded-full bg-neutral-950" />
              <span className="text-xs font-bold text-neutral-950">Hoy</span>
            </span>
          </div>

          <label className="flex h-11 flex-1 items-center gap-2.5 rounded-full border border-neutral-800 bg-neutral-900 px-4 sm:max-w-lg">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              className="h-[18px] w-[18px] shrink-0 text-neutral-500"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              type="search"
              value={filtros.query}
              onChange={(e) => actualizar({ query: e.target.value })}
              placeholder={`Buscar entre ${deals.length.toLocaleString("es-ES")} ofertas…`}
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-neutral-500"
            />
          </label>

          <span className="ml-auto hidden items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 sm:flex">
            <span className="block h-1.5 w-1.5 rounded-full bg-neutral-950" />
            <span className="text-[13px] font-bold text-neutral-950">Actualizado hoy</span>
          </span>
        </div>
      </header>

      {/* ================= HERO ================= */}
      {destacados.length > 0 ? (
        <section className="bg-neutral-950 px-4 pb-10 pt-6 sm:px-10 sm:pb-14 sm:pt-11">
          <div className="mx-auto max-w-[1440px]">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="block h-[3px] w-6 bg-brand-500 sm:w-7" />
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-500 sm:text-xs">
                Lo más rebajado ahora mismo
              </span>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
              <div className="max-w-xl">
                <h2 className="font-display text-4xl leading-[0.98] tracking-tight text-white sm:text-6xl">
                  Chollos del día
                </h2>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-neutral-400 sm:mt-4 sm:text-base">
                  Rastreamos {tiendasDisponibles.length} tiendas cada mañana y te dejamos arriba lo
                  que más ha bajado de precio.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:mt-7 sm:grid-cols-2 lg:grid-cols-3">
              {destacados.map((d) => (
                <TarjetaDestacada key={d.id} deal={d} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ================= FRANJA DE CONFIANZA ================= */}
      <div className="bg-brand-500 px-4 py-3 sm:px-10">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-center text-xs font-bold text-neutral-950 sm:gap-x-12 sm:text-sm">
          <span>{deals.length.toLocaleString("es-ES")} ofertas activas</span>
          <span className="hidden h-1 w-1 rounded-full bg-neutral-950/45 sm:block" />
          <span>{tiendasDisponibles.length} tiendas rastreadas</span>
          <span className="hidden h-1 w-1 rounded-full bg-neutral-950/45 sm:block" />
          <span>Precios revisados cada mañana</span>
          <span className="hidden h-1 w-1 rounded-full bg-neutral-950/45 lg:block" />
          <span className="hidden lg:inline">Enlace directo a la tienda</span>
        </div>
      </div>

      {/* ================= CATEGORÍAS ================= */}
      {categoriasDestacadas.length > 0 ? (
        <section className="mx-auto max-w-[1440px] px-4 pt-8 sm:px-10 sm:pt-10">
          <h2 className="mb-4 font-display text-xl tracking-tight text-neutral-950 dark:text-white sm:text-[26px]">
            Por categoría
          </h2>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-6">
            {categoriasDestacadas.map((c) => {
              const activa = filtros.categories.has(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => actualizar({ categories: alternar(filtros.categories, c) })}
                  className={`flex w-28 shrink-0 flex-col gap-3 rounded-2xl border p-4 text-left transition sm:w-auto sm:p-5 ${
                    activa
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                      : "border-neutral-200 bg-white text-neutral-950 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                  }`}
                >
                  <IconoCategoria nombre={c} className="h-6 w-6 sm:h-[30px] sm:w-[30px]" />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-bold leading-tight sm:text-[15px]">{c}</span>
                    <span
                      className={`text-[11px] sm:text-[13px] ${activa ? "opacity-60" : "text-neutral-400"}`}
                    >
                      {recuentoCategoria[c].toLocaleString("es-ES")} ofertas
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ================= BARRA DE FILTROS (pegajosa) ================= */}
      <div className="sticky top-0 z-30 mt-6 border-b border-neutral-200 bg-neutral-50/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
        <div className="mx-auto max-w-[1440px] px-4 py-3 sm:px-10">
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => setSheetAbierto(true)}
              className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-neutral-950 px-4 text-[13px] font-semibold text-white dark:bg-white dark:text-neutral-950"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                className="h-[15px] w-[15px]"
                aria-hidden="true"
              >
                <path d="M3 6h18" />
                <path d="M6 12h12" />
                <path d="M10 18h4" />
              </svg>
              Filtros
              {activos > 0 ? (
                <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-500 px-1 text-[11px] font-bold text-neutral-950">
                  {activos}
                </span>
              ) : null}
            </button>

            {generosDisponibles.map((g) => {
              const activo = filtros.genders.has(g);
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => actualizar({ genders: alternar(filtros.genders, g) })}
                  className={`h-11 shrink-0 rounded-full border px-4 text-[13px] font-medium transition ${
                    activo
                      ? "border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-neutral-950"
                      : "border-neutral-300 text-neutral-600 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  {GENDER_LABELS[g]}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => actualizar({ minDiscount: filtros.minDiscount === 50 ? 0 : 50 })}
              className={`h-11 shrink-0 rounded-full border px-4 text-[13px] font-semibold transition ${
                filtros.minDiscount === 50
                  ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-400"
                  : "border-neutral-300 text-neutral-600 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300"
              }`}
            >
              -50% o más
            </button>

            <div className="ml-auto flex shrink-0 items-center gap-3 pl-2">
              <span className="hidden text-[13px] text-neutral-500 lg:inline">
                <strong className="text-neutral-950 dark:text-white">
                  {filtradas.length.toLocaleString("es-ES")}
                </strong>{" "}
                de {deals.length.toLocaleString("es-ES")}
              </span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortMode)}
                className="h-11 rounded-xl border border-neutral-300 bg-white px-3 text-[13px] font-semibold text-neutral-800 outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              >
                <option value="discount">Mayor descuento</option>
                <option value="price-asc">Precio: menor a mayor</option>
                <option value="price-desc">Precio: mayor a menor</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ================= RESULTADOS ================= */}
      <main className="mx-auto max-w-[1440px] px-4 pb-14 pt-4 sm:px-10 sm:pt-6">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <p className="text-[13px] text-neutral-500">
            <strong className="text-neutral-950 dark:text-white">
              {filtradas.length.toLocaleString("es-ES")}
            </strong>{" "}
            {filtradas.length === 1 ? "oferta" : "ofertas"}
            {conFiltros ? ` de ${deals.length.toLocaleString("es-ES")}` : ""}
          </p>
          {conFiltros ? (
            <button
              type="button"
              onClick={limpiar}
              className="text-[13px] font-semibold text-brand-600 hover:underline dark:text-brand-500"
            >
              Limpiar filtros
            </button>
          ) : null}
        </div>

        {filtradas.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <p className="text-neutral-500">No hay ofertas que coincidan con los filtros.</p>
            {conFiltros ? (
              <button
                type="button"
                onClick={limpiar}
                className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:border-brand-500 hover:text-brand-600 dark:border-neutral-700 dark:text-neutral-300"
              >
                Limpiar filtros
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {filtradas.slice(0, visibles).map((deal) => (
                <DealCard key={deal.id} deal={deal} />
              ))}
            </div>
            {visibles < filtradas.length ? (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibles((v) => v + POR_PAGINA)}
                  className="rounded-2xl border border-neutral-300 px-7 py-3.5 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950 hover:bg-neutral-950 hover:text-white dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-white dark:hover:bg-white dark:hover:text-neutral-950"
                >
                  Ver más ofertas ({(filtradas.length - visibles).toLocaleString("es-ES")} restantes)
                </button>
              </div>
            ) : null}
          </>
        )}

        <p className="mt-12 text-center text-xs text-neutral-400">
          Última actualización: {lastRun}
          {failedStores > 0 ? ` · ${failedStores} tienda(s) sin datos en la última pasada` : ""}
        </p>
      </main>

      <FilterSheet
        abierto={sheetAbierto}
        onCerrar={() => setSheetAbierto(false)}
        filtros={filtros}
        resultados={filtradas.length}
        generosDisponibles={generosDisponibles}
        tiendasDisponibles={tiendasDisponibles}
        categoriasDisponibles={categoriasDisponibles}
        recuentoGenero={recuentoGenero}
        recuentoTienda={recuentoTienda}
        recuentoCategoria={recuentoCategoria}
        onToggleGenero={(g: Gender) => actualizar({ genders: alternar(filtros.genders, g) })}
        onToggleTienda={(s: StoreId) => actualizar({ stores: alternar(filtros.stores, s) })}
        onToggleCategoria={(c: string) => actualizar({ categories: alternar(filtros.categories, c) })}
        onToggleTramo={(b: PriceBucketId) => actualizar({ buckets: alternar(filtros.buckets, b) })}
        onMinDiscount={(v: number) => actualizar({ minDiscount: v })}
        onLimpiar={limpiar}
      />
    </>
  );
}
