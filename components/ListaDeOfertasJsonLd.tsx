import type { Deal } from "@/lib/types";

/**
 * Datos estructurados schema.org para que Google entienda que la página es
 * un listado de productos con precio, y pueda mostrar resultados
 * enriquecidos en vez de un enlace azul a secas.
 *
 * Se limita a las primeras ofertas porque el bloque va en el HTML y con
 * 3.000 productos pesaría más que la propia página; Google tampoco necesita
 * el catálogo entero para entender de qué va.
 */
const MAXIMO = 30;

export default function ListaDeOfertasJsonLd({
  nombre,
  deals,
}: {
  nombre: string;
  deals: Deal[];
}) {
  const items = deals.slice(0, MAXIMO).filter((d) => d.price !== null);
  if (items.length === 0) return null;

  const datos = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: nombre,
    numberOfItems: deals.length,
    itemListElement: items.map((d, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: d.title,
        ...(d.imageUrl ? { image: d.imageUrl } : {}),
        ...(d.category ? { category: d.category } : {}),
        brand: { "@type": "Brand", name: d.storeName },
        offers: {
          "@type": "Offer",
          url: d.productUrl,
          price: d.price,
          priceCurrency: d.currency,
          availability: "https://schema.org/InStock",
        },
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      // El JSON se genera aquí a partir de datos propios, no de entrada del
      // usuario; se escapa "<" igualmente por si un título trae etiquetas.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(datos).replace(/</g, "\\u003c") }}
    />
  );
}
