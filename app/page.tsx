import { getAllDeals, getScrapeLog } from "@/lib/data";
import DealsGrid from "@/components/DealsGrid";

export const revalidate = 3600;

function formatDate(iso: string) {
  if (!iso) return "aún no";
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default async function Home() {
  const [deals, log] = await Promise.all([getAllDeals(), getScrapeLog()]);
  const failedStores = log.stores.filter((s) => !s.ok);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold sm:text-3xl">FitCheckSpain</h1>
        <p className="mt-1 text-neutral-500">
          Ofertas y descuentos de ropa recopilados automáticamente, con enlace directo al producto.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-neutral-400">
          <span>Última actualización: {formatDate(log.lastRun)}</span>
          <span>· {deals.length} ofertas activas</span>
          {failedStores.length > 0 ? (
            <span className="text-amber-600">
              · {failedStores.length} tienda(s) sin datos en la última pasada
            </span>
          ) : null}
        </div>
      </header>

      <DealsGrid deals={deals} />
    </main>
  );
}
