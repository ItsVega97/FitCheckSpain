import type { MetadataRoute } from "next";
import { getAllDeals, getScrapeLog } from "@/lib/data";
import { categoriasDeLasOfertas, rutaCategoria, rutaTienda, tiendasDeLasOfertas } from "@/lib/slugs";
import { SITIO } from "@/lib/site";

export const revalidate = 3600;

/**
 * Sin sitemap, Google solo conoce las páginas a las que llega navegando.
 * Con él sabe desde el primer día que existen todas las categorías y
 * tiendas, y cuándo se actualizaron por última vez — que en esta web es
 * cada 4 horas, y eso le anima a volver más a menudo.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [deals, log] = await Promise.all([getAllDeals(), getScrapeLog()]);
  const actualizado = log.lastRun ? new Date(log.lastRun) : new Date();

  return [
    { url: `${SITIO}/`, lastModified: actualizado, changeFrequency: "daily", priority: 1 },
    ...categoriasDeLasOfertas(deals).map((c) => ({
      url: `${SITIO}${rutaCategoria(c)}`,
      lastModified: actualizado,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...tiendasDeLasOfertas(deals).map((t) => ({
      url: `${SITIO}${rutaTienda(t.name)}`,
      lastModified: actualizado,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}
