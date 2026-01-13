-- =============================================
-- SCRIPT DE MEJORAS - SISTEMA MULTI-CAJA PELUQUERÍA
-- =============================================
-- Este script agrega las tablas faltantes y mejoras al sistema existente
-- Autor: Sistema Multi-tenant Beauty Salon
-- Fecha: 2024
-- =============================================

-- =============================================
-- PARTE 1: TABLAS FALTANTES (CRÍTICO - EJECUTAR PRIMERO)
-- =============================================

-- 1.1 TABLA DE CAJAS REGISTRADORAS (FALTANTE EN TU SISTEMA)
CREATE TABLE IF NOT EXISTS public.cash_registers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- 'Caja Bolívares', 'Caja Dólares', 'Zelle', etc.
  currency_iso TEXT NOT NULL CHECK (currency_iso ~ '^[A-Z]{3}$'), -- VES, USD, MXN
  is_virtual BOOLEAN DEFAULT FALSE, -- true para Zelle, PayPal, etc.
  current_balance NUMERIC(12,2) DEFAULT 0 CHECK (current_balance >= 0),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, branch_id, name)
);

-- Índices para cash_registers
CREATE INDEX IF NOT EXISTS idx_cash_registers_tenant_id ON public.cash_registers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cash_registers_branch_id ON public.cash_registers(branch_id);
CREATE INDEX IF NOT EXISTS idx_cash_registers_currency ON public.cash_registers(currency_iso);

-- 1.2 TABLA DE MOVIMIENTOS DE CAJA (FALTANTE EN TU SISTEMA)
CREATE TABLE IF NOT EXISTS public.cash_register_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cash_register_id UUID NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('opening','income','expense','transfer','closing','adjustment')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  previous_balance NUMERIC(12,2) DEFAULT 0,
  new_balance NUMERIC(12,2) DEFAULT 0,
  description TEXT,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  reference TEXT, -- Para transferencias, Zelle, etc.
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para movimientos
CREATE INDEX IF NOT EXISTS idx_cash_movements_register_id ON public.cash_register_movements(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_type ON public.cash_register_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_cash_movements_date ON public.cash_register_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_cash_movements_appointment ON public.cash_register_movements(appointment_id);

-- 1.3 MODIFICAR TABLA DE CIERRES (YA EXISTE, PERO HAY QUE AGREGAR RELACIÓN)
-- Primero verificamos si la columna cash_register_id existe
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'cash_register_closures' 
    AND column_name = 'cash_register_id'
  ) THEN
    ALTER TABLE public.cash_register_closures 
    ADD COLUMN cash_register_id UUID REFERENCES public.cash_registers(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Agregar columnas faltantes a cash_register_closures si no existen
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'cash_register_closures' 
    AND column_name = 'system_balance'
  ) THEN
    ALTER TABLE public.cash_register_closures 
    ADD COLUMN system_balance NUMERIC(12,2) DEFAULT 0 CHECK (system_balance >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'cash_register_closures' 
    AND column_name = 'physical_balance'
  ) THEN
    ALTER TABLE public.cash_register_closures 
    ADD COLUMN physical_balance NUMERIC(12,2) DEFAULT 0 CHECK (physical_balance >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'cash_register_closures' 
    AND column_name = 'difference'
  ) THEN
    ALTER TABLE public.cash_register_closures 
    ADD COLUMN difference NUMERIC(12,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'cash_register_closures' 
    AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.cash_register_closures 
    ADD COLUMN notes TEXT;
  END IF;
END $$;

-- =============================================
-- PARTE 2: NUEVAS TABLAS PARA MEJORAS
-- =============================================

-- 2.1 TABLA DE TASAS DE CAMBIO
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  from_currency TEXT NOT NULL CHECK (from_currency ~ '^[A-Z]{3}$'),
  to_currency TEXT NOT NULL CHECK (to_currency ~ '^[A-Z]{3}$'),
  rate NUMERIC(18,6) NOT NULL CHECK (rate > 0),
  official_rate BOOLEAN DEFAULT false, -- Tasa oficial vs paralela
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, from_currency, to_currency, valid_from)
);

-- Índices para tasas de cambio
CREATE INDEX IF NOT EXISTS idx_exchange_rates_tenant ON public.exchange_rates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies ON public.exchange_rates(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_validity ON public.exchange_rates(valid_from, valid_until);

-- 2.2 TABLA DE PAGOS POR FACTURA (SOPORTE MULTI-MONEDA)
CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  cash_register_id UUID NOT NULL REFERENCES public.cash_registers(id),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency_iso TEXT NOT NULL CHECK (currency_iso ~ '^[A-Z]{3}$'),
  exchange_rate NUMERIC(18,6) DEFAULT 1.0, -- Tasa usada si es diferente a moneda base
  amount_in_base_currency NUMERIC(12,2), -- Monto convertido a moneda base
  payment_method TEXT CHECK (payment_method IN ('cash','card','transfer','zelle','pago_movil','crypto','other')),
  reference_number TEXT, -- Para transferencias/Zelle
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para pagos de facturas
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON public.invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_register ON public.invoice_payments(cash_register_id);

-- 2.3 TABLA DE TRANSFERENCIAS ENTRE CAJAS
CREATE TABLE IF NOT EXISTS public.cash_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  from_register_id UUID NOT NULL REFERENCES public.cash_registers(id),
  to_register_id UUID NOT NULL REFERENCES public.cash_registers(id),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  exchange_rate NUMERIC(18,6) DEFAULT 1.0, -- Si hay conversión de moneda
  amount_received NUMERIC(12,2) NOT NULL CHECK (amount_received > 0),
  reason TEXT,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (from_register_id != to_register_id)
);

-- =============================================
-- PARTE 3: AGREGAR COLUMNAS A TABLAS EXISTENTES
-- =============================================

-- 3.1 Agregar moneda a la tabla de invoices si no existe
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoices' 
    AND column_name = 'currency_iso'
  ) THEN
    ALTER TABLE public.invoices 
    ADD COLUMN currency_iso TEXT DEFAULT 'VES' CHECK (currency_iso ~ '^[A-Z]{3}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoices' 
    AND column_name = 'paid_at'
  ) THEN
    ALTER TABLE public.invoices 
    ADD COLUMN paid_at TIMESTAMPTZ;
  END IF;
END $$;

-- =============================================
-- PARTE 4: VISTAS MEJORADAS
-- =============================================

-- 4.1 Vista consolidada de cajas en tiempo real (CORREGIDA)
CREATE OR REPLACE VIEW public.v_cash_registers_summary AS
WITH movements_today AS (
  SELECT 
    cash_register_id,
    SUM(CASE WHEN movement_type = 'opening' THEN amount ELSE 0 END) as opening,
    SUM(CASE WHEN movement_type = 'income'  THEN amount ELSE 0 END) as income,
    SUM(CASE WHEN movement_type = 'expense' THEN amount ELSE 0 END) as expense,
    COUNT(CASE WHEN movement_type IN ('income','expense') THEN 1 END) as transaction_count
  FROM public.cash_register_movements
  WHERE DATE(created_at) = CURRENT_DATE
  GROUP BY cash_register_id
),
last_closing AS (
  SELECT DISTINCT ON (cash_register_id)
    cash_register_id,
    COALESCE(closed_at, opened_at) AS last_closed_at,
    COALESCE(physical_balance, closing_balance_real) AS last_closing_balance
  FROM public.cash_register_closures
  WHERE closed_at IS NOT NULL
  ORDER BY cash_register_id, closed_at DESC
)
SELECT 
  cr.id,
  cr.tenant_id,
  cr.branch_id,
  b.name as branch_name,
  cr.name as register_name,
  cr.currency_iso,
  cr.is_virtual,
  cr.current_balance,
  COALESCE(mt.opening, 0) as today_opening,
  COALESCE(mt.income, 0) as today_income,
  COALESCE(mt.expense, 0) as today_expense,
  COALESCE(mt.income, 0) - COALESCE(mt.expense, 0) as today_net,
  COALESCE(mt.transaction_count, 0) as today_transactions,
  lc.last_closed_at,
  lc.last_closing_balance,
  cr.is_active
FROM public.cash_registers cr
LEFT JOIN public.branches b ON b.id = cr.branch_id
LEFT JOIN movements_today mt ON mt.cash_register_id = cr.id
LEFT JOIN last_closing lc ON lc.cash_register_id = cr.id
ORDER BY cr.is_virtual, cr.currency_iso, cr.name;


-- 4.2 Vista de consolidación diaria multi-moneda
CREATE OR REPLACE VIEW public.v_daily_cash_summary AS
WITH exchange_to_base AS (
  -- Obtener tasas de cambio del día
  SELECT DISTINCT ON (tenant_id, from_currency, to_currency)
    tenant_id,
    from_currency,
    to_currency,
    rate
  FROM public.exchange_rates
  WHERE valid_from <= NOW() 
    AND (valid_until IS NULL OR valid_until > NOW())
  ORDER BY tenant_id, from_currency, to_currency, valid_from DESC
)
SELECT 
  cr.tenant_id,
  cr.branch_id,
  b.name as branch_name,
  DATE(crm.created_at) as date,
  cr.name as register_name,
  cr.currency_iso,
  cr.is_virtual,
  COUNT(DISTINCT CASE WHEN crm.movement_type = 'income' THEN crm.id END) as income_count,
  SUM(CASE WHEN crm.movement_type = 'opening' THEN crm.amount ELSE 0 END) as opening_balance,
  SUM(CASE WHEN crm.movement_type = 'income' THEN crm.amount ELSE 0 END) as total_income,
  SUM(CASE WHEN crm.movement_type = 'expense' THEN crm.amount ELSE 0 END) as total_expense,
  SUM(CASE WHEN crm.movement_type = 'closing' THEN crm.amount ELSE 0 END) as closing_balance,
  -- Convertir a moneda base para consolidación (asumiendo VES como base)
  SUM(CASE WHEN crm.movement_type = 'income' THEN 
    crm.amount * COALESCE(etb.rate, 1) 
  ELSE 0 END) as income_in_base_currency,
  t.currency_iso as base_currency
FROM public.cash_registers cr
JOIN public.branches b ON b.id = cr.branch_id
JOIN public.tenants t ON t.id = cr.tenant_id
LEFT JOIN public.cash_register_movements crm ON crm.cash_register_id = cr.id
LEFT JOIN exchange_to_base etb ON 
  etb.tenant_id = cr.tenant_id AND
  etb.from_currency = cr.currency_iso AND 
  etb.to_currency = t.currency_iso
WHERE DATE(crm.created_at) = CURRENT_DATE
GROUP BY cr.tenant_id, cr.branch_id, b.name, DATE(crm.created_at), 
         cr.name, cr.currency_iso, cr.is_virtual, t.currency_iso;

-- 4.3 Vista de movimientos detallados con información completa
CREATE OR REPLACE VIEW public.v_cash_movements_detail AS
SELECT 
  crm.id,
  crm.cash_register_id,
  cr.name as register_name,
  cr.currency_iso,
  cr.is_virtual,
  crm.movement_type,
  crm.amount,
  crm.previous_balance,
  crm.new_balance,
  crm.description,
  crm.reference,
  a.id as appointment_id,
  c.full_name as customer_name,
  i.invoice_number,
  p.full_name as created_by_name,
  crm.created_at
FROM public.cash_register_movements crm
JOIN public.cash_registers cr ON cr.id = crm.cash_register_id
LEFT JOIN public.appointments a ON a.id = crm.appointment_id
LEFT JOIN public.customers c ON c.id = a.customer_id
LEFT JOIN public.invoices i ON i.id = crm.invoice_id
LEFT JOIN public.profiles p ON p.id = crm.created_by
ORDER BY crm.created_at DESC;

-- =============================================
-- PARTE 5: STORED PROCEDURES Y FUNCIONES
-- =============================================

-- 5.1 Función para procesar pagos multi-moneda
CREATE OR REPLACE FUNCTION public.process_multi_currency_payment(
  p_invoice_id UUID,
  p_payments JSONB
) RETURNS JSONB AS $$
DECLARE
  v_payment JSONB;
  v_total_paid NUMERIC := 0;
  v_invoice_total NUMERIC;
  v_base_currency TEXT;
  v_tenant_id UUID;
  v_appointment_id UUID;
  v_movement_id UUID;
  v_current_balance NUMERIC;
BEGIN
  -- Obtener información de la factura
  SELECT 
    total, 
    COALESCE(currency_iso, 'VES'), 
    tenant_id,
    appointment_id
  INTO v_invoice_total, v_base_currency, v_tenant_id, v_appointment_id
  FROM public.invoices 
  WHERE id = p_invoice_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Factura no encontrada'
    );
  END IF;
  
  -- Procesar cada pago
  FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    -- Obtener balance actual de la caja
    SELECT current_balance INTO v_current_balance
    FROM public.cash_registers
    WHERE id = (v_payment->>'cash_register_id')::UUID;
    
    -- Insertar pago en invoice_payments
    INSERT INTO public.invoice_payments (
      invoice_id,
      cash_register_id,
      amount,
      currency_iso,
      exchange_rate,
      amount_in_base_currency,
      payment_method,
      reference_number
    ) VALUES (
      p_invoice_id,
      (v_payment->>'cash_register_id')::UUID,
      (v_payment->>'amount')::NUMERIC,
      COALESCE(v_payment->>'currency', v_base_currency),
      COALESCE((v_payment->>'exchange_rate')::NUMERIC, 1),
      (v_payment->>'amount')::NUMERIC * COALESCE((v_payment->>'exchange_rate')::NUMERIC, 1),
      v_payment->>'payment_method',
      v_payment->>'reference'
    );
    
    -- Registrar movimiento en caja
    INSERT INTO public.cash_register_movements (
      cash_register_id,
      movement_type,
      amount,
      previous_balance,
      new_balance,
      appointment_id,
      invoice_id,
      description,
      reference,
      created_by
    ) VALUES (
      (v_payment->>'cash_register_id')::UUID,
      'income',
      (v_payment->>'amount')::NUMERIC,
      v_current_balance,
      v_current_balance + (v_payment->>'amount')::NUMERIC,
      v_appointment_id,
      p_invoice_id,
      'Pago de factura #' || (SELECT invoice_number FROM public.invoices WHERE id = p_invoice_id),
      v_payment->>'reference',
      auth.uid()
    ) RETURNING id INTO v_movement_id;
    
    -- Actualizar balance de la caja
    UPDATE public.cash_registers
    SET 
      current_balance = current_balance + (v_payment->>'amount')::NUMERIC,
      updated_at = NOW()
    WHERE id = (v_payment->>'cash_register_id')::UUID;
    
    v_total_paid := v_total_paid + ((v_payment->>'amount')::NUMERIC * COALESCE((v_payment->>'exchange_rate')::NUMERIC, 1));
  END LOOP;
  
  -- Actualizar estado de factura si está pagada completa
  IF v_total_paid >= v_invoice_total THEN
    UPDATE public.invoices 
    SET 
      status = 'paid', 
      paid_at = NOW() 
    WHERE id = p_invoice_id;
  ELSIF v_total_paid > 0 THEN
    -- Pago parcial
    UPDATE public.invoices 
    SET 
      status = 'partial'
    WHERE id = p_invoice_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'total_paid', v_total_paid,
    'invoice_status', CASE 
      WHEN v_total_paid >= v_invoice_total THEN 'paid' 
      WHEN v_total_paid > 0 THEN 'partial'
      ELSE 'pending' 
    END
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.2 Función para abrir caja
CREATE OR REPLACE FUNCTION public.open_cash_register(
  p_register_id UUID,
  p_opening_amount NUMERIC,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_current_balance NUMERIC;
  v_movement_id UUID;
BEGIN
  -- Verificar si la caja ya está abierta
  SELECT current_balance INTO v_current_balance
  FROM public.cash_registers
  WHERE id = p_register_id;
  
  IF v_current_balance > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'La caja ya está abierta'
    );
  END IF;
  
  -- Registrar movimiento de apertura
  INSERT INTO public.cash_register_movements (
    cash_register_id,
    movement_type,
    amount,
    previous_balance,
    new_balance,
    description,
    created_by
  ) VALUES (
    p_register_id,
    'opening',
    p_opening_amount,
    0,
    p_opening_amount,
    COALESCE(p_notes, 'Apertura de caja'),
    auth.uid()
  ) RETURNING id INTO v_movement_id;
  
  -- Actualizar balance
  UPDATE public.cash_registers
  SET 
    current_balance = p_opening_amount,
    updated_at = NOW()
  WHERE id = p_register_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'movement_id', v_movement_id,
    'new_balance', p_opening_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.3 Función para cerrar caja (CORREGIDA)
CREATE OR REPLACE FUNCTION public.close_cash_register(
  p_register_id UUID,
  p_physical_balance NUMERIC,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_system_balance NUMERIC;
  v_difference NUMERIC;
  v_closing_id UUID;
  v_movement_id UUID;
  v_tenant_id UUID;
  v_branch_id UUID;
BEGIN
  -- Obtener balance del sistema + tenant y sucursal
  SELECT current_balance, tenant_id, branch_id
  INTO v_system_balance, v_tenant_id, v_branch_id
  FROM public.cash_registers
  WHERE id = p_register_id;

  IF v_system_balance IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Caja no encontrada'
    );
  END IF;

  v_difference := p_physical_balance - v_system_balance;

  -- Registrar cierre en cash_register_closures
  INSERT INTO public.cash_register_closures (
    tenant_id,
    branch_id,
    cash_register_id,
    system_balance,
    physical_balance,
    difference,
    notes,
    opened_at,
    closed_at,
    opened_by,
    closed_by
  ) VALUES (
    v_tenant_id,
    v_branch_id,
    p_register_id,
    v_system_balance,
    p_physical_balance,
    v_difference,
    p_notes,
    NOW(),
    NOW(),
    auth.uid(),         -- lo usamos como usuario que "abre" y "cierra" en este flujo simplificado
    auth.uid()
  ) RETURNING id INTO v_closing_id;

  -- Si hay diferencia, crear ajuste en movimientos
  IF ABS(v_difference) > 0.01 THEN
    INSERT INTO public.cash_register_movements (
      cash_register_id,
      movement_type,
      amount,
      description,
      reference,
      created_by
    ) VALUES (
      p_register_id,
      'adjustment',
      ABS(v_difference),
      CASE 
        WHEN v_difference > 0 THEN 'Ajuste por sobrante: ' || v_difference
        ELSE 'Ajuste por faltante: ' || v_difference
      END,
      v_closing_id::TEXT,
      auth.uid()
    );
  END IF;

  -- Registrar movimiento de cierre
  INSERT INTO public.cash_register_movements (
    cash_register_id,
    movement_type,
    amount,
    previous_balance,
    new_balance,
    description,
    reference,
    created_by
  ) VALUES (
    p_register_id,
    'closing',
    p_physical_balance,
    v_system_balance,
    0,
    'Cierre de caja',
    v_closing_id::TEXT,
    auth.uid()
  ) RETURNING id INTO v_movement_id;

  -- Resetear balance a 0
  UPDATE public.cash_registers
  SET 
    current_balance = 0,
    updated_at = NOW()
  WHERE id = p_register_id;

  RETURN jsonb_build_object(
    'success', true,
    'closing_id', v_closing_id,
    'system_balance', v_system_balance,
    'physical_balance', p_physical_balance,
    'difference', v_difference
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5.4 Función para transferir entre cajas
CREATE OR REPLACE FUNCTION public.transfer_between_registers(
  p_from_register_id UUID,
  p_to_register_id UUID,
  p_amount NUMERIC,
  p_exchange_rate NUMERIC DEFAULT 1.0,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_from_balance NUMERIC;
  v_to_balance NUMERIC;
  v_amount_received NUMERIC;
  v_transfer_id UUID;
  v_from_currency TEXT;
  v_to_currency TEXT;
  v_tenant_id UUID;
BEGIN
  -- Validar que no sea la misma caja
  IF p_from_register_id = p_to_register_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No se puede transferir a la misma caja'
    );
  END IF;
  
  -- Obtener información de las cajas
  SELECT current_balance, currency_iso, tenant_id 
  INTO v_from_balance, v_from_currency, v_tenant_id
  FROM public.cash_registers
  WHERE id = p_from_register_id;
  
  SELECT current_balance, currency_iso 
  INTO v_to_balance, v_to_currency
  FROM public.cash_registers
  WHERE id = p_to_register_id;
  
  -- Verificar fondos suficientes
  IF v_from_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Fondos insuficientes en caja origen'
    );
  END IF;
  
  -- Calcular monto a recibir
  v_amount_received := p_amount * p_exchange_rate;
  
  -- Registrar transferencia
  INSERT INTO public.cash_transfers (
    tenant_id,
    from_register_id,
    to_register_id,
    amount,
    exchange_rate,
    amount_received,
    reason,
    created_by
  ) VALUES (
    v_tenant_id,
    p_from_register_id,
    p_to_register_id,
    p_amount,
    p_exchange_rate,
    v_amount_received,
    p_reason,
    auth.uid()
  ) RETURNING id INTO v_transfer_id;
  
  -- Movimiento de salida
  INSERT INTO public.cash_register_movements (
    cash_register_id,
    movement_type,
    amount,
    previous_balance,
    new_balance,
    description,
    reference,
    created_by
  ) VALUES (
    p_from_register_id,
    'transfer',
    p_amount,
    v_from_balance,
    v_from_balance - p_amount,
    'Transferencia saliente: ' || COALESCE(p_reason, ''),
    v_transfer_id::TEXT,
    auth.uid()
  );
  
  -- Movimiento de entrada
  INSERT INTO public.cash_register_movements (
    cash_register_id,
    movement_type,
    amount,
    previous_balance,
    new_balance,
    description,
    reference,
    created_by
  ) VALUES (
    p_to_register_id,
    'transfer',
    v_amount_received,
    v_to_balance,
    v_to_balance + v_amount_received,
    'Transferencia entrante: ' || COALESCE(p_reason, ''),
    v_transfer_id::TEXT,
    auth.uid()
  );
  
  -- Actualizar balances
  UPDATE public.cash_registers
  SET 
    current_balance = current_balance - p_amount,
    updated_at = NOW()
  WHERE id = p_from_register_id;
  
  UPDATE public.cash_registers
  SET 
    current_balance = current_balance + v_amount_received,
    updated_at = NOW()
  WHERE id = p_to_register_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'amount_sent', p_amount,
    'amount_received', v_amount_received,
    'from_new_balance', v_from_balance - p_amount,
    'to_new_balance', v_to_balance + v_amount_received
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.5 Función para obtener resumen de caja del día
CREATE OR REPLACE FUNCTION public.get_daily_cash_summary(
  p_branch_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
  register_name TEXT,
  currency_iso TEXT,
  is_virtual BOOLEAN,
  opening_balance NUMERIC,
  total_income NUMERIC,
  total_expense NUMERIC,
  total_transfers_in NUMERIC,
  total_transfers_out NUMERIC,
  closing_balance NUMERIC,
  current_balance NUMERIC,
  transaction_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cr.name as register_name,
    cr.currency_iso,
    cr.is_virtual,
    COALESCE(SUM(CASE WHEN crm.movement_type = 'opening' THEN crm.amount END), 0) as opening_balance,
    COALESCE(SUM(CASE WHEN crm.movement_type = 'income' THEN crm.amount END), 0) as total_income,
    COALESCE(SUM(CASE WHEN crm.movement_type = 'expense' THEN crm.amount END), 0) as total_expense,
    COALESCE(SUM(CASE WHEN crm.movement_type = 'transfer' AND crm.amount > 0 THEN crm.amount END), 0) as total_transfers_in,
    COALESCE(SUM(CASE WHEN crm.movement_type = 'transfer' AND crm.amount < 0 THEN ABS(crm.amount) END), 0) as total_transfers_out,
    COALESCE(SUM(CASE WHEN crm.movement_type = 'closing' THEN crm.amount END), 0) as closing_balance,
    cr.current_balance,
    COUNT(CASE WHEN crm.movement_type IN ('income', 'expense') THEN 1 END) as transaction_count
  FROM public.cash_registers cr
  LEFT JOIN public.cash_register_movements crm 
    ON crm.cash_register_id = cr.id 
    AND DATE(crm.created_at) = p_date
  WHERE cr.branch_id = p_branch_id
    AND cr.is_active = true
  GROUP BY cr.id, cr.name, cr.currency_iso, cr.is_virtual, cr.current_balance
  ORDER BY cr.is_virtual, cr.currency_iso, cr.name;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- PARTE 6: RLS (Row Level Security) POLICIES
-- =============================================

-- Habilitar RLS para las nuevas tablas
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_register_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transfers ENABLE ROW LEVEL SECURITY;

-- Políticas para cash_registers
CREATE POLICY "cash_registers_tenant_isolation" ON public.cash_registers
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "cash_registers_insert" ON public.cash_registers
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Políticas para cash_register_movements
CREATE POLICY "cash_movements_tenant_isolation" ON public.cash_register_movements
  FOR ALL USING (
    cash_register_id IN (
      SELECT id FROM public.cash_registers
      WHERE tenant_id IN (
        SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- Políticas para exchange_rates
CREATE POLICY "exchange_rates_tenant_isolation" ON public.exchange_rates
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "exchange_rates_owner_only" ON public.exchange_rates
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Políticas para invoice_payments
CREATE POLICY "invoice_payments_tenant_isolation" ON public.invoice_payments
  FOR ALL USING (
    invoice_id IN (
      SELECT id FROM public.invoices
      WHERE tenant_id IN (
        SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- Políticas para cash_transfers
CREATE POLICY "cash_transfers_tenant_isolation" ON public.cash_transfers
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );



-- =============================================
-- PARTE 8: COMENTARIOS Y DOCUMENTACIÓN
-- =============================================

COMMENT ON TABLE public.cash_registers IS 'Cajas registradoras físicas y virtuales por sucursal';
COMMENT ON TABLE public.cash_register_movements IS 'Movimientos detallados de cada caja';
COMMENT ON TABLE public.exchange_rates IS 'Tasas de cambio históricas para conversión de moneda';
COMMENT ON TABLE public.invoice_payments IS 'Pagos parciales o totales de facturas con soporte multi-moneda';
COMMENT ON TABLE public.cash_transfers IS 'Transferencias entre cajas con conversión de moneda';

COMMENT ON COLUMN public.cash_registers.is_virtual IS 'TRUE para métodos digitales como Zelle, PayPal, etc.';
COMMENT ON COLUMN public.cash_register_movements.movement_type IS 'opening: apertura, income: ingreso, expense: egreso, transfer: transferencia, closing: cierre';
COMMENT ON COLUMN public.exchange_rates.official_rate IS 'TRUE para tasa oficial, FALSE para tasa paralela o de mercado';

-- =============================================
-- FIN DEL SCRIPT DE MEJORAS
-- =============================================
