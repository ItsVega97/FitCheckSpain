/**
 * URL pública del sitio. Hace falta absoluta para las etiquetas canónicas,
 * el sitemap y las de Open Graph: una ruta relativa no le sirve a Google ni
 * a quien previsualiza un enlace.
 *
 * Se configura con NEXT_PUBLIC_SITE_URL (en Vercel, Settings → Environment
 * Variables). Al apuntar el dominio propio hay que ponerlo ahí, o las
 * canónicas seguirán señalando al dominio de Vercel y Google indexará ese.
 */
export const SITIO = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://fit-check-spain.vercel.app"
).replace(/\/$/, "");
