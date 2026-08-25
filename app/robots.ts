import type { MetadataRoute } from "next";
import { SITIO } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /api/deals es el mismo catálogo en JSON: indexarlo no aporta nada y
      // competiría con las páginas de verdad.
      disallow: "/api/",
    },
    sitemap: `${SITIO}/sitemap.xml`,
  };
}
