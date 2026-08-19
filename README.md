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
internet real, no simulado), última comprobación 19/08/2026:

| Tienda | Estado | Notas |
|---|---|---|
| ASOS | ✅ Automático | Sin protección anti-bot; lee el JSON de producto embebido en la página (`scripts/scrapers/asos.ts`) |
| Nike | ✅ Automático | Sin protección anti-bot; lee el `__NEXT_DATA__` estándar de Next.js (`scripts/scrapers/nike.ts`) |
| Puma | ✅ Automático | Sin protección anti-bot; lee el JSON-LD (`ItemList`/`Product`) estándar de la página de ofertas (`scripts/scrapers/puma.ts`). Solo trae el precio ya rebajado, no el precio original ni el % de descuento |
| Womensecret | ✅ Automático | El listado se pinta con JavaScript en el cliente y Akamai bloquea con 403 el fetch simple; el navegador headed (Playwright + Xvfb) lo esquiva. Cada tarjeta trae su propio JSON-LD (`scripts/scrapers/womensecret.ts`). Solo el precio ya rebajado |
| Mango | ✅ Automático | Akamai bloqueaba con 403 tanto el fetch simple como el navegador headless normal; en modo **headed** (con Xvfb) deja pasar la petición. Selectores cheerio sobre CSS Modules (`scripts/scrapers/mango.ts`). Solo precio ya rebajado, sin precio original ni % de descuento visibles en la tarjeta |
| Zalando | ✅ Automático | Akamai bloqueaba con 403 el fetch simple; en modo headed lo deja pasar. El grid usa CSS Modules con clases totalmente hasheadas sin ninguna palabra reconocible, así que el scraper navega por la estructura fija de cada tarjeta (`<article>` → `<h3>` con marca+nombre → `<section>` con el/los `<p>` de precio) en vez de por nombre de clase (`scripts/scrapers/zalando.ts`). Trae precio original y % de descuento cuando aplica |
| Desigual | ✅ Automático | Usa Salesforce Commerce Cloud (plantilla SFRA): cada tarjeta trae microdatos schema.org completos con precio actual y original en `<meta itemprop="price">` (`scripts/scrapers/desigual.ts`). Por ahora solo cubre la sección de rebajas de mujer |
| H&M, Adidas | ⚠️ Manual | Confirmado 403 de Akamai incluso con navegador headed **y** calentando la sesión (portada → aceptar cookies → navegar a rebajas como un usuario real, en vez de entrar directo por la URL). Como el bloqueo aparece ya en la portada con una sesión "humana", todo apunta a un bloqueo por reputación de IP del runner de GitHub Actions más que por el fingerprint del navegador — no viable sin proxies residenciales |
| Decathlon, The North Face, Vans, Timberland, New Balance | ⚠️ Manual | Confirmado 403/challenge (Akamai / Cloudflare) incluso con navegador headed |
| Zara | ⚠️ Manual (por ahora) | El bloqueo de red sí se esquiva con navegador headed (HTTP 200), pero la página dispara una verificación anti-bot silenciosa (`_sec/verify`) que deja el grid sin pintar. Expone una API propia (`/es/es/categories?...ajax=true`) pero solo devuelve el árbol de navegación del menú, no productos |
| Pull&Bear | ⚠️ Manual (por ahora) | El bloqueo de Akamai se esquiva con navegador headed (HTTP 200) y expone una API interna real (`itxrest/2/catalog/...`), pero es solo configuración de tienda. Se probaron varios endpoints de producto adivinados (`itxrest/.../category/{id}/product`) y todos devolvieron 404; navegar por el menú real tampoco reveló ninguna llamada de listado de productos |
| Bershka | ⚠️ Manual (por ahora) | El bloqueo de Akamai se esquiva con navegador headed, y expone un `window.__NUXT__` con el estado de la página, pero el listado de productos llega vacío en la carga inicial (se pide después vía API) — ni el DOM tras hacer scroll ni el `__NUXT__` inicial traen las tarjetas todavía |
| Stradivarius, Oysho, Massimo Dutti, C&A, Superdry, Skechers | ⚠️ Manual | HTTP 200 con navegador headed pero sin JSON-LD/`__NEXT_DATA__` de producto ni tarjetas reconocibles en la carga inicial; no investigado a fondo |
| Tommy Hilfiger, Calvin Klein, Camper, Guess, Pepe Jeans, Levi's, Springfield, Under Armour | ⚠️ Manual | HTTP 200/404 según la URL probada, algunas con `__NEXT_DATA__` presente pero sin el listado de productos localizable; falta dar con la URL de rebajas exacta y/o la clave correcta dentro del JSON |
| Converse | ⚠️ Manual | Carga bien con navegador headed pero los únicos enlaces de producto encontrados son de un carrusel de navegación, no del listado real |
| Privalia | ⚠️ Manual | Club de venta privada, el catálogo requiere login |

En resumen: **ASOS, Nike, Puma, Womensecret, Mango, Zalando y Desigual son
automáticas** (300+ ofertas). ASOS, Nike y Puma con peticiones HTTP
simples. Las otras cuatro necesitaban esquivar Akamai: el hallazgo clave
fue que Chromium en modo **headed** de verdad (con Xvfb como pantalla
virtual, no el modo headless normal) hace que Akamai deje pasar la
petición en varias de sus implementaciones — el scraper ya lanza el
navegador así solo cuando hace falta. Zalando en concreto tiene el grid
con clases CSS totalmente ofuscadas (sin ninguna palabra reconocible como
"price" o "tile"), así que su scraper no busca por nombre de clase sino
por la estructura fija de cada tarjeta — más frágil ante un rediseño de
la web, pero es lo único estable disponible. H&M, Decathlon, Adidas y
varias marcas deportivas siguen bloqueando incluso en modo headed; Zara y
Bershka esquivan el bloqueo pero todavía no rinden un listado de
productos extraíble con las técnicas probadas hasta ahora. Para todas las
tiendas pendientes, usa el añadido manual: tarda 10 segundos por oferta y
no depende de vencer ninguna protección, porque es una única petición
ocasional que haces tú, no un rastreo repetido.

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
