-- ═══════════════════════════════════════════════════════════════════════
-- FASE 4 — CAMPAÑAS + SEGMENTACIÓN
-- Fecha: 2026-07-10
--
-- INSTRUCCIONES: Ejecutar en el SQL Editor de Supabase (o vía supabase db push).
-- DEPENDENCIAS: tenants, customers, auth.users
--
-- Crea 3 tablas nuevas:
--   1. customer_segments   → definiciones reutilizables de segmento (reglas jsonb)
--   2. campaigns           → registro de campaña (segmento o reglas inline)
--   3. campaign_recipients → snapshot de destinatarios (congela a quién y con qué mensaje)
--
-- Los "enums" se implementan como TEXT + CHECK (más fácil de evolucionar que
-- enums nativos de PG y coherente con evitar fricción de migración).
-- ═══════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────
-- PASO 1: Tabla customer_segments
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_segments (
  id            UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID          NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  name          TEXT          NOT NULL,
  description   TEXT,

  -- Reglas de segmentación. Ver §1.2 del spec.
  -- { "match": "all"|"any", "conditions": [{ field, operator, value }] }
  rules         JSONB         NOT NULL DEFAULT '{"match":"all","conditions":[]}'::jsonb,

  is_active     BOOLEAN       NOT NULL DEFAULT true,

  created_by    UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_segments_tenant
  ON public.customer_segments (tenant_id);


-- ─────────────────────────────────────────────────────────────────────
-- PASO 2: Tabla campaigns
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.campaigns (
  id                UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id         UUID          NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  name              TEXT          NOT NULL,
  description       TEXT,

  campaign_type     TEXT          NOT NULL DEFAULT 'custom'
    CHECK (campaign_type IN ('reactivation', 'last_minute', 'transformation', 'birthday', 'custom')),

  channel           TEXT          NOT NULL DEFAULT 'whatsapp'
    CHECK (channel IN ('whatsapp', 'email', 'sms')),

  -- Segmento reutilizable (opcional; se permite regla inline vía rules_snapshot)
  segment_id        UUID          REFERENCES public.customer_segments(id) ON DELETE SET NULL,

  -- Copia de las reglas usadas al materializar (trazabilidad)
  rules_snapshot    JSONB,

  -- Plantilla con variables {{first_name}}, {{last_name}}, {{full_name}}
  message_template  TEXT          NOT NULL,

  status            TEXT          NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready', 'queued', 'sent', 'cancelled')),

  -- { total, queued, sent, failed, skipped }
  stats             JSONB         NOT NULL DEFAULT '{}'::jsonb,

  created_by        UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_tenant
  ON public.campaigns (tenant_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_segment
  ON public.campaigns (segment_id);


-- ─────────────────────────────────────────────────────────────────────
-- PASO 3: Tabla campaign_recipients
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.campaign_recipients (
  id                UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id       UUID          NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  tenant_id         UUID          NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id       UUID          NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,

  rendered_message  TEXT,

  status            TEXT          NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),

  sent_at           TIMESTAMPTZ,
  error_message     TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_tenant
  ON public.campaign_recipients (tenant_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign
  ON public.campaign_recipients (campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_status
  ON public.campaign_recipients (campaign_id, status);


-- ─────────────────────────────────────────────────────────────────────
-- PASO 4: Triggers de updated_at (reutiliza public.update_updated_at())
-- ─────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_customer_segments_updated_at ON public.customer_segments;
CREATE TRIGGER trg_customer_segments_updated_at
  BEFORE UPDATE ON public.customer_segments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER trg_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ─────────────────────────────────────────────────────────────────────
-- PASO 5: RLS
--
-- Lectura: miembros del tenant (via profiles). Escrituras reales van por
-- supabaseAdmin (service_role, bypassa RLS), pero se definen políticas de
-- escritura para owner/admin/manager por coherencia y defensa en profundidad.
-- ─────────────────────────────────────────────────────────────────────

-- customer_segments -----------------------------------------------------
ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_segments_select" ON public.customer_segments;
CREATE POLICY "customer_segments_select"
  ON public.customer_segments FOR SELECT
  USING (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "customer_segments_write" ON public.customer_segments;
CREATE POLICY "customer_segments_write"
  ON public.customer_segments FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin', 'manager')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin', 'manager')
    )
  );

-- campaigns -------------------------------------------------------------
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaigns_select" ON public.campaigns;
CREATE POLICY "campaigns_select"
  ON public.campaigns FOR SELECT
  USING (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "campaigns_write" ON public.campaigns;
CREATE POLICY "campaigns_write"
  ON public.campaigns FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin', 'manager')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin', 'manager')
    )
  );

-- campaign_recipients ---------------------------------------------------
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_recipients_select" ON public.campaign_recipients;
CREATE POLICY "campaign_recipients_select"
  ON public.campaign_recipients FOR SELECT
  USING (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "campaign_recipients_write" ON public.campaign_recipients;
CREATE POLICY "campaign_recipients_write"
  ON public.campaign_recipients FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin', 'manager')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin', 'manager')
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- FIN
-- ═══════════════════════════════════════════════════════════════════════
