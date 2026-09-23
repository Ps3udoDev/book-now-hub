-- Integracion Sentry -> Odoo Helpdesk: vinculo issue de Sentry <-> ticket de Odoo.
-- Ver docs/integracion-sentry-odoo.md.
--
-- Odoo no tiene un campo donde guardar el ID del issue de Sentry, asi que la
-- correspondencia vive aca. Sirve para tres cosas:
--   1. Idempotencia: un error = un ticket; las repeticiones van como nota interna.
--   2. Reincidencia: si el ticket vinculado ya esta cerrado y el error vuelve,
--      se abre un ticket nuevo que referencia al anterior (nueva fila).
--   3. Tope diario: se cuentan las filas creadas en el dia.
--
-- Tabla interna del sistema (no es por tenant). Solo la escribe y lee la ruta
-- /api/sentry-odoo con supabaseAdmin; RLS activo sin politicas = sin acceso
-- para anon/authenticated.

CREATE TABLE IF NOT EXISTS public.sentry_odoo_tickets (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sentry_issue_id  text NOT NULL,
  sentry_project   text,
  odoo_ticket_id   integer NOT NULL,
  titulo           text NOT NULL,
  -- Alertas recibidas para este ticket (1 = la que lo creo).
  alertas          integer NOT NULL DEFAULT 1 CHECK (alertas >= 1),
  -- Ticket anterior del mismo issue, si este se abrio por reincidencia.
  ticket_anterior  integer,
  created_at       timestamptz NOT NULL DEFAULT now(),
  last_alert_at    timestamptz NOT NULL DEFAULT now()
);

-- Busqueda del ticket vigente de un issue (el mas reciente).
CREATE INDEX IF NOT EXISTS idx_sentry_odoo_tickets_issue
  ON public.sentry_odoo_tickets (sentry_issue_id, created_at DESC);

-- Conteo del tope diario.
CREATE INDEX IF NOT EXISTS idx_sentry_odoo_tickets_created
  ON public.sentry_odoo_tickets (created_at DESC);

-- Un mismo ticket de Odoo no puede quedar vinculado dos veces.
CREATE UNIQUE INDEX IF NOT EXISTS uq_sentry_odoo_tickets_ticket
  ON public.sentry_odoo_tickets (odoo_ticket_id);

ALTER TABLE public.sentry_odoo_tickets ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.sentry_odoo_tickets FROM anon, authenticated;
