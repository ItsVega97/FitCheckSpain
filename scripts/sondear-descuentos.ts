/**
 * Comprueba si una tienda tiene ofertas de verdad, no solo catálogo.
 *
 * Es una pregunta distinta de "¿se pueden extraer los datos?". Una tienda
 * puede responder perfectamente y no servir para nada aquí si no marca
 * precio anterior: sin `compare_at_price` no hay descuento que calcular, y
 * el scraper de Shopify descarta el producto. Añadir una tienda así sumaría
 * cero ofertas.
 *
 *   npx tsx scripts/sondear-descuentos.ts
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

const SHOPIFY: [string, string][] = [
  ["silbon", "https://silbonshop.com"],
  ["ecoalf", "https://ecoalf.com"],
  ["nudeproject", "https://nudeproject.com"],
  // Controles: sabemos que estas sí tienen rebajas
  ["scalpers (control)", "https://scalperscompany.com"],
  ["pompeii (control)", "https://pompeiibrand.com"],
];

async function medirShopify(id: string, base: string) {
  let total = 0;
  let conDescuento = 0;
  const ejemplos: string[] = [];

  for (let page = 1; page <= 3; page++) {
    const r = await fetch(`${base}/products.json?limit=250&page=${page}&country=ES`, {
      headers: { "User-Agent": UA, "Accept-Language": "es-ES,es;q=0.9" },
      signal: AbortSignal.timeout(25000),
    });
    if (!r.ok) {
      console.log(`${id.padEnd(20)} HTTP ${r.status}`);
      return;
    }
    const d = (await r.json()) as {
      products?: { title?: string; variants?: { price?: string; compare_at_price?: string | null }[] }[];
    };
    const productos = d.products ?? [];
    if (!productos.length) break;

    for (const p of productos) {
      total++;
      const v = p.variants?.[0];
      const precio = Number(v?.price);
      const antes = v?.compare_at_price ? Number(v.compare_at_price) : null;
      if (antes && Number.isFinite(antes) && antes > precio) {
        conDescuento++;
        if (ejemplos.length < 3) {
          const pct = Math.round(((antes - precio) / antes) * 100);
          ejemplos.push(`${p.title?.slice(0, 28)} ${precio}€ (antes ${antes}€, -${pct}%)`);
        }
      }
    }
    if (productos.length < 250) break;
  }

  const pct = total ? Math.round((100 * conDescuento) / total) : 0;
  console.log(
    `${id.padEnd(20)} ${String(conDescuento).padStart(4)} de ${String(total).padStart(4)} con descuento (${pct}%)`,
  );
  for (const e of ejemplos) console.log(`${"".padEnd(22)}${e}`);
}

async function mirarShein() {
  console.log("\n########## Shein: ¿marca precio anterior?");
  const urls = [
    "https://es.shein.com/daily-new.html",
    "https://es.shein.com/RecommendSelection/Women-Clothing-sc-00255235.html",
  ];
  for (const url of urls) {
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": UA, "Accept-Language": "es-ES,es;q=0.9" },
        signal: AbortSignal.timeout(25000),
      });
      const html = await r.text();
      // Shein marca el precio tachado con retailPrice / discountPercent
      const retail = (html.match(/"retailPrice"/g) ?? []).length;
      const disc = (html.match(/"discountPercent"|"unit_discount"/g) ?? []).length;
      const sale = (html.match(/"salePrice"/g) ?? []).length;
      console.log(
        `  ${url.slice(0, 62).padEnd(64)} HTTP ${r.status}  retailPrice x${retail}  salePrice x${sale}  descuento x${disc}`,
      );
    } catch (e) {
      console.log(`  ${url.slice(0, 62)} error: ${e instanceof Error ? e.message : e}`);
    }
  }
}

async function main() {
  console.log("########## Shopify: cuántos productos llevan precio anterior\n");
  for (const [id, base] of SHOPIFY) await medirShopify(id, base);
  await mirarShein();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
