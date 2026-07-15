-- Registro de ventas de productos (log ligero, independiente de ordenes/caja).
-- Cada venta enlaza a un inventory_movements tipo 'exit' que descuenta stock.

CREATE TABLE IF NOT EXISTS public.product_sales (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id   uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  branch_id    uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  quantity     integer NOT NULL CHECK (quantity > 0),
  unit_price   numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  currency_iso text NOT NULL,                       -- snapshot moneda del producto
  total        numeric(12,2) NOT NULL CHECK (total >= 0), -- quantity * unit_price
  sold_at      timestamptz NOT NULL DEFAULT now(),  -- fecha real de la venta
  movement_id  uuid REFERENCES public.inventory_movements(id) ON DELETE SET NULL,
  created_by   uuid,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_sales_tenant_sold_at
  ON public.product_sales (tenant_id, sold_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_sales_product
  ON public.product_sales (product_id);

-- RLS: lectura para miembros admin del tenant (el dashboard lee vía createBrowserSB).
-- Las escrituras reales van por API con supabaseAdmin (bypassa RLS).
ALTER TABLE public.product_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_sales_select_tenant ON public.product_sales;
CREATE POLICY product_sales_select_tenant
  ON public.product_sales
  FOR SELECT
  USING (
    public.user_belongs_to_tenant(tenant_id)
    AND public.get_user_tenant_role() IN ('owner', 'admin', 'manager')
  );

DROP POLICY IF EXISTS product_sales_admin_write ON public.product_sales;
CREATE POLICY product_sales_admin_write
  ON public.product_sales
  FOR ALL
  USING (
    public.user_belongs_to_tenant(tenant_id)
    AND public.get_user_tenant_role() IN ('owner', 'admin', 'manager')
  )
  WITH CHECK (
    public.user_belongs_to_tenant(tenant_id)
    AND public.get_user_tenant_role() IN ('owner', 'admin', 'manager')
  );
