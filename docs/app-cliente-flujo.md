# App del Cliente — Flujo y arquitectura

> Documento de referencia para el rediseño de UI basado en el bundle de Claude Design
> `app-client-elviz-studio` (tenant-admin + pantallas mobile de 5 templates).

## 1. Qué es

Cada tenant puede activar una **app web para sus clientes finales** (reservas, servicios,
historial) servida en `/c/[tenant]/...`. El staff (owner/admin) la configura desde
**Configuración → App del cliente** (`/t/[tenant]/settings/app-cliente`): activa el acceso,
elige un template visual, personaliza colores/textos/imágenes y comparte el enlace o QR.

## 2. Piezas del sistema

### Capa de datos (Supabase)

| Objeto | Rol |
|---|---|
| `tenants.client_app_enabled` | Flag global de acceso. Si es `false`, `/c/[tenant]` muestra aviso de "app no disponible". |
| `tenant_client_app_settings` | 1 fila por tenant: `template_slug`, `theme_mode`, `brand_name`, `logo_url`, `hero_image_url`, `welcome_title`, `welcome_subtitle`, `google_login_enabled`, `show_google_login_preview`, `custom_tokens` (overrides de color JSON), `custom_sections` (JSON, reservado). |
| RPC `get_public_client_app_settings(p_tenant_slug)` | Lectura pública (anon) de los settings para renderizar la app del cliente sin sesión. |

### Templates (código, no DB)

`src/features/client-app/templates/index.ts` define **5 templates** idénticos a los del
diseño (`beauty` Beauty Luxe, `dental` Dental Pure, `wellness` Wellness Serenity,
`barber` Barber Bold, `studio` Studio Modern). Cada uno trae:

- Paleta `light` + `dark` (bg, surface, surfaceAlt, fg, fgMuted, fgFaint, border,
  primary/primaryFg, accent/accentFg, success, shadow, shadowSoft)
- Pairing tipográfico (`fonts.display` / `fonts.body`) + Google Fonts
- Radios (`sm/md/lg/xl`) y densidad (`compact/comfortable/spacious`)
- `heroImage` por defecto

Funciones clave:

- `resolveClientAppTheme(settings)` → template + modo efectivo + tokens fusionados con
  `custom_tokens` del tenant.
- `getClientAppThemeStyle(settings)` → objeto CSSProperties con variables `--client-*`
  (y mapeo a las vars shadcn `--background`, `--primary`, etc.).
- `getClientAppFontHref()` → href único de Google Fonts con todas las familias.
- `normalizeClientAppOverrides(json)` → sanea `custom_tokens` (solo claves permitidas:
  `primary`, `accent`, `bg`, `surface`, `fg`, `surfaceAlt`, `fgMuted`).

### Capas de servicio / hooks / API

Patrón estándar de 3 capas del proyecto:

1. **Service** — `src/lib/services/client-app-settings.ts`
   - `getTenantSettings(tenantId)` → lectura staff vía `createBrowserSB()`.
   - `getPublicSettings(tenantSlug)` → RPC pública.
   - `updateTenantSettings(tenantId, payload)` → `PATCH /api/tenants/[id]/client-app`.
2. **Hooks SWR** — `src/hooks/supabase/use-client-app-settings.ts`
   - `useTenantClientAppSettings(tenantId)` (clave `tenant:client-app-settings:{id}`)
   - `usePublicClientAppSettings(tenantSlug)` (clave `public:client-app-settings:{slug}`)
3. **API route** — `src/app/api/tenants/[id]/client-app/route.ts` (PATCH)
   - Auth con `createServerSB()`, verifica membresía activa `owner|admin` en
     `tenant_users` y escribe con `supabaseAdmin` (bypass RLS).
   - Valida `template_slug` (enum de 5) y `theme_mode` (`light|dark|system`).
   - `client_app_enabled` actualiza `tenants`; el resto upsertea
     `tenant_client_app_settings` (onConflict `tenant_id`).
   - Nota: `google_login_enabled` siempre se guarda en `false` desde la UI (OAuth real
     pendiente); `show_google_login_preview` solo controla el botón visual en login.

Además: `GET /api/client/tenant-status?tenant=slug` → `{ tenant_id, name, slug, enabled,
settings }`. Lo usan tanto la página de settings (estado del toggle) como el layout
público `/c/[tenant]`.

## 3. Flujo de configuración (staff)

```
/t/[tenant]/settings  →  card "App del cliente"  →  /t/[tenant]/settings/app-cliente
        │
        ├─ GET /api/client/tenant-status ─────────── estado enabled (toggle)
        ├─ useTenantClientAppSettings(tenantId) ──── settings actuales (SWR)
        │
        ├─ El usuario edita en memoria (estado local `form`):
        │     template_slug · theme_mode · brand_name · logo_url · hero_image_url
        │     welcome_title · welcome_subtitle · show_google_login_preview
        │     custom_tokens { primary, accent, bg, surface, fg }
        │
        ├─ Preview en vivo: <ClientAppPreview settings={previewSettings} screen=... />
        │     (resolveClientAppTheme aplica template + overrides sin guardar)
        │
        ├─ "Aplicar a mi tenant" → clientAppSettingsService.updateTenantSettings
        │     → PATCH /api/tenants/[id]/client-app → upsert settings → mutate() SWR
        │
        └─ Toggle "App activa" → PATCH { client_app_enabled } → update tenants
```

Utilidades de compartir (solo frontend, sin backend):

- URLs: `{origin}/c/{slug}`, `/login`, `/register` con copy-to-clipboard.
- QR del home generado client-side con `qrcode` (descargable PNG).
- Share por WhatsApp (`wa.me` con mensaje prearmado).

Permisos: el toggle y el guardado se deshabilitan si `tenantUser.role` no es
`owner|admin` (y la API lo vuelve a validar server-side).

## 4. Flujo de consumo (cliente final)

```
/c/[tenant]/* (layout.tsx)
        │
        ├─ GET /api/client/tenant-status → enabled + settings
        │     enabled=false → pantalla "App no disponible" (Lock)
        │
        ├─ Aplica getClientAppThemeStyle(settings) al wrapper (vars --client-*)
        │     + <link> de Google Fonts (getClientAppFontHref)
        │
        ├─ Rutas públicas: /login /register /forgot-password /reset-password /verify-email
        ├─ Rutas privadas (requieren sesión + customer del tenant):
        │     /            → home (dashboard del cliente)
        │     /onboarding  → captura de datos post-registro
        │     /servicios, /servicios/[id]  → catálogo y detalle/booking
        │     /productos, /productos/[id]  → storefront ecommerce
        │     /historial, /historial/[id]  → citas pasadas
        │
        └─ <ClientBottomNav> — tab bar inferior
```

## 5. Rediseño aplicado (bundle `app-client-elviz-studio`)

El diseño valida los mismos 5 templates/paletas que ya existen en código (tokens 1:1).
Lo que cambia es la **UI del editor** y la **fidelidad del preview**:

### Pantalla de settings — layout "Tenant Admin" (3 zonas, full-bleed)

- **Top bar**: identidad de la pantalla + toggle de estado de la app + switch
  claro/oscuro del preview + botón "Vista de cliente →".
- **Rail izquierdo (~320px)**: heading "Aspecto y estilo" + 5 template cards con
  mini-preview (hero image + swatches de paleta), badge `ACTIVO` para el template
  guardado y borde acento para el seleccionado.
- **Centro**: lienzo con fondo de puntos (dot grid), segmented control de pantallas
  (Dashboard / Servicios / Booking / Éxito / Perfil), toggle device (móvil/tablet) y el
  teléfono enmarcado (radius 32, sombra profunda) con el preview en vivo.
- **Rail derecho (~300px)**: secciones apiladas y scrolleables:
  1. **Colores** — 5 tokens con color picker + hex + reset por token.
  2. **Branding** — nombre visible, logo, hero image, título y subtítulo (existente).
  3. **Login social** — switch del botón Google (preview).
  4. **Compartir** — enlaces + QR + WhatsApp (existente).
  5. CTA sticky-bottom: "Restablecer todo" + **"Aplicar a mi tenant"** (= guardar) +
     banner de confirmación `✓ aplicado`.

### Preview (`ClientAppPreview`) — pantallas fieles al prototipo

Cada pantalla replica el diseño con contenido mock por industria
(`src/features/client-app/preview-content.ts`, portado de `data.js` del bundle):

- **Dashboard**: status bar iOS, saludo + avatar + campana, hero "Próxima cita" con
  **layout distinto por template** (beauty full-bleed serif, dental panel + foto,
  wellness texto-first, barber stripe acento, studio split panel), categorías
  horizontales, favoritos (mini cards), recientes.
- **Servicios**: búsqueda, chips de categoría, grid 2-col (beauty/wellness) o
  list-rows (dental/barber/studio).
- **Booking**: hero del servicio, precio, pasos numerados (fecha → hora → especialista
  → notas) y CTA sticky "Reservar".
- **Éxito**: check ring animado, card resumen, botones .ics/compartir.
- **Perfil**: card de usuario, stats, preferencias, apariencia (dark toggle), logout.
- **Bottom nav** de 5 tabs (flotante; monolítica para barber).

### App pública `/c/[tenant]` — alineada al prototipo

Las pantallas reales del cliente final también se rediseñaron 1:1 con el prototipo:

- **Primitivas compartidas** — `src/components/client/themed.tsx`: `ClientThemeProvider`
  (expone settings + template activo vía `useClientTheme()`), `ClientCard`,
  `ClientButton`, `ClientChip`, `ClientField`, `ScreenHeader`, `StepHeader`,
  `SectionHeading`, `AuthHero`, `displayStyle` (fuente display + uppercase barber).
  El provider se monta en el layout (ramas pública y privada).
- **Bottom nav** — barra flotante con sombra y radius del template (monolítica y
  recta en barber); tabs Inicio / Servicios / Tienda / Historial / Perfil.
- **Login** — banda hero con imagen del template + titular display
  (`welcome_title`), campos con icono, CTA primaria, divider "o continúa con" y
  Google. **Register / Forgot / Reset** con la misma estética.
- **Onboarding** — wizard de 3 pasos con barra de progreso (nombre → contacto →
  preferencias), titulares display y chips de idioma.
- **Home** — saludo + avatar + campana con dot acento; hero "Próxima cita" con
  **variante por template** (beauty full-bleed serif, dental panel+foto, wellness
  texto-first, barber stripe acento, studio split); favoritos en mini-cards y
  recientes con icono check.
- **Servicios** — búsqueda, chips de categoría, grid 2-col (beauty/wellness) o
  filas (dental/barber/studio) vía `ServiceCard` variant.
- **Booking (`servicios/[id]`)** — hero full-bleed con back/corazón flotantes,
  título display + precio "desde", pasos numerados (1 fecha con **strip horizontal
  de 14 días**, 2 hora, 3 especialista con toggle + picker, 4 notas), CTA sticky
  "Reservar · HH:MM", confirmación themed y **pantalla de éxito** con check ring,
  card resumen y .ics.
- **Historial** — chips de estado + filtros avanzados plegables (servicio,
  especialista, fechas), cards con stripe primario para próximas; detalle themed.
- **Tienda (productos)** — grid 2-col con favorito, detalle con imagen full-bleed.
- **Perfil (nuevo)** — `/c/[tenant]/perfil` (la nav ya lo enlazaba y no existía):
  card de usuario, stats (citas/favoritos/idioma), accesos, preferencias y logout.

### Qué NO cambia

- Contratos de API, service, hooks, tablas y RPC quedan intactos.
- Validaciones de rol, guards de sesión y el comportamiento del toggle de acceso.
- Toda la lógica de booking real (disponibilidad, asignación automática del mejor
  evaluado, sucursales, notas, .ics) se preserva tal cual.

## 6. Archivos clave

| Archivo | Rol |
|---|---|
| `src/app/t/[tenant]/settings/app-cliente/page.tsx` | Editor (layout Tenant Admin) |
| `src/features/client-app/templates/index.ts` | Definición de templates + resolución de tema |
| `src/features/client-app/preview-content.ts` | Contenido mock por template para el preview |
| `src/features/client-app/components/client-app-preview.tsx` | Preview fiel del prototipo |
| `src/lib/services/client-app-settings.ts` | Service (lecturas + PATCH) |
| `src/hooks/supabase/use-client-app-settings.ts` | Hooks SWR |
| `src/app/api/tenants/[id]/client-app/route.ts` | PATCH settings/toggle (supabaseAdmin) |
| `src/app/api/client/tenant-status/route.ts` | Estado público del tenant |
| `src/app/c/[tenant]/layout.tsx` | Guard + theming de la app pública |
