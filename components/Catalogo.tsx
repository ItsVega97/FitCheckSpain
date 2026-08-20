"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
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
import { ordenarTallas, tallasDisponibles } from "@/lib/sizes";
import { rutaCategoria } from "@/lib/slugs";
import DealCard, { UMBRAL_CHOLLO } from "./DealCard";
import FilterSheet from "./FilterSheet";
import MenuFiltro from "./MenuFiltro";

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

/**
 * Cabecera de las páginas de sección (`/rebajas/...`, `/tienda/...`).
 * Cuando viene, el catálogo se pinta en modo sección: sin carrusel de
 * chollos ni fichas de categoría —que son la portada— y con un H1 propio
 * que es lo que Google indexa.
 */
export interface Seccion {
  titulo: string;
  descripcion: string;
  migas: { href: string; label: string }[];
  /** Enlaces al resto de secciones, para que se puedan recorrer entre ellas. */
  relacionadas?: { titulo: string; items: { href: string; label: string; total: number }[] };
}

export default function Catalogo({
  deals,
  lastRun,
  failedStores,
  seccion,
}: {
  deals: Deal[];
  lastRun: string;
  failedStores: number;
  seccion?: Seccion;
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
        .slice(0, 12),
    [deals],
  );

  // El carrusel se desplaza de tarjeta en tarjeta midiendo la primera, así
  // el paso sigue siendo correcto si cambia el ancho por el punto de rotura.
  const carrusel = useRef<HTMLDivElement>(null);

  function deslizar(sentido: 1 | -1) {
    const cinta = carrusel.current;
    if (!cinta) return;
    const tarjeta = cinta.firstElementChild as HTMLElement | null;
    const paso = tarjeta ? tarjeta.offsetWidth + 16 : cinta.clientWidth * 0.8;
    cinta.scrollBy({ left: paso * sentido, behavior: "smooth" });
  }

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

  const recuentoBucket = useMemo(() => {
    const r: Record<string, number> = {};
    for (const d of deals) {
      if (d.price === null) continue;
      const b = PRICE_BUCKETS.find(
        (x) => d.price! >= x.min && (x.max === null || d.price! < x.max),
      );
      if (b) r[b.id] = (r[b.id] ?? 0) + 1;
    }
    return r;
  }, [deals]);

  // Solo se cuentan las tallas con stock: un filtro que ofreciera tallas
  // agotadas sería peor que no tenerlo.
  const recuentoTalla = useMemo(() => {
    const r: Record<string, number> = {};
    for (const d of deals) {
      for (const t of tallasDisponibles(d.sizes)) r[t] = (r[t] ?? 0) + 1;
    }
    return r;
  }, [deals]);

  // Las tallas raras de un solo producto ensucian el filtro sin aportar.
  const tallas = useMemo(
    () => ordenarTallas(Object.keys(recuentoTalla).filter((t) => recuentoTalla[t] >= 5)),
    [recuentoTalla],
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
            {/* En portada el logo es el H1; en las páginas de sección el H1
                es el título de la sección, así que aquí baja a enlace. */}
            {seccion ? null : <h1 className="sr-only">FitCheckSpain</h1>}
            <Link href="/" aria-label="FitCheckSpain, ir a la portada">
              <Image
                src="/logo-horizontal.png"
                alt="FitCheckSpain"
                width={700}
                height={132}
                priority
                className="h-7 w-auto sm:h-[34px]"
              />
            </Link>
            <div className="flex items-center gap-2.5 sm:hidden">
              <span className="text-xs font-semibold text-neutral-400">
                {tiendasDisponibles.length} tiendas
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-brand-500 px-3 py-1.5">
                <span className="block h-1.5 w-1.5 rounded-full bg-neutral-950" />
                <span className="text-xs font-bold text-neutral-950">Hoy</span>
              </span>
            </div>
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

          <div className="ml-auto hidden items-center gap-4 sm:flex">
            <span className="text-[13px] font-semibold text-neutral-400">
              {tiendasDisponibles.length} tiendas rastreadas
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2">
              <span className="block h-1.5 w-1.5 rounded-full bg-neutral-950" />
              <span className="text-[13px] font-bold text-neutral-950">Actualizado hoy</span>
            </span>
          </div>
        </div>
      </header>

      {/* ================= CABECERA DE SECCIÓN ================= */}
      {seccion ? (
        <section className="mx-auto max-w-[1440px] px-4 pb-1 pt-6 sm:px-10 sm:pt-9">
          <nav aria-label="Migas de pan" className="mb-3 flex flex-wrap items-center gap-1.5 text-[13px] text-neutral-500">
            {seccion.migas.map((m, i) => (
              <span key={m.href} className="flex items-center gap-1.5">
                {i > 0 ? <span aria-hidden="true">/</span> : null}
                <Link href={m.href} className="hover:text-neutral-900 hover:underline dark:hover:text-white">
                  {m.label}
                </Link>
              </span>
            ))}
          </nav>
          <h1 className="font-display text-3xl leading-tight tracking-tight text-neutral-950 dark:text-white sm:text-[44px]">
            {seccion.titulo}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-500 sm:text-base">
            {seccion.descripcion}
          </p>
        </section>
      ) : null}

      {/* ================= HERO ================= */}
      {!seccion && destacados.length > 0 ? (
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
                  Las {destacados.length} ofertas que más han bajado de precio hoy, de entre las{" "}
                  {tiendasDisponibles.length} tiendas que rastreamos cada pocas horas.
                </p>
              </div>

              {/* Flechas solo en escritorio: con dedo o trackpad se arrastra. */}
              <div className="hidden shrink-0 gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() => deslizar(-1)}
                  aria-label="Chollos anteriores"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-800 text-white transition hover:border-neutral-600 hover:bg-neutral-900"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="M15 6l-6 6 6 6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => deslizar(1)}
                  aria-label="Siguientes chollos"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-800 text-white transition hover:border-neutral-600 hover:bg-neutral-900"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Se sale del margen del contenedor para que las tarjetas
                mueran en el borde de la pantalla y se vea que hay más. */}
            <div
              ref={carrusel}
              // scroll-pl evita que el snap se coma el margen y deje la
              // primera tarjeta pegada al borde en vez de alineada con el
              // titular.
              className="sin-barra -mx-4 mt-6 flex snap-x snap-mandatory scroll-pl-4 gap-4 overflow-x-auto scroll-smooth px-4 pb-1 sm:-mx-10 sm:mt-7 sm:scroll-pl-10 sm:px-10"
            >
              {destacados.map((d) => (
                <div
                  key={d.id}
                  className="w-[300px] shrink-0 snap-start sm:w-[400px] lg:w-[420px]"
                >
                  <TarjetaDestacada deal={d} />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ================= CATEGORÍAS ================= */}
      {!seccion && categoriasDestacadas.length > 0 ? (
        <section className="mx-auto max-w-[1440px] px-4 pt-8 sm:px-10 sm:pt-10">
          <h2 className="mb-4 font-display text-xl tracking-tight text-neutral-950 dark:text-white sm:text-[26px]">
            Por categoría
          </h2>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-6">
            {/* Enlaces de verdad, no botones que filtran en el sitio: cada
                categoría tiene su propia página, que es lo que Google puede
                indexar y lo que se puede compartir por un enlace. */}
            {categoriasDestacadas.map((c) => (
              <Link
                key={c}
                href={rutaCategoria(c)}
                className="flex w-28 shrink-0 flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-left text-neutral-950 transition hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white sm:w-auto sm:p-5"
              >
                <IconoCategoria nombre={c} className="h-6 w-6 sm:h-[30px] sm:w-[30px]" />
                <span className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-bold leading-tight sm:text-[15px]">{c}</span>
                  <span className="text-[11px] text-neutral-400 sm:text-[13px]">
                    {recuentoCategoria[c].toLocaleString("es-ES")} ofertas
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* ================= BARRA DE FILTROS (pegajosa) ================= */}
      <div className="sticky top-0 z-30 mt-6 border-b border-neutral-200 bg-neutral-50/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
        <div className="mx-auto max-w-[1440px] px-4 py-3 sm:px-10">
          {/* En móvil la barra hace scroll lateral; a partir de sm envuelve,
              porque overflow recortaría los desplegables de marca y precio. */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible">
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

            {tallas.length > 0 ? (
              <div className="hidden sm:block">
                <MenuFiltro
                  titulo="Talla"
                  opciones={tallas.map((t) => ({ id: t, label: t, count: recuentoTalla[t] ?? 0 }))}
                  seleccion={filtros.sizes}
                  onToggle={(id) => actualizar({ sizes: alternar(filtros.sizes, id) })}
                  onLimpiar={() => actualizar({ sizes: new Set() })}
                />
              </div>
            ) : null}

            {/* Marca y precio también están en el panel de filtros, pero son
                los dos que más se usan y ahí no se ven sin abrirlo. En móvil
                se dejan solo en el panel para no llenar la barra. */}
            <div className="hidden sm:block">
              <MenuFiltro
                titulo="Marca"
                opciones={tiendasDisponibles.map((s) => ({
                  id: s.id,
                  label: s.name,
                  count: recuentoTienda[s.id] ?? 0,
                }))}
                seleccion={filtros.stores as Set<string>}
                onToggle={(id) => actualizar({ stores: alternar(filtros.stores, id as StoreId) })}
                onLimpiar={() => actualizar({ stores: new Set() })}
              />
            </div>

            <div className="hidden sm:block">
              <MenuFiltro
                titulo="Precio"
                opciones={PRICE_BUCKETS.map((b) => ({
                  id: b.id,
                  label: b.label,
                  count: recuentoBucket[b.id] ?? 0,
                }))}
                seleccion={filtros.buckets as Set<string>}
                onToggle={(id) =>
                  actualizar({ buckets: alternar(filtros.buckets, id as PriceBucketId) })
                }
                onLimpiar={() => actualizar({ buckets: new Set() })}
              />
            </div>

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

        {/* Enlaces entre secciones: le dan a Google un camino para llegar a
            todas las páginas y al visitante una forma de seguir mirando. */}
        {seccion?.relacionadas ? (
          <nav className="mt-14 border-t border-neutral-200 pt-8 dark:border-neutral-800">
            <h2 className="mb-4 text-[13px] font-bold uppercase tracking-[0.1em] text-neutral-400">
              {seccion.relacionadas.titulo}
            </h2>
            <div className="flex flex-wrap gap-2">
              {seccion.relacionadas.items.map((r) => (
                <Link
                  key={r.href}
                  href={r.href}
                  className="rounded-full border border-neutral-300 px-3.5 py-2 text-[13px] text-neutral-600 transition hover:border-neutral-950 hover:text-neutral-950 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-white dark:hover:text-white"
                >
                  {r.label}{" "}
                  <span className="text-neutral-400">{r.total.toLocaleString("es-ES")}</span>
                </Link>
              ))}
            </div>
          </nav>
        ) : null}

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
        tallas={tallas}
        recuentoTalla={recuentoTalla}
        onToggleTalla={(t) => actualizar({ sizes: alternar(filtros.sizes, t) })}
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
