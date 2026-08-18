import fs from "node:fs/promises";
import path from "node:path";
import { STORE_CONFIGS } from "./scrapers/stores.config";
import { scrapeStore, type ScrapeOutcome } from "./scrapers/engine";
import { scrapeAsos } from "./scrapers/asos";
import { scrapeNike } from "./scrapers/nike";
import { scrapePuma } from "./scrapers/puma";
import { scrapeWomensecret } from "./scrapers/womensecret";
import { scrapeMango } from "./scrapers/mango";
import type { Deal, StoreId, StoreStatus } from "../lib/types";

const DATA_DIR = path.join(process.cwd(), "data");

const SPECIALIZED_SCRAPERS: Partial<Record<StoreId, () => Promise<ScrapeOutcome>>> = {
  asos: scrapeAsos,
  nike: scrapeNike,
  puma: scrapePuma,
  womensecret: scrapeWomensecret,
  mango: scrapeMango,
};

async function main() {
  const allDeals: Deal[] = [];
  const statuses: StoreStatus[] = [];
  const runTime = new Date().toISOString();

  for (const config of STORE_CONFIGS) {
    if (!config.enabled) {
      console.log(`[skip] ${config.name}: desactivado (${config.notes ?? "sin motivo"})`);
      continue;
    }

    console.log(`[scrape] ${config.name}...`);
    try {
      const specialized = SPECIALIZED_SCRAPERS[config.id];
      const { deals, cardsFound } = specialized ? await specialized() : await scrapeStore(config);
      allDeals.push(...deals);
      statuses.push({
        store: config.id,
        storeName: config.name,
        ok: true,
        dealsFound: deals.length,
        lastRun: runTime,
      });
      console.log(
        `[ok] ${config.name}: ${cardsFound} tarjetas vistas, ${deals.length} ofertas con descuento`,
      );
      if (cardsFound === 0) {
        console.warn(
          `[warn] ${config.name}: 0 tarjetas encontradas con el selector actual. Puede que el selector "${config.selectors.card}" esté desactualizado — revisa el README.`,
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[error] ${config.name}: ${message}`);
      statuses.push({
        store: config.id,
        storeName: config.name,
        ok: false,
        dealsFound: 0,
        lastRun: runTime,
        error: message,
      });
    }
  }

  // Salvaguarda: un id duplicado (aunque venga de una sola tienda) rompe la
  // key de React en la UI y provoca que el filtrado muestre tarjetas de
  // otra tienda. Cada scraper ya debería devolver ids únicos, pero esto
  // evita que un futuro bug de scraping se cuele hasta la web.
  const uniqueDeals = [...new Map(allDeals.map((d) => [d.id, d])).values()];
  if (uniqueDeals.length !== allDeals.length) {
    console.warn(
      `[warn] ${allDeals.length - uniqueDeals.length} oferta(s) con id duplicado descartadas antes de guardar.`,
    );
  }

  await fs.writeFile(
    path.join(DATA_DIR, "deals.json"),
    JSON.stringify(uniqueDeals, null, 2),
    "utf-8",
  );
  await fs.writeFile(
    path.join(DATA_DIR, "scrape-log.json"),
    JSON.stringify({ lastRun: runTime, stores: statuses }, null, 2),
    "utf-8",
  );

  console.log(`\nTotal: ${uniqueDeals.length} ofertas guardadas en data/deals.json`);
}

main().catch((err) => {
  console.error("Fallo general del scraper:", err);
  process.exit(1);
});
