# Aldo's Motos — Frontend

Tienda pública (e-commerce **mobile-first**) + **panel de administración** para la venta de repuestos y accesorios de motos (líneas Enduro y Honda XR).

- **Clientes/operadores:** Estrella (administración, ventas y despachos) y Aldo (especialista técnico mecánico).
- **Objetivo:** vender 24/7 sin intervención, manteniendo el trato humano por WhatsApp para repuestos de alto valor o dudas técnicas.

> **Nota de monorepo:** este directorio convive con `/back` (el API en Cloudflare Workers), que ya está terminado y tiene su propia documentación en [`back/README.md`](../back/README.md). La intención es separarlos en dos repos independientes; este README es la documentación del repo del frontend y [`../README.md`](../README.md) la del monorepo completo.

---

## Probar en local (modo demo)

```bash
pnpm install
pnpm run dev   # http://localhost:4321
```

Sin backend (`/back`) todavía, la app funciona con datos de ejemplo:

- **Login del panel:** entra a `/admin/login` con **cualquier correo válido** y una
  **contraseña de 4+ caracteres** (ej. `contacto@dominio.cl` / `demo1234`). Es un login
  simulado; al conectar el Worker usa `/api/v1/admin/auth/login`.
- **Recorrido de compra:** portada → `/catalogo` (filtros) → ficha de producto →
  agregar al carrito → `/checkout` (Región→Comuna y envío) → confirmación. El pedido se
  **simula en el cliente** y genera un código `ALD-…`.
- **Seguimiento:** usa ese código en `/seguimiento` (o el enlace de la confirmación);
  se reconoce dentro de la misma sesión del navegador.
- **Panel:** `/admin` (indicadores), `/admin/pedidos`, `/admin/productos` (edición en
  línea + Excel), `/admin/motos`, `/admin/configuracion`.

⚠️ Estas credenciales y comportamientos son solo para desarrollo. Ver [`NOTAS.md`](./.opencode/NOTAS.md).

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | **Astro 5** (`output: 'server'`, `@astrojs/cloudflare`) |
| UI interactiva | **React 19** (islas `client:load` / `client:idle`) |
| Estilos | **Tailwind CSS v4** (vía `@tailwindcss/vite`) |
| Estado | **Nanostores** + `@nanostores/persistent` (carrito, "Mi Moto", sesión) |
| Iconos | Inline SVG / Lucide |
| Excel | **SheetJS (`xlsx`)** |
| Fotos | **browser-image-compression** (WebP en el navegador) |
| Deploy | **Cloudflare Pages** |

## Requisitos

- Node.js 20+ (probado con v22).
- **pnpm** — en este entorno `npm` está interceptado y ejecuta pnpm; usar `pnpm` / `pnpm exec` directamente.
- pnpm 11 requiere aprobar build scripts (`pnpm-workspace.yaml` → `allowBuilds`), ya configurado.

## Comandos

```bash
pnpm install     # instalar dependencias
pnpm run dev     # servidor de desarrollo en http://localhost:4321 (apunta al Worker en :8787)
pnpm run check   # verificación de tipos (TypeScript + Astro)
pnpm run build   # build de producción para Cloudflare Pages
pnpm run preview # previsualizar el build
```

## Rutas

**Tienda pública**
- `/` — portada (hero con buscador, líneas XR/Enduro, destacados, confianza/redes).
- `/catalogo` — catálogo filtrable por texto/SKU/OEM, categoría, marca→modelo→año, stock y orden.
- `/producto/[slug]` — ficha con galería, motos compatibles, envíos por región, JSON-LD y los 3 modos de venta.
- `/checkout` y `/checkout/confirmacion` — compra en 1 página y comprobante con código de seguimiento.
- `/seguimiento` — consulta de pedido por código (sin cuenta).
- `/nosotros` y `/politicas-envio-y-devoluciones` — páginas institucionales.
- `/sitemap.xml` (dinámico) y `/robots.txt`.

**Panel de Estrella**
- `/admin/login` — acceso.
- `/admin` — resumen del día (indicadores).
- `/admin/pedidos` — pestañas por estado, cambio en 1 clic, etiqueta imprimible y aviso por WhatsApp.
- `/admin/productos` — inventario editable tipo Excel + carga masiva `.xlsx`.
- `/admin/motos` — mantenedor de marcas y modelos.
- `/admin/configuracion` — tarifas de envío, datos bancarios y contacto.

## Estructura

```text
src/
├── layouts/       PublicLayout.astro · AdminLayout.astro
├── components/
│   ├── storefront/  BikeSelectorBar, CartButton, CartDrawer, CheckoutForm,
│   │                OrderConfirmationSummary, OrderTracker, ProductActions, ProductCard
│   └── admin/       AdminLogin, AdminGuard, OrdersDashboard, OrderDispatchModal,
│                    ProductsExcelTable, ProductFormModal, ExcelBatchModal,
│                    MotorcyclesManager, ShippingConfig
├── lib/
│   ├── api-client.ts      Cliente HTTP tipado a /api/v1 (envelope ok/data/meta y ok/error)
│   ├── formatters.ts      CLP, RUT, teléfono chileno, fechas
│   ├── chile-locations.ts 16 regiones + 346 comunas
│   ├── whatsapp.ts        Enlaces wa.me con mensajes pre-armados (sin IA)
│   ├── catalog.ts         Catálogo (API + respaldo local)
│   ├── catalog-seed.ts    Datos de ejemplo (modo demo)
│   ├── motorcycles.ts     Marcas/modelos + respaldo
│   ├── shipping.ts        Tarifas por región + respaldo
│   ├── tracking.ts        Seguimiento de pedidos
│   ├── admin.ts           Pedidos/estadísticas del panel (mock)
│   ├── admin-products.ts  Inventario del panel + import/export
│   ├── excel-helper.ts    Exportar/leer .xlsx y previsualizar cambios (SheetJS)
│   ├── image-compressor.ts Compresión a WebP
│   └── store-config.ts    Datos de tienda/banco/retiro (placeholders)
├── stores/        cart.store · bike-filter.store · auth.store
├── pages/         (rutas de la tabla de arriba)
└── styles/global.css
public/            favicon.svg · og-image.png · robots.txt
```

## Datos y modo demo

El backend (`/back`) **ya está terminado** ([documentación](../back/README.md)), pero **todavía no está conectado**: mientras se hace la integración, el frontend sigue usando **datos de ejemplo y flujos simulados**, con el patrón "intenta la API y, si falla, usa respaldo local". Apenas se levante el Worker y `PUBLIC_API_URL` apunte a él, el cambio es automático. La lista de ajustes para la integración está en [`NOTAS.md`](./.opencode/NOTAS.md).

> ⚠️ **Antes de desplegar a producción hay que reemplazar todo esto.** El detalle completo está en **[`NOTAS.md`](./.opencode/NOTAS.md)**.

## Variables de entorno

Copiar `.env.example` a `.env` y ajustar:

```bash
PUBLIC_API_URL=http://localhost:8787/api/v1   # URL base del Worker backend
PUBLIC_WHATSAPP_NUMBER=56912345678            # WhatsApp oficial (solo dígitos)
PUBLIC_STORE_EMAIL=contacto@dominio.cl
PUBLIC_STORE_NAME=Aldos Motos
```

## SEO y rendimiento

- Tarjetas de catálogo y fichas como **HTML renderizado en servidor** (SSR) con solo las islas necesarias hidratadas.
- **JSON-LD** `schema.org/Product` con precio CLP y disponibilidad (`InStock`/`OutOfStock`), más `AutoPartsStore` en `/nosotros`.
- **OpenGraph/Twitter** con canonical e imagen `public/og-image.png` (1200×630) para compartir en Instagram/WhatsApp/Facebook.
- **Sitemap** dinámico y `robots.txt` con las zonas privadas excluidas.

## Despliegue (Cloudflare Pages)

`astro.config.mjs` usa `output: 'server'` + el adaptador `@astrojs/cloudflare`, así que el sitio requiere el **Worker de Cloudflare** (falta crear la configuración de Wrangler/bindings — ver `.opencode/NOTAS.md`). Configurar las variables `PUBLIC_*` en el entorno de producción, con `PUBLIC_API_URL` apuntando al Worker desplegado.

## Documentación

- `.opencode/AGENTS.md` — arquitectura, UX/UI, convenciones y reglas de negocio del frontend.
- `.opencode/PLAN.md` — hoja de ruta por etapas/pasos (estado actual y criterios de logro).
- `.opencode/NOTAS.md` — **pendientes de integración con el backend y antes de desplegar**.
- `../README.md` — documentación general del monorepo (la tienda, el panel y la API juntos).
- `REQUERIMIENTOS.md` — requisitos de negocio (en la raíz del monorepo hasta la separación).
