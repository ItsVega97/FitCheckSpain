/** Formato de fecha común a todas las páginas (portada y secciones). */
export function formatearFecha(iso: string): string {
  if (!iso) return "aún no";
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}
