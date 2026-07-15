# Spec: Recovery de contraseña + Magic Link (3 superficies de auth)

**Fecha:** 2026-07-12
**Rama:** feat/campanas-segmentacion-dashboard (o rama nueva dedicada)
**Estado:** Diseño aprobado → pendiente plan de implementación

## Objetivo

Habilitar dos flujos de autenticación en las tres superficies de login del producto:

1. **Recovery de contraseña** ("¿Olvidaste tu contraseña?") — enviar email con enlace, aterrizar en pantalla para definir contraseña nueva.
2. **Magic link** (login sin contraseña / passwordless) — enviar email con enlace de acceso directo, restringido a cuentas ya existentes.

Superficies:
- **Admin global** — rutas raíz (`/login`, tabla `global_users`)
- **Tenant** — staff/admin/especialista (`/t/[slug]/login`, tabla `tenant_users`; especialistas = `profiles.is_specialist=true` con membresía en `tenant_users`)
- **Cliente final** — usuarios en general (`/c/[slug]/login`, tabla `customers`)

## Contexto y hallazgos

Las tres superficies comparten un único `auth.users` de Supabase. La distinción de "tipo de usuario" es la tabla de aplicación a la que pertenece el `auth_user_id`; el destino post-login depende de la superficie. La verificación de pertenencia ya vive en los layouts / funciones `hydrateGlobal` / `hydrateTenant` (`src/lib/services/auth.ts`).

Recovery y magic link son **features nativas de Supabase Auth**: NO requieren cambios de esquema en la base de datos. La única configuración del lado de Supabase es el allowlist de Redirect URLs (y opcionalmente plantillas de email).

Estado actual por superficie:

| Superficie | Login | Forgot-password | Reset-password | Magic link |
|---|---|---|---|---|
| Admin global (`/login`) | ✅ | ❌ enlaza a `/forgot-password` inexistente | ❌ | ❌ |
| Tenant (`/t/[slug]/login`) | ✅ | ❌ enlaza a `/t/[slug]/forgot-password` inexistente | ❌ | ❌ |
| Cliente (`/c/[slug]/...`) | ✅ | ✅ funciona | ✅ funciona | ❌ |

El callback server-side `/auth/callback` ya existe y hace `exchangeCodeForSession(code)` de forma genérica, soporta `?next=` (destino final) y `?tenant=<slug>` (vincula customer). Está en `AUTH_PUBLIC_PREFIXES` del middleware. El flujo de recovery del cliente NO pasa por el callback (redirige directo a `/c/[slug]/reset-password` y confía en `detectSessionInUrl` del browser client) — **se mantiene tal cual porque ya funciona**.

## Decisiones de diseño (aprobadas)

1. **Magic link UX** → toggle en la misma página de login ("Contraseña" ⇄ "Enlace mágico").
2. **Alcance magic link** → las 3 superficies, restringido a cuentas existentes (`shouldCreateUser: false`).
3. **Config Supabase** → se configura vía CLI/Management API de forma quirúrgica, confirmando antes de aplicar. Dominio prod: `https://book-now-hub.vercel.app`.
4. **Especialistas** → cubiertos por el flujo del tenant (no hay ruta separada).
5. **Cliente** → conserva su flujo de recovery actual; solo se le agrega magic link.

## Arquitectura

### Capa de servicios (extender, no crear nuevos)

**`src/lib/services/auth.ts`** (`authService`, usado por admin y tenant) — agregar:
- `requestPasswordReset(email: string, redirectTo: string)` → `supabase.auth.resetPasswordForEmail(email, { redirectTo })`
- `updatePassword(newPassword: string)` → `supabase.auth.updateUser({ password: newPassword })`
- `sendMagicLink(email: string, emailRedirectTo: string)` → `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo, shouldCreateUser: false } })`

**`src/lib/services/client-auth.ts`** (`clientAuthService`) — ya tiene `requestPasswordReset` y `updatePassword`; agregar:
- `sendMagicLink(email: string, emailRedirectTo: string)` → mismo patrón con `shouldCreateUser: false`.

**`src/lib/validations/auth.ts`** — reutilizar `forgotPasswordSchema` (ya existe); agregar:
- `resetPasswordSchema` = `{ password: string min 8, confirmPassword: string }` con `.refine` de coincidencia (mensaje "Las contraseñas no coinciden").

### Flujo de redirección

Emails de **admin/tenant** pasan por `/auth/callback` (exchange server-side probado) con `?next=`:

| Flujo | `redirectTo` del email | Destino tras autenticar |
|---|---|---|
| Admin recovery | `<origin>/auth/callback?next=/reset-password` | pantalla reset → `/tenants` |
| Tenant recovery | `<origin>/auth/callback?next=/t/<slug>/reset-password` | pantalla reset → `/t/<slug>/login` |
| Admin magic link | `<origin>/auth/callback?next=/tenants` | `/tenants` (layout verifica global admin) |
| Tenant magic link | `<origin>/auth/callback?next=/t/<slug>/dashboard` | `/t/<slug>/dashboard` (layout verifica membresía) |
| Cliente recovery | `<origin>/c/<slug>/reset-password` (patrón actual, sin cambios) | `/c/<slug>` |
| Cliente magic link | `<origin>/auth/callback?tenant=<slug>&next=/c/<slug>` | `/c/<slug>` |

`origin` = `window.location.origin` en el submit (ya es el patrón usado por el cliente).

Nota de seguridad: un magic link autentica cualquier `auth.user` existente. Si alguien lo usa en una superficie a la que no pertenece (p.ej. un customer en el login del tenant), autentica pero falla la verificación de pertenencia en el layout → cae en el aviso "sesión sin acceso" ya existente. Comportamiento aceptable.

### Middleware (`src/middleware.ts`)

Agregar `/reset-password` a las listas de rutas públicas donde hoy solo está `/forgot-password`:
- `ADMIN_ROUTES` → agregar `"/reset-password"`
- `adminAuthPaths` (dentro de la sección admin) → agregar `"/reset-password"`
- `tenantPublicPaths` → agregar `"/reset-password"`

El cliente ya incluye ambas. El magic link no requiere rutas nuevas (se dispara desde el propio login).

### UI

**Toggle en cada login** ("Contraseña" ⇄ "Enlace mágico"), respetando el estilo de cada superficie:
- Admin/Tenant: componentes shadcn (`Card`, `Input`, `Button`, `Label`).
- Cliente: componentes `Client*` themed (`ClientButton`, `ClientField`, `clientInputClass`).

En modo "Enlace mágico": campo email + botón "Enviar enlace". Estado enviado con mensaje neutro: **"Si la cuenta existe, recibirás un correo en breve."** (no revelar si el email existe).

**Páginas nuevas** (replican el look del login de su superficie):
- `src/app/(root)/forgot-password/page.tsx` — form email → `authService.requestPasswordReset`.
- `src/app/(root)/reset-password/page.tsx` — form password + confirm → `authService.updatePassword` → redirect `/tenants` (el layout de `/tenants` verifica global admin y, si no lo es, reenvía a `/login`).
- `src/app/t/[tenant]/forgot-password/page.tsx` — análogo, redirectTo con `?next=/t/<slug>/reset-password`.
- `src/app/t/[tenant]/reset-password/page.tsx` — análogo → redirect `/t/<slug>/login`.

Todas las páginas de recovery muestran enlace "Volver al inicio de sesión".

### Config Supabase (proyecto remoto linkeado)

Agregar al allowlist de Redirect URLs (patrón wildcard cubre todos los paths y slugs):
- `http://localhost:3000/**`
- `https://book-now-hub.vercel.app/**`

Procedimiento seguro: leer la config de auth remota actual antes de modificar (para no pisar `site_url` ni otros settings), aplicar solo el cambio de redirect URLs, confirmar con el usuario antes de ejecutar el cambio remoto. Emails: plantillas por defecto de Supabase. Sin cambios de esquema.

## Componentes / unidades y responsabilidades

- **`authService` / `clientAuthService`** — única puerta a Supabase Auth para estos flujos. Entrada: email + redirectTo. Salida: promesa (throw en error). Sin estado.
- **Páginas forgot-password** — capturan email, llaman al servicio con el `redirectTo` correcto de su superficie, muestran estado "enviado". Dependencia: servicio + router/params.
- **Páginas reset-password** — capturan password nueva (con confirm), llaman `updatePassword`, redirigen. Dependencia: servicio + router.
- **Toggle de login** — estado local `mode: "password" | "magic"`; en `magic` reutiliza el servicio `sendMagicLink`. No altera la lógica de login por password existente.
- **`/auth/callback`** — sin cambios (ya soporta `?code` + `?next` + `?tenant`).
- **Middleware** — solo se amplían listas de rutas públicas.

## Manejo de errores

- Errores de red/servicio → `toast.error` con el mensaje (patrón Sonner existente).
- Forgot-password → mensaje neutro tras enviar (no revela existencia de cuenta).
- Reset-password → validar coincidencia y min 8 antes de llamar; toast en fallo.
- Magic link en superficie equivocada → manejado por la verificación de pertenencia existente (no es camino de error nuevo).

## Fuera de alcance (YAGNI)

- Sin cambios de esquema en la base de datos.
- Sin plantillas de email personalizadas (se usan las de Supabase).
- Sin refactor del flujo de recovery del cliente (funciona; se le suma solo el magic link).
- Sin magic link por SMS/OTP numérico (solo email link).
- Sin ruta separada de recovery para especialistas (usan el flujo del tenant).
- No se toca el reset admin-iniciado existente (`/api/specialists/[id]/reset-password`).

## Criterios de éxito

1. Desde cada login (admin/tenant/cliente) se puede pedir recovery y magic link.
2. El email de recovery aterriza en una pantalla donde se define contraseña nueva y se accede.
3. El magic link autentica y aterriza en el destino correcto de la superficie; cuentas inexistentes no se crean.
4. Rutas `/reset-password` (admin y tenant) accesibles sin sesión previa (middleware).
5. Redirect URLs de localhost y prod en el allowlist de Supabase.
6. `npm run build`, `tsc` y `npx biome check` sin errores.
7. Handoff fechado generado en `docs/superpowers/context/2026-07-12-recovery-magic-link.md`.

## Entregables

- Servicios extendidos: `auth.ts`, `client-auth.ts`.
- Validación: `resetPasswordSchema`.
- 4 páginas nuevas (admin + tenant forgot/reset).
- Toggle magic link en 3 logins.
- Ajustes de middleware.
- Config de Redirect URLs en Supabase remoto.
- Handoff MD fechado.
