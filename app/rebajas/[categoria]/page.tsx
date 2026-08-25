import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllDeals, getScrapeLog } from "@/lib/data";
import {
  categoriaDesdeSlug,
  categoriasDeLasOfertas,
  rutaCategoria,
  rutaTienda,
  slugify,
  tiendasDeLasOfertas,
} from "@/lib/slugs";
import Catalogo from "@/components/Catalogo";
import ListaDeOfertasJsonLd from "@/components/ListaDeOfertasJsonLd";
import { formatearFecha } from "@/lib/fechas";

export const revalidate = 3600;

interface Props {
  params: { categoria: string };
}

/**
 * Una página por categoría. La portada sirve para explorar, pero es una
 * sola URL: quien busca "rebajas de vestidos" en Google necesita que exista
 * una página que hable de vestidos y solo de vestidos.
 */
export async function generateStaticParams() {
  const deals = await getAllDeals();
  return categoriasDeLasOfertas(deals).map((c) => ({ categoria: slugify(c) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const deals = await getAllDeals();
  const categoria = categoriaDesdeSlug(deals, params.categoria);
  if (!categoria) return {};

  const total = deals.filter((d) => d.category === categoria).length;
  const titulo = `${categoria} en rebajas — ${total} ofertas | FitCheckSpain`;
  const descripcion =
    `${total} ofertas de ${categoria.toLowerCase()} rebajadas hoy en tiendas españolas, ` +
    `con el precio original y el descuento real. Se actualiza cada 4 horas.`;

  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: rutaCategoria(categoria) },
    openGraph: { title: titulo, description: descripcion, type: "website" },
  };
}

export default async function PaginaCategoria({ params }: Props) {
  const [deals, log] = await Promise.all([getAllDeals(), getScrapeLog()]);
  const categoria = categoriaDesdeSlug(deals, params.categoria);
  if (!categoria) notFound();

  const delaCategoria = deals.filter((d) => d.category === categoria);
  const tiendas = tiendasDeLasOfertas(delaCategoria);
  const mejor = delaCategoria.reduce(
    (max, d) => Math.max(max, d.discountPercent ?? 0),
    0,
  );

  return (
    <>
      <ListaDeOfertasJsonLd nombre={`${categoria} en rebajas`} deals={delaCategoria} />
      <Catalogo
        deals={delaCategoria}
        lastRun={formatearFecha(log.lastRun)}
        failedStores={log.stores.filter((s) => !s.ok).length}
        seccion={{
          titulo: `${categoria} en rebajas`,
          descripcion:
            `${delaCategoria.length.toLocaleString("es-ES")} ofertas de ` +
            `${categoria.toLowerCase()} en ${tiendas.length} ` +
            `${tiendas.length === 1 ? "tienda española" : "tiendas españolas"}` +
            (mejor > 0 ? `, con descuentos de hasta el ${mejor}%` : "") +
            `. Se actualiza cada 4 horas.`,
          migas: [
            { href: "/", label: "Inicio" },
            { href: rutaCategoria(categoria), label: categoria },
          ],
          relacionadas: {
            titulo: "Otras categorías",
            items: categoriasDeLasOfertas(deals)
              .filter((c) => c !== categoria)
              .map((c) => ({
                href: rutaCategoria(c),
                label: c,
                total: deals.filter((d) => d.category === c).length,
              })),
          },
        }}
      />
      {/* Enlaces a las tiendas que tienen esta categoría: cruzan los dos
          árboles de páginas para que ninguna quede aislada. */}
      <nav
        aria-label="Tiendas con esta categoría"
        className="mx-auto max-w-[1440px] px-4 pb-14 sm:px-10"
      >
        <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.1em] text-neutral-400">
          Tiendas con {categoria.toLowerCase()}
        </h2>
        <div className="flex flex-wrap gap-2">
          {tiendas.map((t) => (
            <a
              key={t.id}
              href={rutaTienda(t.name)}
              className="rounded-full border border-neutral-300 px-3.5 py-2 text-[13px] text-neutral-600 transition hover:border-neutral-950 hover:text-neutral-950 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-white dark:hover:text-white"
            >
              {t.name} <span className="text-neutral-400">{t.total}</span>
            </a>
          ))}
        </div>
      </nav>
    </>
  );
}
