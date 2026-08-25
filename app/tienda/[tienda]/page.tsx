import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllDeals, getScrapeLog } from "@/lib/data";
import {
  categoriasDeLasOfertas,
  rutaCategoria,
  rutaTienda,
  slugify,
  tiendaDesdeSlug,
  tiendasDeLasOfertas,
} from "@/lib/slugs";
import Catalogo from "@/components/Catalogo";
import ListaDeOfertasJsonLd from "@/components/ListaDeOfertasJsonLd";
import { formatearFecha } from "@/lib/fechas";

export const revalidate = 3600;

interface Props {
  params: { tienda: string };
}

export async function generateStaticParams() {
  const deals = await getAllDeals();
  return tiendasDeLasOfertas(deals).map((t) => ({ tienda: slugify(t.name) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tienda = tiendaDesdeSlug(params.tienda);
  if (!tienda) return {};
  const deals = await getAllDeals();
  const suyas = deals.filter((d) => d.store === tienda.id);
  if (suyas.length === 0) return {};

  const titulo = `Rebajas de ${tienda.name} — ${suyas.length} ofertas hoy | FitCheckSpain`;
  const descripcion =
    `Todas las ofertas de ${tienda.name} rebajadas hoy, ordenadas por descuento ` +
    `y con enlace directo al producto. Se actualiza cada 4 horas.`;

  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: rutaTienda(tienda.name) },
    openGraph: { title: titulo, description: descripcion, type: "website" },
  };
}

export default async function PaginaTienda({ params }: Props) {
  const tienda = tiendaDesdeSlug(params.tienda);
  if (!tienda) notFound();

  const [deals, log] = await Promise.all([getAllDeals(), getScrapeLog()]);
  const suyas = deals.filter((d) => d.store === tienda.id);
  // Una tienda del catálogo que hoy no ha dado ofertas no debe dejar una
  // página vacía indexada.
  if (suyas.length === 0) notFound();

  const categorias = categoriasDeLasOfertas(suyas);
  const mejor = suyas.reduce((max, d) => Math.max(max, d.discountPercent ?? 0), 0);

  return (
    <>
      <ListaDeOfertasJsonLd nombre={`Rebajas de ${tienda.name}`} deals={suyas} />
      <Catalogo
        deals={suyas}
        lastRun={formatearFecha(log.lastRun)}
        failedStores={0}
        seccion={{
          titulo: `Rebajas de ${tienda.name}`,
          descripcion:
            `${suyas.length.toLocaleString("es-ES")} ofertas de ${tienda.name} ` +
            `repartidas en ${categorias.length} ` +
            `${categorias.length === 1 ? "categoría" : "categorías"}` +
            (mejor > 0 ? `, con descuentos de hasta el ${mejor}%` : "") +
            `. Se actualiza cada 4 horas.`,
          migas: [
            { href: "/", label: "Inicio" },
            { href: rutaTienda(tienda.name), label: tienda.name },
          ],
          relacionadas: {
            titulo: "Otras tiendas",
            items: tiendasDeLasOfertas(deals)
              .filter((t) => t.id !== tienda.id)
              .map((t) => ({ href: rutaTienda(t.name), label: t.name, total: t.total })),
          },
        }}
      />
      <nav
        aria-label="Categorías de esta tienda"
        className="mx-auto max-w-[1440px] px-4 pb-14 sm:px-10"
      >
        <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.1em] text-neutral-400">
          Categorías en {tienda.name}
        </h2>
        <div className="flex flex-wrap gap-2">
          {categorias.map((c) => (
            <a
              key={c}
              href={rutaCategoria(c)}
              className="rounded-full border border-neutral-300 px-3.5 py-2 text-[13px] text-neutral-600 transition hover:border-neutral-950 hover:text-neutral-950 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-white dark:hover:text-white"
            >
              {c}{" "}
              <span className="text-neutral-400">
                {suyas.filter((d) => d.category === c).length}
              </span>
            </a>
          ))}
        </div>
      </nav>
    </>
  );
}
