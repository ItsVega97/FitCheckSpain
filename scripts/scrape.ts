import fs from "node:fs/promises";
import path from "node:path";
import { STORE_CONFIGS } from "./scrapers/stores.config";
import { scrapeStore } from "./scrapers/engine";
import type { Deal, StoreStatus } from "../lib/types";

const DATA_DIR = path.join(process.cwd(), "data");

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
      const { deals, cardsFound } = await scrapeStore(config);
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

  await fs.writeFile(
    path.join(DATA_DIR, "deals.json"),
    JSON.stringify(allDeals, null, 2),
    "utf-8",
  );
  await fs.writeFile(
    path.join(DATA_DIR, "scrape-log.json"),
    JSON.stringify({ lastRun: runTime, stores: statuses }, null, 2),
    "utf-8",
  );

  console.log(`\nTotal: ${allDeals.length} ofertas guardadas en data/deals.json`);
}

main().catch((err) => {
  console.error("Fallo general del scraper:", err);
  process.exit(1);
});
