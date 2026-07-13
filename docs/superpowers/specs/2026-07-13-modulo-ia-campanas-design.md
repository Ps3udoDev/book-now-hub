# Spec — Módulo de IA: Sugerencia de Campañas Segmentadas

> Fecha: 2026-07-13 · Estado: diseño aprobado (brainstorming)
> Referencia origen: `updates/revision-cobertura-analisis.md` §4 (pregunta bonus) y §3 (faltante #6).

## 1. Objetivo y alcance

Construir el **Módulo de IA** como addon activable por tenant (`ai-assistant`) cuyo primer uso es **proponer campañas segmentadas**: la IA lee un resumen agregado del tenant, sugiere 2-4 campañas accionables (segmento + copy de WhatsApp + por qué), el backend valida y **re-cuenta cada propuesta con el motor de segmentación real**, y el admin aprueba una propuesta para generar un **borrador de campaña** que entra al flujo de campañas ya existente.

**Principio rector:** *IA propone, humano dispara.* La IA nunca envía; solo prellena un borrador que el admin revisa y envía con el flujo actual.

### Fuera de alcance (v1, YAGNI)
- Otros usos de IA (agente conversacional WhatsApp, resúmenes del dashboard, autoclasificación de tags). Quedan para hitos futuros.
- Persistir el segmento en `customer_segments` al aprobar (solo se crea la campaña con `rules_snapshot`). Se puede añadir después.
- Envío automático / cron. El envío sigue siendo el botón manual existente.
- Modo mock sin API key (se usa AI Gateway real).

## 2. Contexto: lo que YA existe (no se reconstruye)

La revisión de cobertura era anterior al trabajo de Fase 4. Hoy ya está implementado y funcionando:

- **Motor de segmentación** — `src/lib/segments/engine.ts` (`previewSegment`, `resolveSegmentCustomers`, `validateRules`, `SegmentValidationError`) + `src/lib/segments/fields.ts` (`SEGMENT_FIELDS`, whitelist de campos/operadores, `getSegmentField`). Traduce un `SegmentRules` a queries reales sobre `customers` y devuelve **conteo verdadero + muestra**.
- **DSL de reglas** — `SegmentRules { match: "all"|"any"; conditions: SegmentCondition[] }` con campos whitelisted: `city`, `total_spent`, `total_visits`, `loyalty_points`, `gender`, `how_found_us`, `tags`, `accepts_marketing`, `days_since_last_visit`, `age`, `birthday_month`, `service_consumed`. Operadores: `eq, ne, gte, lte, in, not_in, contains, contains_any, between`.
- **Campañas** — tablas `campaigns` (con `segment_id`, `rules_snapshot`, `message_template`, `campaign_type`, `channel`, `status`, `stats`) y `campaign_recipients`. Servicios `src/lib/services/campaigns.ts` y `segments.ts`; hooks `use-campaigns.ts`, `use-segments.ts`; componentes `campaign-wizard.tsx`, `segment-preview.tsx`, `campaign-card.tsx`. Flujo: crear → `materialize` (inserta recipients) → `send` (stub).
- **Gating de módulos** — `src/lib/modules/route-map.ts` (`ROUTE_MODULE_MAP`, `UNGATED_SEGMENTS`, `requiredModuleForSegment`), sidebar `src/components/tenant/tenant-sidebar.tsx` (`implementedModuleSlugs`, `moduleIcons`). Los módulos se activan por tenant vía `tenant_modules.is_enabled`.
- **API auth** — `requireTenantAccess(tenantId)` en `src/lib/api/tenant-auth.ts`; escrituras vía `supabaseAdmin`.

Tipos relevantes en `src/types/index.ts`: `CampaignType = "reactivation" | "last_minute" | "transformation" | "birthday" | "custom"`, `CampaignChannel = "whatsapp" | "email" | "sms"`, `CampaignStatus = "draft" | "ready" | "queued" | "sent" | "cancelled"`.

## 3. Arquitectura de la solución

Flujo end-to-end:

```
Super admin: activa "ai-assistant" en tenant_modules  ──►  sidebar del tenant muestra "Asistente IA"
        │
Tenant admin abre /t/[tenant]/ai-assistant  ──►  clic "Generar sugerencias"
        │
POST /api/ai/campaign-suggestions
        │  1. gate: requireTenantAccess + módulo ai-assistant activo
        │  2. buildTenantSnapshot(tenant_id)  ── agregados, SIN PII
        │  3. generateObject(Claude vía AI Gateway, schema Zod)  ── propuestas
        │  4. GROUNDING: por propuesta → validateRules() + previewSegment()
        │         · descarta reglas inválidas o count 0
        │         · adjunta count real + sample
        └► devuelve propuestas validadas con conteos reales
        │
UI muestra tarjetas  ──►  admin edita copy  ──►  "Crear campaña"
        │
POST /api/campaigns (flujo existente)  ── status draft, rules_snapshot + message_template prellenados
        │
flujo de campañas existente: materialize → send (manual)
```

### 3.1 Módulos y piezas nuevas

| Pieza | Ruta | Responsabilidad |
|---|---|---|
| Registro del módulo | migración SQL + seed en `modules` | Alta del addon `ai-assistant` (category `addon`, `is_core=false`) |
| Gating | `route-map.ts`, `tenant-sidebar.tsx` | Mapear segmento `ai-assistant` → módulo `ai-assistant` en `ROUTE_MODULE_MAP`; ícono en `moduleIcons`; añadir a `implementedModuleSlugs` |
| Constructor de contexto | `src/lib/ai/context.ts` | `buildTenantSnapshot(tenantId): TenantSnapshot` — agregados sin PII |
| Cliente IA | `src/lib/ai/campaign-suggester.ts` | `generateObject` con AI SDK + schema Zod; construye prompt |
| Grounding | dentro del endpoint | `validateRules` + `previewSegment` por propuesta |
| Endpoint | `src/app/api/ai/campaign-suggestions/route.ts` | Orquesta gate → snapshot → IA → grounding |
| Servicio cliente | `src/lib/services/ai-campaigns.ts` | `suggest(tenantId): Promise<GroundedProposal[]>` |
| Hook | `src/hooks/supabase/use-ai-campaigns.ts` | Estado de carga/error de la generación |
| UI tenant | `src/app/t/[tenant]/ai-assistant/page.tsx` + componentes | Botón generar, tarjetas de propuesta, acciones |
| Gestión de módulos admin | `src/app/(root)/modules/page.tsx` (reescritura) + API | Toggle real `tenant_modules.is_enabled` por tenant |
| Seed demo | `database/seed-demo-ai.sql` (o script TS) | Poblar tenant demo con datos con textura |

### 3.2 Contrato de datos

**TenantSnapshot** (entrada al LLM, sin PII):
```ts
interface TenantSnapshot {
  currency: string;
  totalActiveCustomers: number;
  inactivity: { d30: number; d60: number; d90: number };        // conteos vía previewSegment
  birthdaysThisMonth: number;
  acceptsMarketing: number;
  topCities: { city: string; count: number }[];                 // top 5
  topServices: { name: string; count: number }[];               // top 5 por citas
  avgTicket: number;
  openScheduleSlotsNext7d: number;                              // huecos de agenda
  segmentFields: SegmentFieldSummary[];                          // whitelist con label/operadores/opciones
}
```

**Salida del LLM** (schema Zod, N propuestas):
```ts
interface AiProposal {
  title: string;                 // ej. "Reactivar clientes dormidos"
  rationale: string;             // por qué ahora, en 1-2 frases
  campaign_type: CampaignType;
  channel: CampaignChannel;      // default "whatsapp"
  rules: SegmentRules;           // SOLO campos de la whitelist
  message_template: string;      // copy con placeholders {{first_name}}
}
```

**GroundedProposal** (lo que devuelve el endpoint tras grounding):
```ts
interface GroundedProposal extends AiProposal {
  realCount: number;             // del motor, no del LLM
  sample: Pick<Customer, "id"|"full_name"|"phone">[];  // ~5, para preview
}
```

### 3.3 Grounding (confiabilidad)

Regla dura: **ningún número mostrado proviene del LLM.** Para cada propuesta devuelta:
1. `validateRules(proposal.rules)` — si lanza `SegmentValidationError`, se descarta la propuesta (campo/operador alucinado).
2. `previewSegment(supabaseAdmin, tenantId, proposal.rules)` — obtiene `count` + `sample` reales.
3. Si `count === 0`, se descarta (no ofrecer campañas vacías).
4. Se adjunta `realCount` y `sample` (solo campos necesarios para preview: nombre, teléfono).

Si tras el filtro quedan 0 propuestas, la UI muestra un estado vacío honesto ("No hay segmentos accionables ahora mismo").

## 4. Integración con IA (Vercel AI Gateway)

- **SDK**: `ai` (Vercel AI SDK), función `generateObject` con schema Zod para salida estructurada y validada.
- **Modelo**: string `anthropic/claude-...` vía AI Gateway (un modelo potente para las propuestas). Sin acoplarse a `@ai-sdk/anthropic` directo.
- **Env**: `AI_GATEWAY_API_KEY` en `.env` (en prod, OIDC de Vercel). Documentar en README/`.env.example`.
- **Prompt**: system con rol (experto en marketing de clínicas de belleza), el `TenantSnapshot` serializado, la whitelist `SEGMENT_FIELDS` con sus operadores/opciones, y la instrucción de emitir SOLO reglas válidas con esos campos. Copy en español, tono del negocio, placeholders `{{first_name}}`.
- **Costo/control**: prompt pequeño (solo agregados); tope de 4 propuestas; `maxOutputTokens` acotado. Opción futura de cachear la última corrida por tenant (no en v1).
- **Errores**: fallo de red/gateway → 502 con mensaje claro; la UI muestra "No se pudo generar, reintenta". El endpoint nunca cae si el LLM devuelve basura: el grounding filtra.

## 5. UI

### 5.1 Tenant — `/t/[tenant]/ai-assistant`
- Encabezado + botón **"Generar sugerencias"** (loading state mientras corre el endpoint).
- Lista de tarjetas `AiProposalCard`: título, `rationale`, badge de **conteo real** ("42 clientes"), preview de muestra (reutiliza patrón de `segment-preview`), `message_template` **editable** (textarea).
- Acciones por tarjeta: **"Crear campaña"** → `campaignsService.create({ tenant_id, name: title, campaign_type, channel, rules_snapshot: rules, message_template })` (status queda `draft`), toast de éxito y link a la campaña; **"Descartar"** → oculta la tarjeta.
- Estado vacío honesto cuando no hay propuestas con conteo > 0.

### 5.2 Super admin — reescritura de `/(root)/modules/page.tsx`
- Selector de tenant → tabla de módulos desde BD (`modules` ⋈ `tenant_modules`), no lista hardcodeada.
- Switch por módulo addon (incluido `ai-assistant`) que hace toggle de `tenant_modules.is_enabled`.
- Escritura vía nueva API admin (`POST/PATCH /api/admin/tenant-modules`) usando `supabaseAdmin`, protegida para global admin.
- Al activar `ai-assistant`, el tenant ve "Asistente IA" en su sidebar (gating existente).

## 6. Seed de demo

Script `database/seed-demo-ai.sql` (idempotente, parametrizado por `tenant_id` demo) que inserta/actualiza ~40 `customers` con textura garantizada:
- ~10 con `last_visit_at` > 90 días (dormidos).
- ~8 con `birth_date` en el mes actual (cumpleaños).
- Gasto (`total_spent`) y visitas variados; algunos con `tags` VIP; mezcla de `city` y `how_found_us`; mayoría con `accepts_marketing = true`.
- Algunas `appointments` para poblar `service_consumed` y `topServices`.

Objetivo: que `inactivity.d90`, `birthdaysThisMonth`, etc. nunca salgan en 0 durante el demo.

## 7. Plan de demo (narrativa para el admin)

1. **Super admin** → Módulos → elige el tenant demo → activa **"Asistente IA"** con el switch. *("se integra desde aquí")*
2. Entra al tenant → sidebar muestra **"Asistente IA"**.
3. Clic **"Generar sugerencias"** → aparecen 2-4 tarjetas con conteos reales y copy listo. *("lo que hace")*
4. Elige una → **"Crear campaña"** → borrador prellenado en el flujo de campañas → materializar/enviar (manual).

## 8. Testing / verificación

- **Determinista y verificable sin LLM**: `buildTenantSnapshot` y el grounding usan el motor real; con el seed cargado se pueden verificar los conteos manualmente (comparar snapshot vs. `previewSegment` con reglas conocidas).
- **Endpoint**: probar con el tenant demo que devuelve propuestas con `realCount > 0` y reglas válidas; probar que reglas inválidas del LLM se descartan (grounding).
- **Gating**: con el módulo apagado, `/t/[tenant]/ai-assistant` se bloquea (route-map) y el endpoint responde 403; con el módulo encendido, pasa.
- **Toggle admin**: activar/desactivar `ai-assistant` para un tenant refleja en el sidebar del tenant.
- **Build/tsc/biome** OK antes de cerrar (convención del repo).

## 9. Necesidades / dependencias

- Dep nueva: `ai` (Vercel AI SDK). `zod` ya presente.
- Env nueva: `AI_GATEWAY_API_KEY` (documentar en `.env.example`).
- Migración: alta del módulo `ai-assistant` en `modules`; activación en `tenant_modules` para el/los tenant de prueba (o vía el toggle admin).
- Convenciones del repo: tipos en `src/types/index.ts`, patrón 3 capas (service → hook → UI), escrituras vía API + `supabaseAdmin`, comentarios en español, `npx biome check --write` tras crear archivos, migración con `supabase db push` (`gen_random_uuid()`, trigger `public.update_updated_at()`), copia legible en `database/*.sql`.

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| LLM alucina campos/números | Grounding con motor real; whitelist `SEGMENT_FIELDS`; se descartan propuestas inválidas |
| Fuga de PII al proveedor | Solo se envían agregados; nunca filas de clientes |
| Costo de tokens | Prompt pequeño, tope de propuestas, `maxOutputTokens` acotado |
| Segmentos vacíos en demo | Seed con textura garantizada |
| Reescribir toda la gestión de módulos es grande | Acotar a un gestor por-tenant funcional (selector tenant + switches), sin rediseñar el resto de la consola admin |
