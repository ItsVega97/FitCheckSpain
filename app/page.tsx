import Image from "next/image";
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
    <>
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:py-6">
          <div className="flex items-center">
            <h1 className="sr-only">FitCheckSpain</h1>
            <Image
              src="/logo-horizontal.png"
              alt="FitCheckSpain"
              width={700}
              height={132}
              priority
              className="h-10 w-auto rounded-md sm:h-12"
            />
          </div>
          <p className="mt-2 text-sm text-neutral-500 sm:text-base">
            Ofertas y descuentos de ropa recopilados automáticamente, con enlace directo al producto.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400">
            <span>Última actualización: {formatDate(log.lastRun)}</span>
            <span aria-hidden>·</span>
            <span>{deals.length} ofertas activas</span>
            {failedStores.length > 0 ? (
              <>
                <span aria-hidden>·</span>
                <span className="text-amber-600 dark:text-amber-500">
                  {failedStores.length} tienda(s) sin datos en la última pasada
                </span>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <DealsGrid deals={deals} />
      </main>
    </>
  );
}
