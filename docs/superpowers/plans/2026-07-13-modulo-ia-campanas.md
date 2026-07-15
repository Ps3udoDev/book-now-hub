# Módulo de IA — Sugerencia de Campañas Segmentadas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir un módulo addon `ai-assistant` que, para un tenant que lo tenga habilitado, propone 2-4 campañas segmentadas (segmento + copy de WhatsApp) usando Claude vía Vercel AI Gateway, con los conteos verificados por el motor de segmentación real, y al aprobar genera un borrador de campaña en el flujo existente.

**Architecture:** La IA solo emite reglas (`SegmentRules`) + copy a partir de un resumen agregado del tenant (sin PII). El backend re-cuenta cada propuesta con `previewSegment` (grounding), descarta lo inválido/vacío, y devuelve conteos reales. El super admin activa el módulo por tenant con un toggle real sobre `tenant_modules`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Supabase, Vercel AI SDK (`ai@7`) + AI Gateway (Claude), Zod 4, SWR, Sonner.

## Global Constraints

- **Sin test runner**: el repo no tiene runner configurado. La "verificación" de cada tarea es: `npx tsc --noEmit` + `npm run lint` + (cuando aplique) `npm run build` + prueba manual del endpoint/UI contra el tenant **Elvis** seedeado. No añadir un test runner.
- **Patrón 3 capas**: `src/lib/services/[entity].ts` → `src/hooks/supabase/use-[entity].ts` → componentes/páginas.
- **Escrituras**: siempre vía API route usando `supabaseAdmin` (bypassa RLS). Lecturas cliente vía `createBrowserSB()` en el service.
- **Tipos**: definir en `src/types/index.ts`; los generados van a `src/types/supabase.ts` vía `npm run db:types`.
- **Auth API**: tenant-scoped con `requireTenantAccess(tenantId, roles?)`; global admin con `requireGlobalAdmin()` (ambos en `src/lib/api/tenant-auth.ts`). Roles de escritura de campañas: `CAMPAIGN_WRITE_ROLES = ["owner","admin","manager"]`.
- **Segmentación**: usar SOLO campos de la whitelist `SEGMENT_FIELDS` (`src/lib/segments/fields.ts`). Validar con `validateRules` y contar con `previewSegment` (`src/lib/segments/engine.ts`). Nunca mostrar números provenientes del LLM.
- **Biome**: ejecutar `npx biome check --write <archivos>` tras crear/editar. Evitar `noArrayIndexKey`, `noImgElement`, `noUselessFragments`. Indentación 2 espacios.
- **Comentarios en español**. Toasts con `import { toast } from "sonner"`.
- **Migraciones**: `supabase db push`. Usar `gen_random_uuid()` (NO `uuid_generate_v4()`). Reutilizar trigger `public.update_updated_at()`. Mantener copia legible en `database/*.sql` + migración en `supabase/migrations/`.
- **Módulo/env**: dependencia nueva `ai@^7`; env nueva `AI_GATEWAY_API_KEY` (documentar en `.env.example` si existe). El tenant de demo es **Elvis** (slug real `elviz`; el seed resuelve por variantes de slug, no hardcodea UUID).

---

## Task 1: Registrar el módulo `ai-assistant` (migración + activación en Elvis)

**Files:**
- Create: `database/fase5-modulo-ia.sql` (copia legible)
- Create: `supabase/migrations/20260713090000_ai_assistant_module.sql`

**Interfaces:**
- Produces: fila en `modules` con `slug = 'ai-assistant'`; fila en `tenant_modules` con `is_enabled = true` para el tenant Elvis. Otras tareas asumen que existe el slug `ai-assistant`.

- [ ] **Step 1: Escribir la migración SQL**

Crear `supabase/migrations/20260713090000_ai_assistant_module.sql` con este contenido:

```sql
-- Módulo de IA (addon): sugerencia de campañas segmentadas.
-- Alta del módulo + activación en el tenant demo (Elvis).

insert into public.modules (slug, name, description, icon, category, is_core, status, sort_order, version)
values (
  'ai-assistant',
  'Asistente IA',
  'Propone campañas segmentadas a partir del comportamiento de los clientes.',
  'sparkles',
  'addon',
  false,
  'beta',
  90,
  '1.0.0'
)
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      icon = excluded.icon,
      category = excluded.category,
      status = excluded.status;

-- Activar para el tenant demo Elvis (resuelve por variantes de slug conocidas).
insert into public.tenant_modules (tenant_id, module_id, is_enabled, enabled_at)
select t.id, m.id, true, now()
from public.tenants t
cross join public.modules m
where m.slug = 'ai-assistant'
  and t.slug in ('elviz', 'elvis', 'elviz-studio', 'elvis-studio')
on conflict (tenant_id, module_id) do update
  set is_enabled = true, enabled_at = now();
```

Nota: si `tenant_modules` no tiene índice único en `(tenant_id, module_id)`, reemplazar el `on conflict (tenant_id, module_id)` por lógica `where not exists`. Verificar el índice antes (Step 3).

- [ ] **Step 2: Copiar a la carpeta legible**

Copiar el mismo contenido a `database/fase5-modulo-ia.sql` (convención del repo: copia legible fuera de `supabase/migrations`).

- [ ] **Step 3: Verificar el índice único de tenant_modules y aplicar**

Run:
```bash
supabase db push
```
Expected: aplica sin error. Si falla el `on conflict (tenant_id, module_id)` por falta de constraint, ajustar el `insert ... select` a un patrón `where not exists (select 1 from tenant_modules tm where tm.tenant_id = t.id and tm.module_id = m.id)` y re-aplicar.

- [ ] **Step 4: Verificar en la app**

Run: `npm run dev` y abrir `http://localhost:3000/modules` (consola super admin).
Expected: aparece la tarjeta "Asistente IA" en la categoría Addon con status Beta.

- [ ] **Step 5: Commit**

```bash
git add database/fase5-modulo-ia.sql supabase/migrations/20260713090000_ai_assistant_module.sql
git commit -m "feat(ai): registrar módulo ai-assistant y activarlo en Elvis"
```

---

## Task 2: Gating de ruta y sidebar del módulo

**Files:**
- Modify: `src/lib/modules/route-map.ts:6-10`
- Modify: `src/components/tenant/tenant-sidebar.tsx:41-67`

**Interfaces:**
- Consumes: slug `ai-assistant` (Task 1).
- Produces: segmento de ruta `ai-assistant` gateado por el módulo homónimo; ítem de sidebar visible cuando el tenant tiene el módulo activo.

- [ ] **Step 1: Añadir el mapeo de ruta**

En `src/lib/modules/route-map.ts`, dentro de `ROUTE_MODULE_MAP`, añadir la entrada:

```ts
export const ROUTE_MODULE_MAP: Record<string, string> = {
  campaigns: "campaigns",
  cafeteria: "cafeteria",
  ecommerce: "ecommerce",
  "ai-assistant": "ai-assistant",
};
```

- [ ] **Step 2: Añadir icono y marcar como implementado en el sidebar**

En `src/components/tenant/tenant-sidebar.tsx`:

1. Asegurar que `Sparkles` esté importado desde `lucide-react` (añadirlo a la lista de imports de iconos existente).
2. Añadir al objeto `moduleIcons`:

```ts
  "ai-assistant": Sparkles,
```

3. Añadir `"ai-assistant"` al `Set` `implementedModuleSlugs`:

```ts
const implementedModuleSlugs = new Set([
  "dashboard",
  "services",
  "appointments",
  "customers",
  "specialists",
  "workstations",
  "inventory",
  "ecommerce",
  "cafeteria",
  "campaigns",
  "ai-assistant",
]);
```

- [ ] **Step 3: Verificar typecheck y lint**

Run:
```bash
npx tsc --noEmit && npx biome check --write src/lib/modules/route-map.ts src/components/tenant/tenant-sidebar.tsx
```
Expected: sin errores de tipo; biome formatea sin quejas.

- [ ] **Step 4: Verificar en la app**

Run: `npm run dev`, entrar como usuario del tenant Elvis. En el sidebar, grupo de Módulos, debe aparecer "Asistente IA" (activo, no "Pronto").
Expected: el ítem aparece y enlaza a `/t/elviz/ai-assistant` (404 por ahora, se crea en Task 9).

- [ ] **Step 5: Commit**

```bash
git add src/lib/modules/route-map.ts src/components/tenant/tenant-sidebar.tsx
git commit -m "feat(ai): gating de ruta y sidebar para ai-assistant"
```

---

## Task 3: Seed de datos de demo para Elvis

**Files:**
- Create: `database/seed-demo-ai.sql`
- Create: `supabase/migrations/20260713091000_seed_demo_ai.sql`

**Interfaces:**
- Produces: ~40 `customers` con textura en el tenant Elvis (dormidos 90d+, cumpleaños del mes, gasto/visitas variados, tags, `how_found_us`, `accepts_marketing`) y algunas `appointments` para poblar `service_consumed`/topServices. Downstream (Tasks 6-9) asume que estos segmentos no salen vacíos.

- [ ] **Step 1: Escribir el seed idempotente**

Crear `supabase/migrations/20260713091000_seed_demo_ai.sql`. Usa un bloque `do $$` que resuelve el tenant y genera clientes. Contenido completo:

```sql
-- Seed de demo para el Asistente IA: puebla el tenant Elvis con clientes con textura.
-- Idempotente: borra los clientes demo previos (marcados por tag 'demo-ai') y reinserta.
do $$
declare
  v_tenant uuid;
  v_service uuid;
  i int;
  v_first text;
  v_last text;
  v_full text;
  v_days int;
  v_month int;
begin
  select id into v_tenant from public.tenants
   where slug in ('elviz', 'elvis', 'elviz-studio', 'elvis-studio')
   order by created_at limit 1;
  if v_tenant is null then
    raise notice 'Tenant Elvis no encontrado; se omite el seed.';
    return;
  end if;

  -- Limpieza idempotente de clientes de demo previos.
  delete from public.customers
   where tenant_id = v_tenant and tags @> array['demo-ai'];

  -- Un servicio existente del tenant para poblar service_consumed (si hay).
  select id into v_service from public.services where tenant_id = v_tenant limit 1;

  for i in 1..40 loop
    v_first := (array['Ana','Luis','María','Carlos','Sofía','Diego','Valentina','Jorge','Camila','Andrés',
                      'Lucía','Pedro','Isabella','Miguel','Daniela','Fernando','Gabriela','Ricardo','Paula','Tomás'])[1 + (i % 20)];
    v_last := (array['Gómez','Pérez','Rojas','Díaz','Torres','Vargas','Castro','Ramírez','Flores','Herrera'])[1 + (i % 10)];
    v_full := v_first || ' ' || v_last;

    -- ~10 dormidos (>90d), ~10 medios (30-60d), resto recientes.
    v_days := case
      when i % 4 = 0 then 95 + i           -- dormidos
      when i % 4 = 1 then 35 + i           -- medios
      else 3 + (i % 20)                    -- recientes
    end;

    -- ~8 con cumpleaños en el mes actual, el resto repartido.
    v_month := case when i % 5 = 0 then extract(month from now())::int else 1 + (i % 12) end;

    insert into public.customers (
      tenant_id, first_name, last_name, full_name, gender, city, how_found_us,
      birth_date, last_visit_at, total_spent, total_visits, loyalty_points,
      accepts_marketing, tags, is_active, phone, email
    ) values (
      v_tenant, v_first, v_last, v_full,
      (array['female','male','other'])[1 + (i % 3)],
      (array['Quito','Guayaquil','Cuenca','Ambato'])[1 + (i % 4)],
      (array['referido','redes','google','walk-in'])[1 + (i % 4)],
      make_date(1985 + (i % 20), v_month, 1 + (i % 27)),
      now() - (v_days || ' days')::interval,
      (50 + i * 13)::numeric,
      1 + (i % 12),
      (i * 7) % 500,
      (i % 3 <> 0),                                   -- ~2/3 aceptan marketing
      case when i % 6 = 0 then array['demo-ai','vip'] else array['demo-ai'] end,
      true,
      '09' || lpad((10000000 + i)::text, 8, '0'),
      'demo' || i || '@example.com'
    );
  end loop;

  -- Poblar algunas citas para service_consumed / topServices (si hay servicio).
  if v_service is not null then
    insert into public.appointments (tenant_id, customer_id, service_id, scheduled_at, status)
    select v_tenant, c.id, v_service, now() - interval '10 days', 'completed'
    from public.customers c
    where c.tenant_id = v_tenant and c.tags @> array['demo-ai']
    limit 15;
  end if;
end $$;
```

Nota: si `appointments` exige columnas NOT NULL adicionales (p. ej. `specialist_id`, `branch_id`, `end_at`, `duration`), ajustar el `insert into appointments` para incluirlas con valores existentes del tenant; si es más simple, omitir la parte de citas (el resto del seed basta para la mayoría de segmentos). Verificar en Step 2.

- [ ] **Step 2: Aplicar y ajustar si falla**

Run: `supabase db push`
Expected: aplica sin error. Si el `insert into appointments` falla por columnas requeridas, comentar ese bloque `if v_service ...` y re-aplicar (los segmentos por inactividad/cumpleaños/gasto no dependen de citas).

- [ ] **Step 3: Copiar a carpeta legible**

Copiar el contenido a `database/seed-demo-ai.sql`.

- [ ] **Step 4: Verificar los datos**

Verificar con el motor real: en `npm run dev`, entrar a `/t/elviz/campaigns/new` (rule builder existente) y crear una condición `days_since_last_visit ≥ 90`.
Expected: el preview muestra un conteo > 0 (los clientes dormidos del seed). Repetir con `birthday_month = <mes actual>` → conteo > 0.

- [ ] **Step 5: Commit**

```bash
git add database/seed-demo-ai.sql supabase/migrations/20260713091000_seed_demo_ai.sql
git commit -m "feat(ai): seed de demo con textura para Elvis"
```

---

## Task 4: API de toggle de módulos por tenant (super admin)

**Files:**
- Create: `src/app/api/admin/tenant-modules/route.ts`

**Interfaces:**
- Consumes: `requireGlobalAdmin()` de `src/lib/api/tenant-auth.ts`; `supabaseAdmin`.
- Produces: `PATCH /api/admin/tenant-modules` con body `{ tenant_id: string, module_id: string, is_enabled: boolean }` → `{ tenant_module }`. La UI de Task 5 lo consume.

- [ ] **Step 1: Escribir la ruta**

Crear `src/app/api/admin/tenant-modules/route.ts`:

```ts
// src/app/api/admin/tenant-modules/route.ts
// Toggle de módulos por tenant. Solo global admin. Upsert sobre tenant_modules.
import { type NextRequest, NextResponse } from "next/server";
import { requireGlobalAdmin } from "@/lib/api/tenant-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** PATCH /api/admin/tenant-modules  body: { tenant_id, module_id, is_enabled } */
export async function PATCH(request: NextRequest) {
  try {
    const access = await requireGlobalAdmin();
    if (!access.ok)
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );

    const { tenant_id, module_id, is_enabled } = await request.json();
    if (!tenant_id || !module_id || typeof is_enabled !== "boolean") {
      return NextResponse.json(
        { error: "tenant_id, module_id e is_enabled son requeridos" },
        { status: 400 },
      );
    }

    // Buscar fila existente para decidir update vs insert.
    const { data: existing } = await supabaseAdmin
      .from("tenant_modules")
      .select("id")
      .eq("tenant_id", tenant_id)
      .eq("module_id", module_id)
      .maybeSingle();

    const payload = {
      is_enabled,
      enabled_at: is_enabled ? new Date().toISOString() : null,
      enabled_by: access.globalUserId ?? null,
    };

    let result;
    if (existing) {
      result = await supabaseAdmin
        .from("tenant_modules")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .single();
    } else {
      result = await supabaseAdmin
        .from("tenant_modules")
        .insert({ tenant_id, module_id, ...payload })
        .select()
        .single();
    }

    if (result.error)
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 },
      );
    return NextResponse.json({ tenant_module: result.data });
  } catch (err) {
    console.error("Error en PATCH /api/admin/tenant-modules:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Typecheck + lint**

Run:
```bash
npx tsc --noEmit && npx biome check --write src/app/api/admin/tenant-modules/route.ts
```
Expected: sin errores.

- [ ] **Step 3: Verificar el endpoint (manual)**

Con `npm run dev` y sesión de global admin, desde la consola del navegador en `/modules`:
```js
await fetch('/api/admin/tenant-modules', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ tenant_id:'<uuid Elvis>', module_id:'<uuid ai-assistant>', is_enabled:false }) }).then(r=>r.json())
```
Expected: `{ tenant_module: { is_enabled: false, ... } }`. Volver a poner `true` para no romper el demo.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/tenant-modules/route.ts
git commit -m "feat(ai): API admin para toggle de módulos por tenant"
```

---

## Task 5: UI de gestión de módulos por tenant (super admin)

**Files:**
- Create: `src/app/(root)/modules/tenant-module-manager.tsx` (client component)
- Modify: `src/app/(root)/modules/page.tsx`

**Interfaces:**
- Consumes: `PATCH /api/admin/tenant-modules` (Task 4).
- Produces: sección en `/modules` donde el super admin elige un tenant y prende/apaga cada módulo addon con un switch.

- [ ] **Step 1: Escribir el client component**

Crear `src/app/(root)/modules/tenant-module-manager.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { createBrowserSB } from "@/lib/supabase/client";
import type { Module } from "@/types";

interface TenantOption {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  modules: Module[];
}

export function TenantModuleManager({ modules }: Props) {
  const supabase = createBrowserSB();
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [tenantId, setTenantId] = useState<string>("");
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);

  // Cargar tenants una vez.
  useEffect(() => {
    supabase
      .from("tenants")
      .select("id, name, slug")
      .order("name")
      .then(({ data }) => setTenants((data as TenantOption[]) ?? []));
  }, [supabase]);

  // Cargar estado de módulos del tenant seleccionado.
  useEffect(() => {
    if (!tenantId) {
      setEnabled({});
      return;
    }
    supabase
      .from("tenant_modules")
      .select("module_id, is_enabled")
      .eq("tenant_id", tenantId)
      .then(({ data }) => {
        const map: Record<string, boolean> = {};
        for (const row of data ?? []) {
          map[(row as { module_id: string }).module_id] =
            (row as { is_enabled: boolean | null }).is_enabled ?? false;
        }
        setEnabled(map);
      });
  }, [tenantId, supabase]);

  async function toggle(moduleId: string, next: boolean) {
    setSaving(moduleId);
    setEnabled((prev) => ({ ...prev, [moduleId]: next }));
    try {
      const res = await fetch("/api/admin/tenant-modules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          module_id: moduleId,
          is_enabled: next,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(next ? "Módulo activado" : "Módulo desactivado");
    } catch (e) {
      setEnabled((prev) => ({ ...prev, [moduleId]: !next })); // revertir
      toast.error((e as Error).message || "No se pudo actualizar");
    } finally {
      setSaving(null);
    }
  }

  const addons = modules.filter((m) => !m.is_core);

  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="mb-1 text-lg font-semibold">Activación por tenant</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Elige un tenant y activa o desactiva sus módulos addon.
      </p>

      <select
        className="mb-4 w-full max-w-sm rounded-md border bg-background px-3 py-2 text-sm"
        value={tenantId}
        onChange={(e) => setTenantId(e.target.value)}
      >
        <option value="">Selecciona un tenant…</option>
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} ({t.slug})
          </option>
        ))}
      </select>

      {tenantId && (
        <ul className="divide-y">
          {addons.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between py-3"
            >
              <div>
                <p className="font-medium">{m.name}</p>
                <p className="text-sm text-muted-foreground">{m.slug}</p>
              </div>
              <Switch
                checked={enabled[m.id] ?? false}
                disabled={saving === m.id}
                onCheckedChange={(v) => toggle(m.id, v)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

Nota: verificar que exista `src/components/ui/switch.tsx` (patrón shadcn/Radix). Si no existe, añadirlo con `npx shadcn@latest add switch` antes del typecheck.

- [ ] **Step 2: Montar el manager en la página**

En `src/app/(root)/modules/page.tsx`, importar el componente y renderizarlo debajo del encabezado (antes del `{categories.map(...)}`):

```tsx
import { TenantModuleManager } from "./tenant-module-manager";
```

Y en el JSX, tras el `<div>` del encabezado:

```tsx
      <TenantModuleManager modules={modules} />
```

- [ ] **Step 3: Typecheck + lint**

Run:
```bash
npx tsc --noEmit && npx biome check --write src/app/(root)/modules/page.tsx src/app/(root)/modules/tenant-module-manager.tsx
```
Expected: sin errores.

- [ ] **Step 4: Verificar en la app**

Run: `npm run dev`, ir a `/modules` como global admin. Seleccionar Elvis → ver el switch de "Asistente IA" en ON. Apagarlo y prenderlo; comprobar toast y que en el sidebar del tenant Elvis el ítem aparece/desaparece tras recargar.
Expected: el toggle persiste (recargar la página mantiene el estado).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(root)/modules/page.tsx" "src/app/(root)/modules/tenant-module-manager.tsx"
git commit -m "feat(ai): UI de activación de módulos por tenant en super admin"
```

---

## Task 6: Constructor de contexto (snapshot agregado del tenant)

**Files:**
- Create: `src/lib/ai/context.ts`
- Modify: `src/types/index.ts` (añadir tipos del snapshot)

**Interfaces:**
- Consumes: `previewSegment` (`src/lib/segments/engine.ts`), `SEGMENT_FIELDS` (`src/lib/segments/fields.ts`), `supabaseAdmin`.
- Produces: `buildTenantSnapshot(supabase: SupabaseClient<Database>, tenantId: string): Promise<TenantSnapshot>`; tipos `TenantSnapshot` y `SegmentFieldSummary` exportados desde `@/types`.

- [ ] **Step 1: Añadir los tipos al índice**

En `src/types/index.ts`, cerca de los tipos de campañas/segmentos, añadir:

```ts
/** Resumen de un campo segmentable para el prompt de IA. */
export interface SegmentFieldSummary {
  key: string;
  label: string;
  type: string;
  operators: SegmentOperator[];
  options?: { value: string; label: string }[];
  hint?: string;
}

/** Resumen agregado del tenant que se envía al LLM (sin PII). */
export interface TenantSnapshot {
  currency: string;
  totalActiveCustomers: number;
  inactivity: { d30: number; d60: number; d90: number };
  birthdaysThisMonth: number;
  acceptsMarketing: number;
  topCities: { city: string; count: number }[];
  topServices: { name: string; count: number }[];
  avgTicket: number;
  upcomingAppointments7d: number;
  segmentFields: SegmentFieldSummary[];
}
```

- [ ] **Step 2: Escribir el constructor de contexto**

Crear `src/lib/ai/context.ts`:

```ts
// src/lib/ai/context.ts
// Construye un resumen AGREGADO del tenant (sin PII) para alimentar al LLM.
import type { SupabaseClient } from "@supabase/supabase-js";
import { SEGMENT_FIELDS } from "@/lib/segments/fields";
import { previewSegment } from "@/lib/segments/engine";
import type { Database, SegmentRules, TenantSnapshot } from "@/types";

type SB = SupabaseClient<Database>;

/** Cuenta clientes de un segmento sin traer PII. */
async function countSegment(
  supabase: SB,
  tenantId: string,
  rules: SegmentRules,
): Promise<number> {
  const { count } = await previewSegment(supabase, tenantId, rules);
  return count;
}

export async function buildTenantSnapshot(
  supabase: SB,
  tenantId: string,
): Promise<TenantSnapshot> {
  const currentMonth = new Date().getMonth() + 1;

  // Conteos por inactividad y cumpleaños vía el motor real.
  const [d30, d60, d90, birthdays, marketing] = await Promise.all([
    countSegment(supabase, tenantId, {
      match: "all",
      conditions: [
        { field: "days_since_last_visit", operator: "gte", value: 30 },
      ],
    }),
    countSegment(supabase, tenantId, {
      match: "all",
      conditions: [
        { field: "days_since_last_visit", operator: "gte", value: 60 },
      ],
    }),
    countSegment(supabase, tenantId, {
      match: "all",
      conditions: [
        { field: "days_since_last_visit", operator: "gte", value: 90 },
      ],
    }),
    countSegment(supabase, tenantId, {
      match: "all",
      conditions: [
        { field: "birthday_month", operator: "eq", value: currentMonth },
      ],
    }),
    countSegment(supabase, tenantId, {
      match: "all",
      conditions: [{ field: "accepts_marketing", operator: "eq", value: true }],
    }),
  ]);

  // Total de clientes activos.
  const { count: totalActiveCustomers } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  // Ciudades y ticket promedio (dataset chico → se agrega en JS).
  const { data: rows } = await supabase
    .from("customers")
    .select("city, total_spent, total_visits")
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  const cityCounts = new Map<string, number>();
  let spentSum = 0;
  let spentN = 0;
  for (const r of rows ?? []) {
    if (r.city) cityCounts.set(r.city, (cityCounts.get(r.city) ?? 0) + 1);
    if ((r.total_visits ?? 0) > 0 && r.total_spent != null) {
      spentSum += Number(r.total_spent);
      spentN += 1;
    }
  }
  const topCities = [...cityCounts.entries()]
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const avgTicket = spentN > 0 ? Math.round(spentSum / spentN) : 0;

  // Top servicios por citas (últimas, agregado en JS).
  const { data: appts } = await supabase
    .from("appointments")
    .select("service_id, services(name)")
    .eq("tenant_id", tenantId)
    .limit(1000);
  const serviceCounts = new Map<string, number>();
  for (const a of appts ?? []) {
    const name = (a as { services?: { name?: string } | null }).services?.name;
    if (name) serviceCounts.set(name, (serviceCounts.get(name) ?? 0) + 1);
  }
  const topServices = [...serviceCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Citas próximas 7 días (proxy de carga de agenda).
  const now = new Date();
  const in7d = new Date(now.getTime() + 7 * 86400_000);
  const { count: upcomingAppointments7d } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", in7d.toISOString());

  const segmentFields = SEGMENT_FIELDS.map((f) => ({
    key: f.key,
    label: f.label,
    type: f.type,
    operators: f.operators,
    options: f.options,
    hint: f.hint,
  }));

  return {
    currency: "USD",
    totalActiveCustomers: totalActiveCustomers ?? 0,
    inactivity: { d30, d60, d90 },
    birthdaysThisMonth: birthdays,
    acceptsMarketing: marketing,
    topCities,
    topServices,
    avgTicket,
    upcomingAppointments7d: upcomingAppointments7d ?? 0,
    segmentFields,
  };
}
```

Nota: si el select `services(name)` falla por el nombre de la relación, usar dos consultas (traer `service_id`s de `appointments`, luego `services` por `in`). El dataset es chico.

- [ ] **Step 3: Typecheck + lint**

Run:
```bash
npx tsc --noEmit && npx biome check --write src/lib/ai/context.ts src/types/index.ts
```
Expected: sin errores.

- [ ] **Step 4: Verificar contra Elvis (script temporal)**

Crear un endpoint temporal o usar el endpoint de Task 8 para verificar. Como verificación aislada, añadir temporalmente al final de `src/lib/ai/context.ts` NO — en su lugar, confiar en la verificación integrada de Task 8 (el snapshot se loguea allí). Marcar este step como cubierto por Task 8.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/context.ts src/types/index.ts
git commit -m "feat(ai): constructor de snapshot agregado del tenant"
```

---

## Task 7: Cliente de IA — generar propuestas con Claude vía AI Gateway

**Files:**
- Modify: `package.json` (dependencia `ai`)
- Create: `src/lib/ai/campaign-suggester.ts`
- Modify: `src/types/index.ts` (tipos `AiProposal`, `GroundedProposal`)

**Interfaces:**
- Consumes: `TenantSnapshot` (Task 6); `ai` (`generateObject`, gateway por defecto).
- Produces: `suggestCampaigns(snapshot: TenantSnapshot): Promise<AiProposal[]>`; tipos `AiProposal` y `GroundedProposal` en `@/types`.

- [ ] **Step 1: Instalar el AI SDK**

Run (usar el gestor del repo; memoria indica bun para deps recientes, npm también sirve):
```bash
npm install ai
```
Expected: `ai` (>=7) queda en `dependencies`. Verificar que exista `node_modules/ai/docs/` (docs bundleadas).

- [ ] **Step 2: Confirmar el model ID actual del Gateway**

Run:
```bash
curl -s https://ai-gateway.vercel.sh/v1/models | jq -r '[.data[] | select(.id | startswith("anthropic/")) | .id] | reverse | .[]' | head -20
```
Expected: lista de modelos Claude. Elegir el Sonnet de mayor versión (p. ej. `anthropic/claude-sonnet-4.5`). Usar ese string en el Step 4. Si el curl falla (sin red), usar `anthropic/claude-sonnet-4.5` como default y confirmar luego.

- [ ] **Step 3: Añadir los tipos de propuesta**

En `src/types/index.ts` añadir:

```ts
/** Propuesta de campaña generada por el LLM (antes del grounding). */
export interface AiProposal {
  title: string;
  rationale: string;
  campaign_type: CampaignType;
  channel: CampaignChannel;
  rules: SegmentRules;
  message_template: string;
}

/** Propuesta con conteo real del motor + muestra (tras grounding). */
export interface GroundedProposal extends AiProposal {
  realCount: number;
  sample: { id: string; full_name: string; phone: string | null }[];
}
```

- [ ] **Step 4: Escribir el suggester**

Crear `src/lib/ai/campaign-suggester.ts`. Verificar la firma de `generateObject` contra `node_modules/ai/docs/` antes de escribir (el skill advierte que la API cambia). Contenido base:

```ts
// src/lib/ai/campaign-suggester.ts
// Genera propuestas de campaña con Claude vía AI Gateway a partir del snapshot.
import { generateObject } from "ai";
import { z } from "zod";
import type { AiProposal, TenantSnapshot } from "@/types";

// Modelo confirmado vía https://ai-gateway.vercel.sh/v1/models (usar el Sonnet más nuevo).
const MODEL = "anthropic/claude-sonnet-4.5";

// Esquema de una condición de segmento (refleja SegmentCondition).
const conditionSchema = z.object({
  field: z.string(),
  operator: z.enum([
    "eq",
    "ne",
    "gte",
    "lte",
    "in",
    "not_in",
    "contains",
    "contains_any",
    "between",
  ]),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.union([z.string(), z.number()])),
  ]),
});

const proposalSchema = z.object({
  proposals: z
    .array(
      z.object({
        title: z.string(),
        rationale: z.string(),
        campaign_type: z.enum([
          "reactivation",
          "last_minute",
          "transformation",
          "birthday",
          "custom",
        ]),
        channel: z.enum(["whatsapp", "email", "sms"]),
        rules: z.object({
          match: z.enum(["all", "any"]),
          conditions: z.array(conditionSchema),
        }),
        message_template: z.string(),
      }),
    )
    .max(4),
});

export async function suggestCampaigns(
  snapshot: TenantSnapshot,
): Promise<AiProposal[]> {
  const system = [
    "Eres un experto en marketing para clínicas de belleza y estética.",
    "Propones campañas segmentadas ACCIONABLES a partir de datos agregados.",
    "Reglas duras:",
    "- Usa SOLO los campos y operadores de la lista `segmentFields`. No inventes campos.",
    "- Cada propuesta debe apuntar a un segmento que exista en los datos (usa los conteos del snapshot).",
    "- El mensaje va en español, cálido, con el placeholder {{first_name}}, listo para WhatsApp.",
    "- Devuelve entre 2 y 4 propuestas, priorizando las de mayor impacto.",
  ].join("\n");

  const { object } = await generateObject({
    model: MODEL,
    schema: proposalSchema,
    system,
    prompt: `Datos del negocio (agregados, sin datos personales):\n${JSON.stringify(
      snapshot,
      null,
      2,
    )}`,
  });

  return object.proposals as AiProposal[];
}
```

- [ ] **Step 5: Typecheck + lint**

Run:
```bash
npx tsc --noEmit && npx biome check --write src/lib/ai/campaign-suggester.ts src/types/index.ts
```
Expected: sin errores. Si `generateObject` marca error de tipos, consultar `node_modules/ai/docs/` y `references/common-errors.md` del skill ai-sdk.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/ai/campaign-suggester.ts src/types/index.ts
git commit -m "feat(ai): cliente de propuestas de campaña con AI Gateway"
```

---

## Task 8: Endpoint de sugerencias con grounding

**Files:**
- Create: `src/app/api/ai/campaign-suggestions/route.ts`

**Interfaces:**
- Consumes: `requireTenantAccess` + `CAMPAIGN_WRITE_ROLES`, `buildTenantSnapshot` (Task 6), `suggestCampaigns` (Task 7), `validateRules` + `previewSegment` (motor), `supabaseAdmin`; gating por módulo `ai-assistant`.
- Produces: `POST /api/ai/campaign-suggestions` body `{ tenant_id }` → `{ proposals: GroundedProposal[] }`. Task 9 lo consume vía el service.

- [ ] **Step 1: Escribir el endpoint**

Crear `src/app/api/ai/campaign-suggestions/route.ts`:

```ts
// src/app/api/ai/campaign-suggestions/route.ts
// Orquesta: gate tenant + módulo → snapshot → LLM → grounding (conteo real).
import { type NextRequest, NextResponse } from "next/server";
import { buildTenantSnapshot } from "@/lib/ai/context";
import { suggestCampaigns } from "@/lib/ai/campaign-suggester";
import {
  CAMPAIGN_WRITE_ROLES,
  requireTenantAccess,
} from "@/lib/api/tenant-auth";
import {
  previewSegment,
  SegmentValidationError,
  validateRules,
} from "@/lib/segments/engine";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { GroundedProposal } from "@/types";

/** Verifica que el tenant tenga el módulo ai-assistant habilitado. */
async function moduleEnabled(tenantId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("tenant_modules")
    .select("is_enabled, modules!inner(slug)")
    .eq("tenant_id", tenantId)
    .eq("modules.slug", "ai-assistant")
    .maybeSingle();
  return !!data?.is_enabled;
}

export async function POST(request: NextRequest) {
  try {
    const { tenant_id } = await request.json();

    const access = await requireTenantAccess(tenant_id, CAMPAIGN_WRITE_ROLES);
    if (!access.ok)
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );

    if (!(await moduleEnabled(tenant_id)))
      return NextResponse.json(
        { error: "El módulo de IA no está habilitado para este tenant" },
        { status: 403 },
      );

    // 1) Snapshot agregado (sin PII).
    const snapshot = await buildTenantSnapshot(supabaseAdmin, tenant_id);

    // 2) Propuestas del LLM.
    const raw = await suggestCampaigns(snapshot);

    // 3) Grounding: validar reglas + conteo real; descartar inválidas/vacías.
    const grounded: GroundedProposal[] = [];
    for (const p of raw) {
      try {
        validateRules(p.rules);
      } catch (e) {
        if (e instanceof SegmentValidationError) continue;
        throw e;
      }
      const { count, sample } = await previewSegment(
        supabaseAdmin,
        tenant_id,
        p.rules,
      );
      if (count === 0) continue;
      grounded.push({
        ...p,
        realCount: count,
        sample: sample.slice(0, 5).map((c) => ({
          id: c.id,
          full_name: c.full_name,
          phone: c.phone,
        })),
      });
    }

    return NextResponse.json({ proposals: grounded });
  } catch (err) {
    console.error("Error en POST /api/ai/campaign-suggestions:", err);
    return NextResponse.json(
      { error: "No se pudieron generar sugerencias. Reintenta." },
      { status: 502 },
    );
  }
}
```

- [ ] **Step 2: Configurar la env var**

Añadir `AI_GATEWAY_API_KEY=` a `.env` (valor real de la key del Gateway) y, si existe `.env.example`, documentar la variable allí.

- [ ] **Step 3: Typecheck + lint**

Run:
```bash
npx tsc --noEmit && npx biome check --write src/app/api/ai/campaign-suggestions/route.ts
```
Expected: sin errores.

- [ ] **Step 4: Verificar el endpoint contra Elvis**

Con `npm run dev` y sesión de un usuario owner/admin de Elvis, en la consola del navegador:
```js
await fetch('/api/ai/campaign-suggestions', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ tenant_id:'<uuid Elvis>' }) }).then(r=>r.json())
```
Expected: `{ proposals: [...] }` con 2-4 propuestas, cada una con `realCount > 0` y `rules` de campos válidos. Revisar en la terminal del server que no haya errores. Si devuelve 502, revisar `AI_GATEWAY_API_KEY` y el model ID.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/ai/campaign-suggestions/route.ts
git commit -m "feat(ai): endpoint de sugerencias con grounding por motor real"
```

---

## Task 9: Service, hook y UI del Asistente IA (tenant)

**Files:**
- Create: `src/lib/services/ai-campaigns.ts`
- Create: `src/hooks/supabase/use-ai-campaigns.ts`
- Create: `src/app/t/[tenant]/ai-assistant/page.tsx`
- Create: `src/components/ai/ai-proposal-card.tsx`

**Interfaces:**
- Consumes: `POST /api/ai/campaign-suggestions` (Task 8); `campaignsService.create` (`src/lib/services/campaigns.ts`); `useAuthStore` para `tenant`.
- Produces: página `/t/[tenant]/ai-assistant` con botón "Generar sugerencias", tarjetas de propuesta y acción "Crear campaña".

- [ ] **Step 1: Escribir el service**

Crear `src/lib/services/ai-campaigns.ts`:

```ts
// src/lib/services/ai-campaigns.ts
import type { GroundedProposal } from "@/types";

async function parseJson<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error((json as { error?: string }).error || "Error en la solicitud");
  return json as T;
}

class AiCampaignsService {
  /** Pide propuestas de campaña al backend (IA + grounding). */
  async suggest(tenantId: string): Promise<GroundedProposal[]> {
    const res = await fetch("/api/ai/campaign-suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId }),
    });
    const { proposals } = await parseJson<{ proposals: GroundedProposal[] }>(
      res,
    );
    return proposals;
  }
}

export const aiCampaignsService = new AiCampaignsService();
```

- [ ] **Step 2: Escribir el hook**

Crear `src/hooks/supabase/use-ai-campaigns.ts`:

```ts
// src/hooks/supabase/use-ai-campaigns.ts
import { useState } from "react";
import { aiCampaignsService } from "@/lib/services/ai-campaigns";
import type { GroundedProposal } from "@/types";

/** Genera propuestas de campaña bajo demanda (no SWR: es una acción). */
export function useAiCampaignSuggestions(tenantId: string | null) {
  const [proposals, setProposals] = useState<GroundedProposal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  async function generate() {
    if (!tenantId) return;
    setIsLoading(true);
    setError(null);
    try {
      setProposals(await aiCampaignsService.suggest(tenantId));
      setHasRun(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  function dismiss(index: number) {
    setProposals((prev) => prev.filter((_, i) => i !== index));
  }

  return { proposals, isLoading, error, hasRun, generate, dismiss };
}
```

- [ ] **Step 3: Escribir la tarjeta de propuesta**

Crear `src/components/ai/ai-proposal-card.tsx`:

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { campaignsService } from "@/lib/services/campaigns";
import type { GroundedProposal } from "@/types";

interface Props {
  tenantId: string;
  proposal: GroundedProposal;
  onDismiss: () => void;
}

export function AiProposalCard({ tenantId, proposal, onDismiss }: Props) {
  const [message, setMessage] = useState(proposal.message_template);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);

  async function createCampaign() {
    setCreating(true);
    try {
      await campaignsService.create({
        tenant_id: tenantId,
        name: proposal.title,
        description: proposal.rationale,
        campaign_type: proposal.campaign_type,
        channel: proposal.channel,
        rules_snapshot: proposal.rules,
        message_template: message,
      });
      setCreated(true);
      toast.success("Campaña creada como borrador");
    } catch (e) {
      toast.error((e as Error).message || "No se pudo crear la campaña");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{proposal.title}</h3>
          <p className="text-sm text-muted-foreground">{proposal.rationale}</p>
        </div>
        <Badge variant="secondary">{proposal.realCount} clientes</Badge>
      </div>

      {proposal.sample.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Ej: {proposal.sample.map((s) => s.full_name).join(", ")}
        </p>
      )}

      <Textarea
        className="mt-3"
        rows={4}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <div className="mt-3 flex gap-2">
        <Button onClick={createCampaign} disabled={creating || created}>
          {created ? "Campaña creada" : creating ? "Creando…" : "Crear campaña"}
        </Button>
        <Button variant="ghost" onClick={onDismiss}>
          Descartar
        </Button>
      </div>
    </div>
  );
}
```

Nota: verificar que existan `src/components/ui/{badge,button,textarea}.tsx` (patrón shadcn del repo). Si falta alguno, añadirlo con `npx shadcn@latest add <componente>`.

- [ ] **Step 4: Escribir la página**

Crear `src/app/t/[tenant]/ai-assistant/page.tsx`:

```tsx
"use client";

import { Sparkles } from "lucide-react";
import { AiProposalCard } from "@/components/ai/ai-proposal-card";
import { Button } from "@/components/ui/button";
import { useAiCampaignSuggestions } from "@/hooks/supabase/use-ai-campaigns";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function AiAssistantPage() {
  const { tenant } = useAuthStore();
  const tenantId = tenant?.id ?? null;
  const { proposals, isLoading, error, hasRun, generate, dismiss } =
    useAiCampaignSuggestions(tenantId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Sparkles className="h-6 w-6 text-primary" /> Asistente IA
          </h1>
          <p className="text-muted-foreground">
            Sugerencias de campañas basadas en el comportamiento de tus
            clientes.
          </p>
        </div>
        <Button onClick={generate} disabled={isLoading || !tenantId}>
          {isLoading ? "Generando…" : "Generar sugerencias"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {hasRun && !isLoading && proposals.length === 0 && !error && (
        <p className="text-muted-foreground">
          No hay segmentos accionables ahora mismo. Vuelve a intentarlo más
          tarde.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {proposals.map((p, i) => (
          <AiProposalCard
            key={`${p.title}-${i}`}
            tenantId={tenantId as string}
            proposal={p}
            onDismiss={() => dismiss(i)}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Typecheck, lint y build**

Run:
```bash
npx tsc --noEmit && npx biome check --write src/lib/services/ai-campaigns.ts src/hooks/supabase/use-ai-campaigns.ts src/components/ai/ai-proposal-card.tsx "src/app/t/[tenant]/ai-assistant/page.tsx" && npm run build
```
Expected: typecheck, lint y build sin errores.

- [ ] **Step 6: Verificar el flujo completo (demo)**

Run: `npm run dev`. Como owner/admin de Elvis: sidebar → "Asistente IA" → "Generar sugerencias" → aparecen tarjetas con conteos reales → editar el mensaje → "Crear campaña" → toast de éxito → ir a `/t/elviz/campaigns` y confirmar la campaña en estado borrador.
Expected: la campaña aparece con el `message_template` y las reglas correctas.

- [ ] **Step 7: Commit**

```bash
git add src/lib/services/ai-campaigns.ts src/hooks/supabase/use-ai-campaigns.ts src/components/ai/ai-proposal-card.tsx "src/app/t/[tenant]/ai-assistant/page.tsx"
git commit -m "feat(ai): página Asistente IA con propuestas y creación de campaña"
```

---

## Verificación final (cierre)

- [ ] `npx tsc --noEmit` limpio.
- [ ] `npm run lint` limpio.
- [ ] `npm run build` OK.
- [ ] Demo end-to-end: activar/desactivar "Asistente IA" desde `/modules` refleja en el sidebar del tenant; generar sugerencias devuelve conteos reales; crear campaña deja un borrador en `/t/elviz/campaigns`.
- [ ] Gating: con el módulo apagado, `POST /api/ai/campaign-suggestions` responde 403 y la ruta `/t/elviz/ai-assistant` queda bloqueada por el gating existente.
- [ ] Generar el MD de handoff fechado en `docs/superpowers/context/` (convención del repo). Commits los hace el usuario / según acuerdo.
