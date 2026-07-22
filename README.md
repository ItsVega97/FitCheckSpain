# FitCheckSpain

Web personal que recopila ofertas de ropa de varias tiendas, las cataloga en una
sola pantalla con filtros (tienda, descuento mínimo, búsqueda) y da un enlace
directo a cada producto.

## Cómo funciona

1. Un scraper (`scripts/scrape.ts`) visita las páginas de rebajas/outlet de
   cada tienda configurada, extrae producto + precio + precio original y
   calcula el % de descuento. El resultado se guarda en `data/deals.json`.
2. Una GitHub Action programada (`.github/workflows/scrape.yml`) ejecuta ese
   scraper **cada día a las 06:00 UTC** y commitea el JSON actualizado si hay
   cambios.
3. Vercel está conectado al repo, así que cada commit (incluidos los del bot)
   despliega la web automáticamente con las ofertas más recientes.
4. La web (Next.js) simplemente lee `data/deals.json` + `data/manual-deals.json`
   y los muestra en tarjetas con enlace directo (`productUrl`) a cada producto.

No hay base de datos: todo vive en JSON dentro del propio repo, así que el
proyecto es 100% gratuito (Vercel Hobby + GitHub Actions gratis).

## Tiendas incluidas

Estado verificado ejecutando el scraper de verdad en GitHub Actions (con
internet real, no simulado), última comprobación 22/07/2026:

| Tienda | Estado | Notas |
|---|---|---|
| ASOS | ✅ Automático | Sin protección anti-bot; lee el JSON de producto embebido en la página (`scripts/scrapers/asos.ts`) |
| Nike | ✅ Automático | Sin protección anti-bot; lee el `__NEXT_DATA__` estándar de Next.js (`scripts/scrapers/nike.ts`) |
| Puma | ✅ Automático | Sin protección anti-bot; lee el JSON-LD (`ItemList`/`Product`) estándar de la página de ofertas (`scripts/scrapers/puma.ts`). Solo trae el precio ya rebajado, no el precio original ni el % de descuento |
| H&M, Decathlon, Zalando, Adidas | ⚠️ Manual | Confirmado 403 (Akamai / Cloudflare) hasta en la portada, no solo en la página de rebajas |
| Zara, Bershka, Pull&Bear | ⚠️ Manual | Confirmado: sirven una página de redirección/verificación anti-bot (Akamai Bot Manager) en vez del contenido real |
| Mango | ⚠️ Manual | La portada carga, pero el listado de rebajas se renderiza con JavaScript en el cliente (Next.js); un fetch simple nunca ve productos aunque la URL sea correcta |
| Superdry, Skechers | ⚠️ Manual | HTTP 200 pero su JSON-LD solo trae `BreadcrumbList`/datos de organización, no el listado de productos; haría falta parsear las tarjetas HTML directamente |
| Privalia | ⚠️ Manual | Club de venta privada, el catálogo requiere login |

En resumen: **ASOS, Nike y Puma son scrapeables de forma fiable con
peticiones HTTP simples** (que es lo que un proyecto gratuito sin servidor
propio puede hacer) y se actualizan solos cada día. El resto usan
protección anti-bot de nivel empresarial (Akamai, Cloudflare) que bloquea
hasta la portada, renderizan el listado en el cliente vía JavaScript, o
exponen JSON-LD sin datos de producto — todo eso requeriría un navegador
headless con proxies residenciales para sortearse, lo cual queda fuera de
alcance de un scraper personal gratuito. Para esas tiendas, usa el añadido
manual: tarda 10 segundos por oferta y no depende de vencer ninguna
protección, porque es una única petición ocasional que haces tú, no un
rastreo repetido.

## Uso en local

```bash
npm install
npm run dev        # abre http://localhost:3000
```

Ejecutar el scraper a mano:

```bash
npm run scrape
```

Añadir una oferta manualmente (por ejemplo de Zara, Nike o cualquier tienda
que veas tú):

```bash
npm run add-deal -- https://www.zara.com/es/es/algun-producto.html zara 19.99 39.99
# npm run add-deal -- <url> [tienda] [precio] [precioOriginal]
```

Si no pasas precio, intenta detectarlo solo a partir de las etiquetas Open
Graph de la página; si no lo consigue, te lo pedirá.

## Desplegar en Vercel (gratis)

1. Sube este repo a GitHub (si aún no lo está) y haz merge de esta rama a tu
   rama por defecto (`main`) — **las GitHub Actions programadas
   (`schedule`) solo se disparan desde la rama por defecto del repo**, así
   que el scraper diario no arrancará hasta que este workflow exista en
   `main`.
2. Ve a [vercel.com](https://vercel.com), "Add New Project", importa este
   repositorio. Vercel detecta Next.js automáticamente, no hace falta
   configurar nada más.
3. Deploy. Cada vez que la Action actualice `data/deals.json`, Vercel
   redesplegará solo con ese nuevo commit.
4. No hace falta ninguna variable de entorno ni secreto adicional: la Action
   usa el `GITHUB_TOKEN` que GitHub genera automáticamente (con permiso de
   escritura ya configurado en el workflow).

Si prefieres no depender del cron diario de GitHub, también puedes lanzar la
Action a mano en cualquier momento desde la pestaña "Actions" del repo
("Run workflow").

## Arreglar un scraper roto

Cuando `data/scrape-log.json` (o los logs de la Action) muestren que una
tienda encontró 0 productos:

1. Abre la página de rebajas de esa tienda en el navegador.
2. Abre las herramientas de desarrollador (clic derecho → Inspeccionar) sobre
   una tarjeta de producto.
3. Busca la clase CSS que se repite en cada tarjeta (el `card` del
   selector) y las de título/imagen/precio/precio tachado dentro de ella.
4. Actualiza esos selectores en `scripts/scrapers/stores.config.ts` para esa
   tienda y ejecuta `npm run scrape` en local para comprobar que ahora sí
   encuentra productos.

## Nota legal

Este proyecto es para uso personal. Cada tienda tiene sus propias
condiciones de uso respecto al scraping; el scraper hace peticiones
puntuales y espaciadas (una vez al día) y respeta timeouts razonables, pero
sigue siendo responsabilidad tuya revisar los términos de cada sitio si vas
a darle un uso más intensivo.

## Estructura del proyecto

```
app/                    Next.js App Router (UI)
components/              DealCard, DealsGrid (filtros)
lib/                     tipos, lectura de datos, catálogo de tiendas
scripts/scrape.ts        scraper automático (usado por la GitHub Action)
scripts/add-deal.ts      CLI para añadir una oferta a mano
scripts/scrapers/        motor genérico + configuración por tienda
data/deals.json          ofertas detectadas automáticamente (se sobrescribe)
data/manual-deals.json   ofertas añadidas a mano (persistente)
data/scrape-log.json     estado de la última ejecución, por tienda
.github/workflows/       Action programada diaria
```
