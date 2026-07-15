# Revisión de Cobertura — Análisis "Seguimiento Integral de Clientes para Clínica de Belleza"

> Validación cruzada entre el documento `updates/analisis.md`, el código de la app SaaS y la base de datos real (Supabase `rrnysepngbycvuciodoj`).
> Fecha: 2026-07-10 · Revisión de solo lectura (no se tocó código).

---

## 0. Veredicto ejecutivo

**¿La app base cubre la mayoría del análisis? Sí, el ~65-70%, y cubre con solvencia todo el núcleo transaccional (Fase 1 + la parte contable de Fase 2).**

La plataforma es sólida donde el análisis pone el *core*: agendamiento, base de clientes rica, POS, caja, comisiones y un sistema real de módulos activables por tenant. Lo que falta es, casi exactamente, **la mitad "inteligente y de crecimiento"** del análisis: campañas, segmentación accionable, encuestas, recordatorios automáticos y el módulo de IA. Hoy esos existen como **tablas/stubs sin UI ni motor**, no como funcionalidad viva.

| Bloque del análisis | Estado | Cobertura |
|---|---|---|
| Pilar 1 · Entendimiento General | 🟢 Bien | ~85% |
| Pilar 2 · Gestión Comercial y Operativa | 🟢 Bien | ~85% |
| Pilar 3 · Categorización y Segmentación | 🟡 Datos sí, motor no | ~35% |
| Pilar 4 · Fidelización y Crecimiento | 🔴 Faltante | ~20% |
| Fase 1 · Core Citas e Interacción | 🟢 Bien | ~85% |
| Fase 2 · Negocio, Automatización e IA | 🟡 Contabilidad sí; campañas/IA/pasarela no | ~50% |
| Modularidad generativa multitenant | 🟢 Real, con matices | ~75% |

---

## 1. Lo que está ALINEADO (ya lo cubrimos)

### Pilar 1 — Entendimiento General ✅
- **Base de datos centralizada de clientes**: tabla `customers` muy completa — `tags[]`, `birth_date`, `gender`, `city`, `address`, `how_found_us`, `total_spent`, `total_visits`, `last_visit_at`, `loyalty_points`, `preferred_specialist_id`, `preferred_branch_id`, preferencias de notificación y moneda. Es una base más rica de lo que el análisis exige.
- **Agenda unificada de profesionales**: `appointments`, `specialists`, `specialist_schedules`, `schedule_exceptions`, vista `v_specialist_availability`, `workstations` (apartado del espacio físico) y `v_daily_appointments`. El planificador cruza disponibilidad real.
- **Comportamiento de consumo/asistencia**: los contadores (`total_spent`, `total_visits`, `last_visit_at`) ya se persisten por cliente.

### Pilar 2 — Gestión Comercial y Operativa ✅
Este es el punto más fuerte de la app y coincide de lleno con la Fase 2 del análisis:
- **Ventas / ingresos / egresos / comisiones enlazados**: `orders`/`order_items`, `invoices`/`invoice_lines`/`invoice_payments`, `commissions`/`commission_rules`, `specialist_debts`/`specialist_consumptions`, y toda la caja (`cash_register_sessions`, `_movements`, `_closures`, `_summaries`, `cash_transfers`).
- **Pago enlazado a la reserva**: `appointments.advance_amount`/`advance_paid_amount` + facturación.
- **Balance de caja automático**: apertura/cierre/historial de cierres implementados (`/caja/apertura`, `/cierre`, `/cierres`).
- **Egresos detallados y liquidación de comisiones**: ya operativos (Fase 2 tareas 3-5 completadas).

### Fase 1 — Core Citas ✅ (parcial alto)
Cubierto: registrar/actualizar/consultar clientes · agendar y consultar citas · validar disponibilidad y apartar workstation · consultar agenda integral (clínica/profesional/cliente) · **app de cliente completa** (`/c/[tenant]/...`) para autoservicio de reservas · seguimiento de estados de la cita **con confirmación/cancelación por WhatsApp** (webhook Twilio).

### Modularidad generativa ✅ (real)
- Sistema real de módulos: tabla `modules` (14 módulos, `is_core` + `category` core/addon/sales) × `tenant_modules` (`is_enabled`, `config`).
- **Gating dinámico verificado en datos**: Elvis Studio = 11 módulos (con Ecommerce); Denty Med = 10 (sin Ecommerce). La diferenciación por comercio funciona hoy.
- El sidebar se construye desde `useTenant().modules` filtrando por `is_enabled` y un set de `implementedModuleSlugs`.
- **Punto 3 de la guía de validación (campos extensibles) parcialmente resuelto**: `customers.tags[]` da metadata flexible por comercio.

---

## 2. Lo que se puede MEJORAR (existe pero flojo/incompleto)

1. **Recolector de Solicitudes conversacional** — Hoy el webhook Twilio (`/api/webhooks/twilio`) solo reconoce palabras clave `sí/no/confirmar/cancelar` sobre la última cita. **No** consulta disponibilidad, **no** ofrece horarios libres, **no** agenda desde el chat. El análisis lo describe como un concentrador que "responde interactivamente con opciones libres" — eso todavía no existe.

2. **Recordatorios: manuales, no automáticos** — El envío WhatsApp/Email saliente existe (`/api/appointments/notify`, Resend + Twilio + ICS), pero se dispara puntualmente por cita. **No hay cron/scheduler** para recordatorios programados (24h antes, etc.). El análisis los pide como automatización de fidelización.

3. **Modularidad — gating solo de navegación** — El `is_enabled` oculta el ítem del sidebar, pero las rutas `/t/[tenant]/<modulo>` no validan el módulo server-side: acceso directo por URL no se bloquea. Falta un guard en layout/middleware.

4. **Config por módulo sin usar** — `modules.config_schema` y `default_config` están casi todos en `{}` (solo Ecommerce los usa). La promesa de módulos parametrizables por tenant está a medias.

5. **Página admin de módulos hardcodeada** — `/(root)/modules/page.tsx` renderiza una lista fija en código (comentario *"En producción, cargar de Supabase"*) y ni siquiera coincide con los 14 módulos reales de la BD. No permite activar/desactivar módulos por tenant desde UI.

6. **Reportador / estadísticas avanzadas** — Existe `dashboard` con métricas y el módulo `reports` está registrado, pero **no hay página de reportes** ni consolidación analítica (el módulo es un stub). El "Reportador" del diagrama está a nivel dashboard básico.

7. **Canales de entrada acoplados a WhatsApp** — Solo Twilio/WhatsApp. El análisis (punto 1 de validación) exige un `Recolector` agnóstico al canal (widget web, Telegram, FB, IG) con un formato de solicitud unificado. Hoy no hay esa capa de abstracción.

---

## 3. Lo que se DEBE IMPLEMENTAR (falta por completo)

| # | Faltante | Referencia en el análisis | Estado actual |
|---|---|---|---|
| 1 | **Módulo de Campañas** (transformación de cliente, última hora para rellenar agenda, recuperación de inactivos) | §2 Módulo de Campañas · Fase 2 | Módulo `campaigns` existe en BD como *addon* pero **sin ninguna ruta, servicio ni UI** |
| 2 | **Motor de Segmentación/Categorización dinámica** (por zona, ingresos, tratamiento, edad, referidos) | Pilar 3 completo | Los **campos existen** (`tags`, `city`, `total_spent`, `birth_date`, `how_found_us`) pero no hay motor de reglas ni vistas de segmentos |
| 3 | **Encuestas de servicio / fidelización** | Fase 1 ("llenar y revisar encuestas") + Pilar 4 | **No existe** tabla ni UI de encuestas. Es el único faltante explícito de la Fase 1 Core |
| 4 | **Ofertas de cumpleaños automatizadas** | Pilar 4 | `birth_date` existe; no hay disparador ni campaña |
| 5 | **Recordatorios automáticos programados** | Pilar 4 | Falta scheduler/cron (ver mejora #2) |
| 6 | **Módulo de IA** (proponer campañas segmentadas desde el comportamiento) | §2 Módulo de IA · Fase 2 · pregunta bonus | **Cero**: sin dependencias (`openai`/`anthropic`/`ai-sdk`) ni código |
| 7 | **Pasarela de pago directa** (procesamiento real, no solo registro) | Fase 2 ("integración de pasarelas de pago") | El POS registra pagos manualmente; no hay Stripe/MercadoPago/etc. |
| 8 | **Canal de entrada agnóstico** (widget web / Telegram / FB / IG) | §4 punto 1 | Solo WhatsApp/Twilio |
| 9 | **Sistema de referidos** | Pilar 3 ("referidos") | Solo `how_found_us` como texto libre; sin tracking real |

---

## 4. Pregunta bonus — ¿Debería haber un componente de IA?

**Sí, y el propio análisis lo coloca como pieza central de la Fase 2 (el "Módulo de IA" alimenta al "Módulo de Campañas").** Es además el diferenciador comercial más claro para vender la capa Premium. Hoy la app tiene *los datos* pero no *la inteligencia que los explota*.

Dónde encaja mejor la IA en esta plataforma (de mayor a menor ROI):

1. **Proponer campañas segmentadas** (lo que pide el análisis): la IA lee `customers` + histórico de `appointments`/`orders` y sugiere segmentos accionables — "18 clientes sin visita en 90 días", "cumpleaños esta semana", "huecos de agenda mañana por la tarde" — con copy listo para WhatsApp. Es el uso #1.
2. **Recolector conversacional** (agente que agenda por WhatsApp): convertir el webhook actual de "confirmar/cancelar" en un agente que consulta `v_specialist_availability` y cierra la cita en lenguaje natural.
3. **Resúmenes/insights del Reportador**: convertir métricas del dashboard en lenguaje natural ("tus ingresos cayeron 12% vs. mes pasado, concentrado en el servicio X").
4. **Enriquecer segmentación**: autoclasificar clientes (VIP, en riesgo de fuga, alto ticket) para poblar `tags[]` automáticamente.

**Recomendación técnica** (encaja con el stack Next.js 16 / Vercel):
- Usar **Vercel AI Gateway + Vercel AI SDK** con modelos Claude (p. ej. `claude-opus-4-8` para propuestas de campaña, un modelo más económico para clasificación en lote). Evita acoplarse a un proveedor y da observabilidad/fallback.
- Empaquetarlo como **módulo addon `ai-assistant`** (o reactivar `campaigns` con IA dentro), respetando el patrón `modules`/`tenant_modules` — así se cobra como Premium y se activa por tenant, exactamente como propone el análisis.
- Empezar por un endpoint "sugerir campaña" que devuelva segmento + mensaje propuesto, con el admin aprobando antes de enviar (IA propone, humano dispara — tal como describe el diagrama: *"disparado de forma manual por el admin o automatizada por la IA"*).

**Conclusión de la bonus:** no solo *debería* haber IA — es la pieza que cierra la Fase 2 y la que da sentido a los campos de segmentación y al módulo de campañas que hoy están vacíos. Es el mejor candidato para el siguiente hito.

---

## 5. Resumen de una línea

Tenemos un **ERP-agenda multitenant transaccionalmente completo y modular**; falta construir encima la **capa de crecimiento**: campañas + segmentación accionable + encuestas + recordatorios automáticos + IA, más una pasarela de pago real y un recolector de canal agnóstico. Ese es, con precisión, el roadmap que dibuja el análisis.
