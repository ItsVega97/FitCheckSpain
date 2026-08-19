import { getAllDeals, getScrapeLog } from "@/lib/data";
import Catalogo from "@/components/Catalogo";

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
  const failedStores = log.stores.filter((s) => !s.ok).length;

  return <Catalogo deals={deals} lastRun={formatDate(log.lastRun)} failedStores={failedStores} />;
}
