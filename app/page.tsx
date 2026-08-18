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
          <div className="flex items-center gap-2.5">
            <svg
              viewBox="0 0 64 64"
              className="h-9 w-9 shrink-0 sm:h-10 sm:w-10"
              aria-hidden="true"
            >
              <rect width="64" height="64" rx="14" fill="#0a0a0a" />
              <path
                d="M32 13c-3.6 0-6.4 2.6-6.4 5.8 0 3 2.5 5.4 5.7 5.7"
                fill="none"
                stroke="#fff"
                strokeWidth="3.4"
                strokeLinecap="round"
              />
              <path d="M32 24.5 32 29" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
              <path
                d="M13 43 32 29 51 43"
                fill="none"
                stroke="#fff"
                strokeWidth="3.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M13 43 9 47" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
              <path d="M51 43 55 47" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
              <path
                d="M20.5 39 29.5 48 47.5 21"
                fill="none"
                stroke="#93cc3d"
                strokeWidth="5.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
              Fit<span className="text-brand-600">Check</span>
              <span className="text-neutral-400 dark:text-neutral-500">Spain</span>
            </h1>
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
