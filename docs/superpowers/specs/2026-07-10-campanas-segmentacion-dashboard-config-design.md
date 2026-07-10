# Diseño — Campañas + Segmentación, Config de Módulos y Dashboard Real

- **Fecha**: 2026-07-10
- **Estado**: Aprobado para implementación
- **Alcance**: 3 features independientes en una entrega. NO se toca envío real (Twilio) ni pasarelas de pago (siguen manuales).

---

## 0. Contexto y objetivo

La app SaaS cubre bien el núcleo transaccional (agenda, POS, caja, comisiones) y ya tiene un sistema real de módulos por tenant. Faltan las capas de **crecimiento** y de **pulido de plataforma**. Esta entrega ataca tres frentes derivados de `updates/revision-cobertura-analisis.md`:

1. **Módulo de Campañas + motor de Segmentación** (Pilar 3 y 4 del análisis).
2. **Corrección de la config de módulos** (que se lea de base + toggle por tenant + guard de rutas).
3. **Dashboard real** (elimina data mock) con gráficos (recharts) y animaciones (anime.js).

### Convenciones del repo que se respetan
- Patrón 3 capas: `src/lib/services/[entity].ts` → `src/hooks/supabase/use-[entity].ts` → componentes/páginas.
- **Escrituras** vía API routes usando `supabaseAdmin` (bypassa RLS). **Lecturas cliente** vía `createBrowserSB()` en el service singleton.
- Tipos en `src/types/index.ts` como `export type Foo = Tables["foo"]["Row"]`; generados en `src/types/supabase.ts` vía `npm run db:types`.
- Siempre filtrar por `tenant_id` en queries scoped.
- Comentarios en español. Toasts con `sonner`. Biome (`npx biome check --write`) tras crear archivos.
- Migraciones vía Supabase CLI (proyecto ya linkeado): `supabase migration new` + `supabase db push`.

---

## 1. Feature 1 — Segmentación + Campañas

### 1.1 Modelo de datos (3 tablas nuevas)

**`customer_segments`** — definiciones de segmento reutilizables.
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | default gen_random_uuid() |
| tenant_id | uuid FK tenants | NOT NULL |
| name | text | NOT NULL |
| description | text | nullable |
| rules | jsonb | NOT NULL. Ver §1.2 |
| is_active | boolean | default true |
| created_by | uuid | nullable (profiles/tenant_users) |
| created_at / updated_at | timestamptz | default now() |

**`campaigns`** — registro de campaña.
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK | NOT NULL |
| name | text | NOT NULL |
| description | text | nullable |
| campaign_type | text | `reactivation \| last_minute \| transformation \| birthday \| custom`. default 'custom' |
| channel | text | default 'whatsapp' (futuro: email, sms) |
| segment_id | uuid FK customer_segments | nullable (se permite regla inline) |
| rules_snapshot | jsonb | nullable. Copia de las reglas usadas al materializar |
| message_template | text | NOT NULL. Con variables `{{first_name}}` etc. |
| status | text | `draft \| ready \| queued \| sent \| cancelled`. default 'draft' |
| stats | jsonb | default `{}`. `{ total, queued, sent, failed, skipped }` |
| created_by | uuid | nullable |
| sent_at | timestamptz | nullable |
| created_at / updated_at | timestamptz | default now() |

**`campaign_recipients`** — snapshot de destinatarios (congela a quién y con qué mensaje).
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| campaign_id | uuid FK campaigns | NOT NULL, ON DELETE CASCADE |
| tenant_id | uuid FK | NOT NULL (denormalizado para RLS/filtro) |
| customer_id | uuid FK customers | NOT NULL |
| rendered_message | text | mensaje con variables resueltas |
| status | text | `queued \| sent \| failed \| skipped`. default 'queued' |
| sent_at | timestamptz | nullable |
| error_message | text | nullable |
| created_at | timestamptz | default now() |

Índices: `(tenant_id)` en las tres; `(campaign_id)` y `(campaign_id, status)` en recipients; `(segment_id)` en campaigns.

Los enums se implementan como `text` + `CHECK` (más simple de evolucionar que enums PG, coherente con evitar fricción de migración).

### 1.2 Formato de reglas (`rules` jsonb)

```json
{
  "match": "all",            // "all" = AND, "any" = OR
  "conditions": [
    { "field": "city",            "operator": "eq",        "value": "Guayaquil" },
    { "field": "total_spent",     "operator": "gte",       "value": 500 },
    { "field": "days_since_last_visit", "operator": "gte", "value": 90 },
    { "field": "age",             "operator": "between",   "value": [25, 45] },
    { "field": "service_consumed","operator": "in",        "value": ["<service_id>"] }
  ]
}
```

### 1.3 Registro de campos segmentables (whitelist)

Definido en `src/lib/segments/fields.ts`. Cada campo declara: `key`, `label`, `type` (`text|number|date|enum|array|special`), `operators[]`, y cómo se traduce.

| field | origen | operadores | traducción |
|---|---|---|---|
| city | customers.city | eq, ne, in | filtro directo |
| total_spent | customers.total_spent | gte, lte, between | directo |
| total_visits | customers.total_visits | gte, lte, eq | directo |
| loyalty_points | customers.loyalty_points | gte, lte | directo |
| gender | customers.gender | eq, in | directo |
| how_found_us (referido) | customers.how_found_us | eq, in | directo |
| tags | customers.tags (array) | contains, contains_any | `.contains` / `.overlaps` |
| accepts_marketing | customers.accepts_marketing | eq | directo |
| days_since_last_visit | customers.last_visit_at | gte, lte | **JS**: cutoff = hoy − N días → `.lte/.gte` sobre last_visit_at |
| age | customers.birth_date | gte, lte, between | **JS**: convierte edad→rango de fechas de nacimiento |
| birthday_month | customers.birth_date | eq (mes 1-12) | **JS/SQL**: extrae mes; en TS se pre-filtra o via `.filter` sobre expresión (ver §1.4) |
| service_consumed | appointments.service_id | in, not_in | **pre-consulta**: customer_ids con cita de ese servicio → `.in('id', ids)` |

Los operadores mapean a PostgREST: `eq→.eq`, `ne→.neq`, `gte→.gte`, `lte→.lte`, `in→.in`, `contains→.contains`, `contains_any→.overlaps`, `between→.gte + .lte`.

### 1.4 Motor de traducción (decisión A — TypeScript)

`src/lib/segments/engine.ts`:
- `buildCustomerQuery(supabase, tenantId, rules)`: parte de `supabase.from('customers').select(...).eq('tenant_id', tenantId).eq('is_active', true)` y aplica cada condición.
- Condiciones "directas" → `.filter()` encadenado.
- Condiciones "special" (`days_since_last_visit`, `age`, `birthday_month`, `service_consumed`) → helpers que calculan valores/pre-consultas antes de encadenar.
- `match: "any"` (OR) → se construye con `.or("cond1,cond2,...")` de PostgREST. Condiciones special en modo OR quedan **fuera de v1** si no se pueden expresar en un `.or()` simple; el rule builder limita OR a campos directos (documentado en UI). Modo `all` (AND) soporta todo.
- **Validación**: cada condición se valida contra el registro de campos (field permitido + operador permitido + shape del value). Reglas inválidas → error 400, nunca se inyecta a la query.
- `birthday_month`: se resuelve con un filtro sobre expresión no trivial en PostgREST; para v1 se computa vía RPC ligero `customers_birthday_month(p_tenant_id, p_month)` **o** trayendo `birth_date` y filtrando en JS (dataset pequeño). Se elige filtrado JS en v1 por simplicidad; se anota como candidato a optimizar.

### 1.5 Servicios

`src/lib/services/segments.ts` (singleton):
- `list(tenantId)`, `get(id)`, `create(payload)`, `update(id, payload)`, `remove(id)` — CRUD (lecturas browser SB; escrituras vía API route).
- `preview(tenantId, rules)` → `{ count, sample: Customer[] }` (sample ~10). Llama al engine.

`src/lib/services/campaigns.ts` (singleton):
- `list(tenantId)`, `get(id)` (incluye recipients count por status), `create`, `update`, `remove`.
- `materialize(campaignId)` — resuelve el segmento (o rules inline), inserta `campaign_recipients` con `rendered_message` por cliente, guarda `rules_snapshot`, actualiza `stats.total/queued`, pasa status a `ready`.
- `send(campaignId)` — **stub**: recorre recipients `queued`, marca `sent`+`sent_at`, actualiza `stats.sent`, pasa campaña a `sent`. Punto de enganche Twilio marcado con `// TODO: conectar envío real (Twilio/Resend) aquí`.

Render de mensaje: `src/lib/campaigns/render.ts` — sustituye `{{first_name}}`, `{{last_name}}`, `{{full_name}}` desde el customer; variable desconocida → se deja literal y se registra.

### 1.6 API routes (escrituras con `supabaseAdmin`, auth vía `createServerSB`)

- `GET|POST /api/segments`
- `GET|PATCH|DELETE /api/segments/[id]`
- `POST /api/segments/preview` — body `{ rules }` → `{ count, sample }`
- `GET|POST /api/campaigns`
- `GET|PATCH|DELETE /api/campaigns/[id]`
- `POST /api/campaigns/[id]/materialize`
- `POST /api/campaigns/[id]/send` (stub)

Todas validan tenant del usuario y `tenant_id` del recurso.

### 1.7 Hooks

- `src/hooks/supabase/use-segments.ts`: `useSegments()`, `useSegmentPreview(rules)` (debounced), `useSegment(id)`.
- `src/hooks/supabase/use-campaigns.ts`: `useCampaigns()`, `useCampaign(id)`.

### 1.8 UI (rutas)

- `/t/[tenant]/campaigns` — lista de campañas (estado, tipo, destinatarios, fecha) + tab **Segmentos**.
- `/t/[tenant]/campaigns/nueva` — wizard:
  1. **Tipo/preset** (reactivation/last_minute/transformation/birthday/custom) → pre-carga reglas + plantilla de mensaje.
  2. **Segmento** — rule builder (agregar condición: campo → operador → valor) con **preview en vivo** (count + muestra). Opción "guardar como segmento".
  3. **Mensaje** — textarea con chips de variables; vista previa renderizada con un cliente de muestra.
  4. **Revisar** — resumen + "Guardar borrador" / "Materializar destinatarios".
- `/t/[tenant]/campaigns/[id]` — detalle: destinatarios (tabla con status), stats, botón **Enviar** (stub) con confirmación.

Componentes en `src/components/campaigns/`: `rule-builder.tsx`, `condition-row.tsx`, `segment-preview.tsx`, `message-editor.tsx`, `campaign-wizard.tsx`, `recipients-table.tsx`, `campaign-card.tsx`.

### 1.9 Presets (los 3 tipos del análisis + cumpleaños)

En `src/lib/campaigns/presets.ts` — cada preset = `{ type, name, defaultRules, defaultMessage }`:
- **reactivation**: `days_since_last_visit >= 90`.
- **last_minute**: clientes con `accepts_marketing = true` y visita reciente (`days_since_last_visit <= 30`) — para rellenar huecos.
- **transformation**: `total_visits` bajo (ej. 1) para convertir a recurrente.
- **birthday**: `birthday_month = <mes actual>`.

---

## 2. Feature 2 — Config de módulos

### 2.1 Admin de módulos lee de Supabase
- `src/app/(root)/modules/page.tsx` → server component que usa `modulesService.list()` (nuevo método sobre tabla `modules`), agrupa por `category` (core/addon/sales), ordena por `sort_order`. Se elimina el array hardcodeado.
- `src/lib/services/modules.ts`: asegurar `list()` que lee `modules` (browser/server SB).

### 2.2 Toggle de módulos por tenant
- UI en la ficha del tenant `src/app/(root)/tenants/[id]/...` (sección "Módulos"): lista todos los `modules` con `Switch`; refleja `tenant_modules.is_enabled`. Los `is_core = true` se muestran activos y **deshabilitados** (no se pueden apagar).
- `PATCH /api/tenants/[id]/modules` — body `{ moduleId, enabled }`. Con `supabaseAdmin`: upsert en `tenant_modules` (`tenant_id`, `module_id`, `is_enabled`). Solo global admin.
- Hook/serv: extender `tenantsService` con `setModuleEnabled(tenantId, moduleId, enabled)`.

### 2.3 Guard de rutas server-side
- En `src/app/t/[tenant]/layout.tsx` (ya valida membresía): cargar el set de slugs de módulos activos del tenant (`getTenantModules`).
- Mapa `src/lib/modules/route-map.ts`: `pathSegment → moduleSlug` (ej. `orders→pos`, `caja→pos`, `comisiones→pos`, `inventory→inventory`, `ecommerce→ecommerce`, `cafeteria→cafeteria`, `campaigns→campaigns`, etc.). Rutas sin mapeo o de módulos `is_core` siempre pasan.
- Se obtiene el primer segmento tras `/t/[tenant]/` (desde `headers()`/pathname). Si mapea a un módulo NO activo → `redirect('/t/[tenant]/dashboard')`.
- Nota: `dashboard`, `settings`, `mis-comisiones`, `perfil` y similares no se gatean (siempre disponibles).

---

## 3. Feature 3 — Dashboard real

### 3.1 Capa de datos
- `src/lib/services/dashboard.ts` (lecturas `createBrowserSB`):
  - `getKpis(tenantId)` → `{ appointmentsToday, totalCustomers, activeServices, revenueToday }`.
    - appointmentsToday: `appointments` con `scheduled_at::date = hoy`, `tenant_id`, status ≠ cancelled.
    - totalCustomers: count `customers` `is_active=true`.
    - activeServices: count `services` `is_active=true`.
    - revenueToday: sum `invoices.amount_local` con `status='paid'` y `paid_at::date = hoy`.
  - `getTodayAppointments(tenantId)` → citas de hoy con join a customer/service/specialist (hora, nombre, servicio, estado). Query directa a `appointments` (la vista `v_daily_appointments` puede estar vacía; se usa query explícita).
  - `getRevenueLast7Days(tenantId)` → `[{ date, total }]` 7 días (sum `invoices.amount_local` paid por día).
  - `getStatusBreakdown(tenantId)` → conteo de citas del mes por status (`pending/confirmed/in_progress/completed/cancelled`).
  - `getTopServices(tenantId)` → top 5 servicios por nº de citas del mes.
- Hook `src/hooks/supabase/use-dashboard.ts` con SWR (`useDashboard()` agrupando, o hooks por widget).
- **Opcional** RPC `dashboard_kpis(p_tenant_id)` para los 4 KPIs en un round-trip (se decide en el plan; si añade complejidad, se hace en TS).

### 3.2 Widgets y componentes (`src/components/dashboard/`)
1. `kpi-card.tsx` + `animated-number.tsx` — 4 KPIs con count-up **anime.js** (0 → valor al montar).
2. `upcoming-appointments.tsx` — lista real de hoy (reemplaza placeholder).
3. `revenue-chart.tsx` — **recharts** AreaChart/BarChart de ingresos 7 días, gradiente Tailwind, animación de dibujo.
4. `status-donut.tsx` — **recharts** PieChart (donut) de citas por estado.
5. `top-services-chart.tsx` — **recharts** BarChart horizontal de top servicios.
- Entrada escalonada (stagger) de tarjetas con anime.js al montar el dashboard.
- `src/app/t/[tenant]/dashboard/page.tsx` — se reescribe consumiendo los hooks; skeletons con claves string literales (no index).

### 3.3 Dependencia
- `bun add recharts`. Nota: el repo usa `package-lock.json` (npm); instalar con bun genera `bun.lockb`. Anotado; se procede con bun por indicación del usuario. anime.js (`^4.5.0`) ya instalado.

---

## 4. Migraciones / RLS / SPs

- **Migración**: `supabase migration new campanas_segmentacion` con las 3 tablas + índices + CHECKs. Proyecto linkeado → `supabase db push`. Fallback: entregar SQL para ejecución manual (patrón `database/*.sql`).
- **RLS** en `customer_segments`, `campaigns`, `campaign_recipients`: habilitar RLS; políticas de lectura por pertenencia al `tenant_id` (coherente con tablas existentes). Escrituras reales via `supabaseAdmin` (service_role, bypassa RLS).
- **SPs/funciones** (solo las que aportan):
  - Segmentación se queda en **TS** (decisión A). No hay SP de segmentación.
  - `dashboard_kpis(p_tenant_id)` opcional (§3.1).
  - `stats` de campaña se calcula en el API route de materialize/send (sin trigger) para mantener trazabilidad simple.
- Tras aplicar: `npm run db:types` para regenerar `src/types/supabase.ts`; añadir tipos en `src/types/index.ts` (`CustomerSegment`, `Campaign`, `CampaignRecipient`).

---

## 5. Sidebar / navegación
- El módulo `campaigns` ya existe en la tabla `modules` (addon). Añadir su slug a `implementedModuleSlugs` en `src/components/tenant/tenant-sidebar.tsx` para que aparezca cuando el tenant lo tenga activo. Activar el módulo `campaigns` en `tenant_modules` para los tenants de prueba.

---

## 6. Fuera de alcance (explícito)
- Envío real por Twilio/Resend (solo stub).
- Pasarelas de pago (siguen manuales).
- Módulo de IA (siguiente hito; ver `updates/revision-cobertura-analisis.md` §4).
- Canales de entrada adicionales (FB/IG/Telegram/widget).
- Encuestas de servicio.
- Programación/cron de campañas (v1 es materializar + enviar-stub bajo demanda).

---

## 7. Criterios de aceptación
1. Un admin puede crear un segmento con ≥3 condiciones combinadas y ver el conteo real en vivo.
2. Un admin puede crear una campaña desde un preset, materializar destinatarios reales y "enviarla" (stub) viendo stats actualizarse; los recipients quedan `sent`.
3. `/(root)/modules` muestra los 14 módulos reales desde la BD (no la lista fija).
4. Un global admin puede activar/desactivar un módulo addon de un tenant y el cambio se refleja en `tenant_modules` y en el sidebar del tenant.
5. Acceder por URL directa a un módulo desactivado redirige al dashboard.
6. El dashboard muestra KPIs, próximas citas, ingresos 7 días, distribución por estado y top servicios con **datos reales**, con count-up y gráficos recharts animados.
7. `npm run lint` (Biome) y `npm run build` pasan.
