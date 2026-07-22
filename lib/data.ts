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
  const merged = [...manual, ...auto];
  merged.sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0));
  return merged;
}

export async function getScrapeLog(): Promise<ScrapeLog> {
  return readJson<ScrapeLog>("scrape-log.json", { lastRun: "", stores: [] });
}
