import { createHash } from "node:crypto";
import { fetchHtml } from "./engine";
import { categorize, detectGender } from "./categorize";
import type { Deal } from "../../lib/types";

/**
 * Nike renderiza sus páginas de listado con Next.js y expone el estado
 * completo en el script estándar <script id="__NEXT_DATA__">, en JSON
 * válido (a diferencia de ASOS, aquí no hace falta ningún escaneo manual
 * de escapes: es un <script type="application/json"> normal).
 */
function extractNextData(html: string): unknown | null {
  const marker = '<script id="__NEXT_DATA__"';
  const start = html.indexOf(marker);
  if (start === -1) return null;
  const gt = html.indexOf(">", start);
  if (gt === -1) return null;
  const end = html.indexOf("</script>", gt);
  if (end === -1) return null;
  const jsonText = html.slice(gt + 1, end);
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

interface NikeProduct {
  copy?: { title?: string; subTitle?: string };
  prices?: {
    currency?: string;
    currentPrice?: number;
    initialPrice?: number;
    discountPercentage?: number;
  };
  colorwayImages?: { portraitURL?: string; squarishURL?: string };
  pdpUrl?: { url?: string };
  productType?: string;
}

function hashId(input: string): string {
  return createHash("sha256").update(input).digest("base64url").slice(0, 16);
}

const LISTING_URL = "https://www.nike.com/es/w/ofertas-3yaep";

export async function scrapeNike(): Promise<{ deals: Deal[]; cardsFound: number }> {
  const html = await fetchHtml(LISTING_URL);
  const data = extractNextData(html) as
    | {
        props?: {
          pageProps?: {
            initialState?: {
              Wall?: { productGroupings?: { products?: NikeProduct[] }[] };
            };
          };
        };
      }
    | null;

  const groupings = data?.props?.pageProps?.initialState?.Wall?.productGroupings ?? [];
  const products = groupings.flatMap((g) => g.products ?? []);
  if (products.length === 0) return { deals: [], cardsFound: 0 };

  const deals: Deal[] = [];
  for (const p of products) {
    const url = p.pdpUrl?.url;
    const current = p.prices?.currentPrice;
    const initial = p.prices?.initialPrice;
    if (!url || typeof current !== "number" || typeof initial !== "number") continue;
    if (initial <= current) continue;

    const discountPercent =
      typeof p.prices?.discountPercentage === "number"
        ? Math.round(p.prices.discountPercentage)
        : Math.round(((initial - current) / initial) * 100);

    const title = [p.copy?.title, p.copy?.subTitle].filter(Boolean).join(" - ");
    const category = p.productType === "FOOTWEAR" ? "Calzado" : categorize(title);

    deals.push({
      id: `nike-${hashId(url)}`,
      store: "nike",
      storeName: "Nike",
      title: title || "Producto sin título",
      imageUrl: p.colorwayImages?.portraitURL ?? p.colorwayImages?.squarishURL ?? null,
      productUrl: url,
      price: current,
      originalPrice: initial,
      discountPercent,
      currency: p.prices?.currency ?? "EUR",
      category,
      gender: detectGender(p.copy?.subTitle ?? ""),
      scrapedAt: new Date().toISOString(),
      source: "auto",
    });
  }

  return { deals, cardsFound: products.length };
}
