import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type { Deal, ScrapeLog } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, file), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function getAllDeals(): Promise<Deal[]> {
  const [auto, manual] = await Promise.all([
    readJson<Deal[]>("deals.json", []),
    readJson<Deal[]>("manual-deals.json", []),
  ]);
  // Un id duplicado rompe la key de React en la lista de tarjetas y hace
  // que el filtrado por tienda/categoría muestre tarjetas equivocadas.
  const merged = [...new Map([...manual, ...auto].map((d) => [d.id, d])).values()];
  merged.sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0));
  return merged;
}

export async function getScrapeLog(): Promise<ScrapeLog> {
  return readJson<ScrapeLog>("scrape-log.json", { lastRun: "", stores: [] });
}
