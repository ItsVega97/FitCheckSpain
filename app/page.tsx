import { getAllDeals, getScrapeLog } from "@/lib/data";
import { formatearFecha } from "@/lib/fechas";
import Catalogo from "@/components/Catalogo";
import ListaDeOfertasJsonLd from "@/components/ListaDeOfertasJsonLd";

export const revalidate = 3600;

export default async function Home() {
  const [deals, log] = await Promise.all([getAllDeals(), getScrapeLog()]);
  const failedStores = log.stores.filter((s) => !s.ok).length;

  return (
    <>
      <ListaDeOfertasJsonLd nombre="Ofertas de ropa en tiendas españolas" deals={deals} />
      <Catalogo
        deals={deals}
        lastRun={formatearFecha(log.lastRun)}
        failedStores={failedStores}
      />
    </>
  );
}
