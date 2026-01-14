-- ============================================================================
-- ELVIS STUDIO - SCRIPT COMPLEMENTARIO
-- ============================================================================
-- Este script complementa initial_data.sql con las estructuras necesarias
-- para el sistema de gestión integral de Elvis Studio
-- Ejecutar DESPUÉS de initial_data.sql
-- ============================================================================

-- ============================================================================
-- 1. TIPOS ENUMERADOS ADICIONALES
-- ============================================================================

-- Estado de citas
CREATE TYPE appointment_status AS ENUM (
    'pending',      -- Pendiente de confirmación
    'confirmed',    -- Confirmada
    'in_progress',  -- En progreso
    'completed',    -- Completada
    'cancelled',    -- Cancelada
    'no_show'       -- No se presentó
);

-- Estado de facturas
CREATE TYPE invoice_status AS ENUM (
    'draft',        -- Borrador
    'pending',      -- Pendiente de pago
    'partial',      -- Pago parcial
    'paid',         -- Pagada
    'cancelled',    -- Cancelada
    'refunded'      -- Reembolsada
);

-- Tipo de recurso
CREATE TYPE resource_type AS ENUM (
    'human',        -- Especialista/Empleado
    'physical'      -- Estación/Puesto de trabajo
);

-- Categoría de servicio
CREATE TYPE service_category AS ENUM (
    'hair',         -- Cabello
    'nails',        -- Uñas
    'skin',         -- Piel/Faciales
    'makeup',       -- Maquillaje
    'spa',          -- Spa
    'barber',       -- Barbería
    'other'         -- Otros
);

-- Día de la semana
CREATE TYPE day_of_week AS ENUM (
    'monday', 'tuesday', 'wednesday', 'thursday', 
    'friday', 'saturday', 'sunday'
);

-- ============================================================================
-- 2. TABLAS BASE - SUCURSALES (BRANCHES)
-- ============================================================================

CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Identificación
    name TEXT NOT NULL,
    code TEXT, -- Código interno de sucursal
    
    -- Ubicación
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    postal_code TEXT,
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    
    -- Contacto
    phone TEXT,
    email TEXT,
    
    -- Configuración
    timezone TEXT DEFAULT 'America/Caracas',
    is_main BOOLEAN DEFAULT false, -- Sucursal principal
    is_active BOOLEAN DEFAULT true,
    
    -- Horarios de operación (JSONB para flexibilidad)
    operating_hours JSONB DEFAULT '{
        "monday": {"open": "08:00", "close": "18:00"},
        "tuesday": {"open": "08:00", "close": "18:00"},
        "wednesday": {"open": "08:00", "close": "18:00"},
        "thursday": {"open": "08:00", "close": "18:00"},
        "friday": {"open": "08:00", "close": "18:00"},
        "saturday": {"open": "09:00", "close": "14:00"},
        "sunday": null
    }',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, code)
);

-- Índices
CREATE INDEX idx_branches_tenant ON branches(tenant_id);
CREATE INDEX idx_branches_active ON branches(tenant_id, is_active);

-- ============================================================================
-- 3. TABLAS BASE - PERFILES DE USUARIO EXTENDIDOS
-- ============================================================================

-- Perfiles extendidos para usuarios del tenant (complementa tenant_users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    
    -- Datos personales
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    
    -- Rol y permisos
    role tenant_role NOT NULL DEFAULT 'employee',
    
    -- Para especialistas
    is_specialist BOOLEAN DEFAULT false,
    specialties TEXT[], -- Array de especialidades
    bio TEXT,
    rating NUMERIC(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    total_ratings INTEGER DEFAULT 0,
    
    -- Comisiones (para especialistas)
    commission_type TEXT CHECK (commission_type IN ('percentage', 'fixed', 'mixed')),
    commission_percentage NUMERIC(5,2) DEFAULT 0,
    commission_fixed NUMERIC(12,2) DEFAULT 0,
    
    -- Estado
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX idx_profiles_branch ON profiles(branch_id);
CREATE INDEX idx_profiles_specialist ON profiles(tenant_id, is_specialist) WHERE is_specialist = true;

-- ============================================================================
-- 4. TABLAS BASE - CLIENTES
-- ============================================================================

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Datos personales
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    phone_secondary TEXT,
    
    -- Identificación (opcional)
    document_type TEXT, -- DNI, CI, Pasaporte, etc.
    document_number TEXT,
    
    -- Datos adicionales
    birth_date DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_say')),
    address TEXT,
    city TEXT,
    
    -- Preferencias
    preferred_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    preferred_specialist_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    notes TEXT, -- Notas internas sobre el cliente
    tags TEXT[], -- Tags para segmentación
    
    -- Marketing
    accepts_marketing BOOLEAN DEFAULT true,
    how_found_us TEXT, -- Cómo nos conoció
    
    -- Fidelización
    loyalty_points INTEGER DEFAULT 0,
    total_visits INTEGER DEFAULT 0,
    total_spent NUMERIC(12,2) DEFAULT 0,
    last_visit_at TIMESTAMPTZ,
    
    -- Estado
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, email),
    UNIQUE(tenant_id, phone)
);

-- Índices
CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_customers_phone ON customers(tenant_id, phone);
CREATE INDEX idx_customers_email ON customers(tenant_id, email);
CREATE INDEX idx_customers_search ON customers USING gin(to_tsvector('spanish', full_name || ' ' || COALESCE(email, '') || ' ' || COALESCE(phone, '')));

-- ============================================================================
-- 5. TABLAS - CATÁLOGO DE SERVICIOS
-- ============================================================================

CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Identificación
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    category service_category DEFAULT 'other',
    
    -- Duración y precio
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    buffer_minutes INTEGER DEFAULT 0, -- Tiempo entre citas
    
    -- Precios (multi-moneda manejado en otra tabla)
    base_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency_code TEXT DEFAULT 'USD',
    
    -- Variantes (para servicios complejos como balayage)
    has_variants BOOLEAN DEFAULT false,
    
    -- Recursos requeridos
    requires_specialist BOOLEAN DEFAULT true,
    requires_station BOOLEAN DEFAULT true,
    
    -- Configuración
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    
    -- Imágenes
    image_url TEXT,
    gallery_urls TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, slug)
);

-- Variantes de servicios (ej: Balayage corto, medio, largo)
CREATE TABLE service_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL, -- "Cabello corto", "Cabello largo"
    description TEXT,
    
    -- Modificadores de duración y precio
    duration_modifier INTEGER DEFAULT 0, -- +/- minutos
    price_modifier NUMERIC(12,2) DEFAULT 0, -- +/- precio
    
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Servicios que puede realizar cada especialista
CREATE TABLE specialist_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    specialist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    
    -- Override de precio/duración para este especialista
    custom_price NUMERIC(12,2),
    custom_duration INTEGER,
    
    -- Nivel de habilidad
    skill_level INTEGER DEFAULT 3 CHECK (skill_level >= 1 AND skill_level <= 5),
    
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(specialist_id, service_id)
);

-- Índices
CREATE INDEX idx_services_tenant ON services(tenant_id);
CREATE INDEX idx_services_category ON services(tenant_id, category);
CREATE INDEX idx_service_variants_service ON service_variants(service_id);
CREATE INDEX idx_specialist_services_specialist ON specialist_services(specialist_id);

-- ============================================================================
-- 6. TABLAS - PUESTOS DE TRABAJO / ESTACIONES
-- ============================================================================

CREATE TABLE workstations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    
    -- Identificación
    name TEXT NOT NULL, -- "Estación 1", "Sillón A"
    code TEXT, -- Código corto
    
    -- Tipo y categoría
    station_type TEXT DEFAULT 'general', -- 'general', 'hair', 'nails', 'makeup', etc.
    
    -- Ubicación visual (para el diagrama del salón)
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    floor INTEGER DEFAULT 1,
    
    -- Capacidades
    compatible_services UUID[], -- IDs de servicios que se pueden hacer aquí
    
    -- Estado
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, branch_id, code)
);

-- Índices
CREATE INDEX idx_workstations_tenant ON workstations(tenant_id);
CREATE INDEX idx_workstations_branch ON workstations(branch_id);

-- ============================================================================
-- 7. TABLAS - HORARIOS Y DISPONIBILIDAD
-- ============================================================================

-- Horarios base de especialistas por día de la semana
CREATE TABLE specialist_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    specialist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    
    day_of_week day_of_week NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Break/almuerzo
    break_start TIME,
    break_end TIME,
    
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(specialist_id, branch_id, day_of_week)
);

-- Excepciones de horario (vacaciones, días especiales)
CREATE TABLE schedule_exceptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    specialist_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    
    exception_date DATE NOT NULL,
    exception_type TEXT NOT NULL CHECK (exception_type IN ('vacation', 'sick', 'holiday', 'special_hours')),
    
    -- Si es horario especial
    start_time TIME,
    end_time TIME,
    
    -- Si es día libre
    is_day_off BOOLEAN DEFAULT false,
    
    reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_specialist_schedules_specialist ON specialist_schedules(specialist_id);
CREATE INDEX idx_schedule_exceptions_date ON schedule_exceptions(exception_date);

-- ============================================================================
-- 8. TABLAS - CITAS / APPOINTMENTS
-- ============================================================================

CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,

    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    specialist_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    workstation_id UUID REFERENCES workstations(id) ON DELETE SET NULL,

    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    service_variant_id UUID REFERENCES service_variants(id) ON DELETE SET NULL,

    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL,

    -- 👇 ahora normal, NO generated
    ends_at TIMESTAMPTZ,

    status appointment_status DEFAULT 'pending',

    estimated_price NUMERIC(12,2),
    currency_code TEXT DEFAULT 'USD',

    customer_notes TEXT,
    internal_notes TEXT,

    confirmed_at TIMESTAMPTZ,
    confirmed_by UUID REFERENCES profiles(id),

    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID,
    cancellation_reason TEXT,

    completed_at TIMESTAMPTZ,
    actual_duration INTEGER,

    source TEXT DEFAULT 'web' CHECK (source IN ('web', 'app', 'phone', 'walk_in', 'whatsapp', 'instagram')),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE OR REPLACE FUNCTION set_appointments_ends_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.ends_at := NEW.scheduled_at + (NEW.duration_minutes * INTERVAL '1 minute');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_appointments_ends_at
BEFORE INSERT OR UPDATE OF scheduled_at, duration_minutes
ON appointments
FOR EACH ROW
EXECUTE FUNCTION set_appointments_ends_at();


-- Servicios adicionales en la misma cita
CREATE TABLE appointment_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    service_variant_id UUID REFERENCES service_variants(id),
    
    -- Puede ser otro especialista
    specialist_id UUID REFERENCES profiles(id),
    
    price NUMERIC(12,2),
    duration_minutes INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_appointments_tenant ON appointments(tenant_id);
CREATE INDEX idx_appointments_branch ON appointments(branch_id);
CREATE INDEX idx_appointments_customer ON appointments(customer_id);
CREATE INDEX idx_appointments_specialist ON appointments(specialist_id);
CREATE INDEX idx_appointments_scheduled ON appointments(scheduled_at);
CREATE INDEX idx_appointments_status ON appointments(tenant_id, status);
CREATE INDEX idx_appointments_date_range ON appointments(tenant_id, scheduled_at, ends_at);

-- ============================================================================
-- 9. TABLAS - FACTURAS E INVOICES
-- ============================================================================

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    
    -- Número de factura
    invoice_number TEXT NOT NULL,
    
    -- Cliente
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    
    -- Cita asociada (opcional)
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    
    -- Montos
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) NOT NULL DEFAULT 0,
    
    -- Moneda
    currency_iso TEXT DEFAULT 'USD' CHECK (currency_iso ~ '^[A-Z]{3}$'),
    
    -- Estado
    status invoice_status DEFAULT 'pending',
    
    -- Pago
    paid_at TIMESTAMPTZ,
    
    -- Notas
    notes TEXT,
    
    -- Datos fiscales del cliente (snapshot)
    customer_name TEXT,
    customer_document TEXT,
    customer_address TEXT,
    
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, invoice_number)
);

-- Líneas de factura
CREATE TABLE invoice_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- Tipo de línea
    line_type TEXT DEFAULT 'service' CHECK (line_type IN ('service', 'product', 'tip', 'discount', 'other')),
    
    -- Descripción
    description TEXT NOT NULL,
    
    -- Cantidades
    quantity NUMERIC(10,2) DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL,
    discount_percent NUMERIC(5,2) DEFAULT 0,
    tax_percent NUMERIC(5,2) DEFAULT 0,
    total NUMERIC(12,2) NOT NULL,
    
    -- Referencias
    service_id UUID REFERENCES services(id),
    specialist_id UUID REFERENCES profiles(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_appointment ON invoices(appointment_id);
CREATE INDEX idx_invoices_status ON invoices(tenant_id, status);
CREATE INDEX idx_invoice_lines_invoice ON invoice_lines(invoice_id);

-- ============================================================================
-- 10. TABLAS - CIERRE DE CAJA
-- ============================================================================

CREATE TABLE cash_register_closures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    
    -- Período del cierre
    opened_at TIMESTAMPTZ NOT NULL,
    closed_at TIMESTAMPTZ,
    
    -- Balances
    opening_balance_real NUMERIC(12,2) DEFAULT 0,
    closing_balance_real NUMERIC(12,2),
    
    -- Columnas adicionales para el sistema multi-caja
    system_balance NUMERIC(12,2) DEFAULT 0 CHECK (system_balance >= 0),
    physical_balance NUMERIC(12,2) DEFAULT 0 CHECK (physical_balance >= 0),
    difference NUMERIC(12,2) DEFAULT 0,
    
    -- Totales calculados
    total_sales NUMERIC(12,2) DEFAULT 0,
    total_services NUMERIC(12,2) DEFAULT 0,
    total_products NUMERIC(12,2) DEFAULT 0,
    total_tips NUMERIC(12,2) DEFAULT 0,
    
    -- Conteos
    appointment_count INTEGER DEFAULT 0,
    invoice_count INTEGER DEFAULT 0,
    
    -- Notas
    notes TEXT,
    
    -- Usuarios
    opened_by UUID REFERENCES auth.users(id),
    closed_by UUID REFERENCES auth.users(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_closures_tenant ON cash_register_closures(tenant_id);
CREATE INDEX idx_closures_branch ON cash_register_closures(branch_id);
CREATE INDEX idx_closures_date ON cash_register_closures(opened_at, closed_at);

-- ============================================================================
-- 11. TABLAS - CAJAS REGISTRADORAS (del datting.sql)
-- ============================================================================

CREATE TABLE cash_registers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL, -- 'Caja Bolívares', 'Caja Dólares', 'Zelle', etc.
    currency_iso TEXT NOT NULL CHECK (currency_iso ~ '^[A-Z]{3}$'), -- VES, USD, COP
    is_virtual BOOLEAN DEFAULT FALSE, -- true para Zelle, PayPal, etc.
    current_balance NUMERIC(12,2) DEFAULT 0 CHECK (current_balance >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, branch_id, name)
);

-- Movimientos de caja
CREATE TABLE cash_register_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cash_register_id UUID NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
    
    movement_type TEXT NOT NULL CHECK (movement_type IN ('opening','income','expense','transfer','closing','adjustment')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    previous_balance NUMERIC(12,2) DEFAULT 0,
    new_balance NUMERIC(12,2) DEFAULT 0,
    
    description TEXT,
    
    -- Referencias
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    reference TEXT, -- Para transferencias, Zelle, etc.
    
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar columna cash_register_id a closures si no se creó
ALTER TABLE cash_register_closures 
ADD COLUMN IF NOT EXISTS cash_register_id UUID REFERENCES cash_registers(id) ON DELETE CASCADE;

-- Índices
CREATE INDEX idx_cash_registers_tenant ON cash_registers(tenant_id);
CREATE INDEX idx_cash_registers_branch ON cash_registers(branch_id);
CREATE INDEX idx_cash_registers_currency ON cash_registers(currency_iso);
CREATE INDEX idx_cash_movements_register ON cash_register_movements(cash_register_id);
CREATE INDEX idx_cash_movements_type ON cash_register_movements(movement_type);
CREATE INDEX idx_cash_movements_date ON cash_register_movements(created_at);

-- ============================================================================
-- 12. TABLAS - TASAS DE CAMBIO (Multi-moneda)
-- ============================================================================

CREATE TABLE exchange_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
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

-- Índices
CREATE INDEX idx_exchange_rates_tenant ON exchange_rates(tenant_id);
CREATE INDEX idx_exchange_rates_currencies ON exchange_rates(from_currency, to_currency);
CREATE INDEX idx_exchange_rates_validity ON exchange_rates(valid_from, valid_until);

-- ============================================================================
-- 13. TABLAS - PAGOS DE FACTURA (Multi-moneda)
-- ============================================================================

CREATE TABLE invoice_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    cash_register_id UUID NOT NULL REFERENCES cash_registers(id),
    
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    currency_iso TEXT NOT NULL CHECK (currency_iso ~ '^[A-Z]{3}$'),
    exchange_rate NUMERIC(18,6) DEFAULT 1.0,
    amount_in_base_currency NUMERIC(12,2),
    
    payment_method TEXT CHECK (payment_method IN ('cash','card','transfer','zelle','pago_movil','crypto','other')),
    reference_number TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_invoice_payments_invoice ON invoice_payments(invoice_id);
CREATE INDEX idx_invoice_payments_register ON invoice_payments(cash_register_id);

-- ============================================================================
-- 14. TABLAS - TRANSFERENCIAS ENTRE CAJAS
-- ============================================================================

CREATE TABLE cash_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    from_register_id UUID NOT NULL REFERENCES cash_registers(id),
    to_register_id UUID NOT NULL REFERENCES cash_registers(id),
    
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    exchange_rate NUMERIC(18,6) DEFAULT 1.0,
    amount_received NUMERIC(12,2) NOT NULL CHECK (amount_received > 0),
    
    reason TEXT,
    
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CHECK (from_register_id != to_register_id)
);

-- ============================================================================
-- 15. TABLAS - NOTIFICACIONES
-- ============================================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Destinatario
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('customer', 'specialist', 'admin')),
    recipient_id UUID NOT NULL, -- customer_id o profile_id
    
    -- Contenido
    notification_type TEXT NOT NULL, -- 'appointment_confirmation', 'appointment_reminder', etc.
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- Canal
    channel TEXT DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'push', 'whatsapp')),
    
    -- Estado
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read')),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    
    -- Referencia
    reference_type TEXT, -- 'appointment', 'invoice', etc.
    reference_id UUID,
    
    -- Error (si falló)
    error_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_type, recipient_id);
CREATE INDEX idx_notifications_status ON notifications(status);

-- ============================================================================
-- 16. VISTAS - RESUMEN DE CAJAS EN TIEMPO REAL
-- ============================================================================

CREATE OR REPLACE VIEW v_cash_registers_summary AS
WITH movements_today AS (
    SELECT 
        cash_register_id,
        SUM(CASE WHEN movement_type = 'opening' THEN amount ELSE 0 END) as opening,
        SUM(CASE WHEN movement_type = 'income'  THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN movement_type = 'expense' THEN amount ELSE 0 END) as expense,
        COUNT(CASE WHEN movement_type IN ('income','expense') THEN 1 END) as transaction_count
    FROM cash_register_movements
    WHERE DATE(created_at) = CURRENT_DATE
    GROUP BY cash_register_id
),
last_closing AS (
    SELECT DISTINCT ON (cash_register_id)
        cash_register_id,
        COALESCE(closed_at, opened_at) AS last_closed_at,
        COALESCE(physical_balance, closing_balance_real) AS last_closing_balance
    FROM cash_register_closures
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
FROM cash_registers cr
LEFT JOIN branches b ON b.id = cr.branch_id
LEFT JOIN movements_today mt ON mt.cash_register_id = cr.id
LEFT JOIN last_closing lc ON lc.cash_register_id = cr.id
ORDER BY cr.is_virtual, cr.currency_iso, cr.name;

-- ============================================================================
-- 17. VISTAS - DISPONIBILIDAD DE ESPECIALISTAS
-- ============================================================================

CREATE OR REPLACE VIEW v_specialist_availability AS
SELECT 
    p.id as specialist_id,
    p.tenant_id,
    p.branch_id,
    p.full_name,
    p.rating,
    ss.day_of_week,
    ss.start_time,
    ss.end_time,
    ss.break_start,
    ss.break_end,
    ARRAY_AGG(DISTINCT s.id) as service_ids,
    ARRAY_AGG(DISTINCT s.name) as service_names
FROM profiles p
JOIN specialist_schedules ss ON ss.specialist_id = p.id
LEFT JOIN specialist_services sps ON sps.specialist_id = p.id AND sps.is_active = true
LEFT JOIN services s ON s.id = sps.service_id AND s.is_active = true
WHERE p.is_specialist = true 
  AND p.is_active = true
  AND ss.is_active = true
GROUP BY p.id, p.tenant_id, p.branch_id, p.full_name, p.rating, 
         ss.day_of_week, ss.start_time, ss.end_time, ss.break_start, ss.break_end;

-- ============================================================================
-- 18. VISTAS - AGENDA DEL DÍA
-- ============================================================================

CREATE OR REPLACE VIEW v_daily_appointments AS
SELECT 
    a.id,
    a.tenant_id,
    a.branch_id,
    b.name as branch_name,
    a.customer_id,
    c.full_name as customer_name,
    c.phone as customer_phone,
    a.specialist_id,
    p.full_name as specialist_name,
    a.service_id,
    s.name as service_name,
    a.scheduled_at,
    a.duration_minutes,
    a.ends_at,
    a.status,
    a.estimated_price,
    a.source,
    a.customer_notes,
    w.name as workstation_name
FROM appointments a
JOIN branches b ON b.id = a.branch_id
JOIN customers c ON c.id = a.customer_id
LEFT JOIN profiles p ON p.id = a.specialist_id
JOIN services s ON s.id = a.service_id
LEFT JOIN workstations w ON w.id = a.workstation_id
WHERE DATE(a.scheduled_at) = CURRENT_DATE
ORDER BY a.scheduled_at;

-- ============================================================================
-- 19. FUNCIONES HELPER ADICIONALES
-- ============================================================================

-- Función para obtener tasa de cambio vigente
CREATE OR REPLACE FUNCTION get_exchange_rate(
    p_tenant_id UUID,
    p_from_currency TEXT,
    p_to_currency TEXT,
    p_date TIMESTAMPTZ DEFAULT NOW()
) RETURNS NUMERIC AS $$
DECLARE
    v_rate NUMERIC;
BEGIN
    IF p_from_currency = p_to_currency THEN
        RETURN 1.0;
    END IF;
    
    SELECT rate INTO v_rate
    FROM exchange_rates
    WHERE tenant_id = p_tenant_id
      AND from_currency = p_from_currency
      AND to_currency = p_to_currency
      AND valid_from <= p_date
      AND (valid_until IS NULL OR valid_until > p_date)
    ORDER BY valid_from DESC
    LIMIT 1;
    
    RETURN COALESCE(v_rate, 1.0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Función para verificar disponibilidad de especialista
CREATE OR REPLACE FUNCTION check_specialist_availability(
    p_specialist_id UUID,
    p_scheduled_at TIMESTAMPTZ,
    p_duration_minutes INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_day_of_week TEXT;
    v_time TIME;
    v_end_time TIME;
    v_has_schedule BOOLEAN;
    v_has_exception BOOLEAN;
    v_has_conflict BOOLEAN;
BEGIN
    v_day_of_week := LOWER(TO_CHAR(p_scheduled_at, 'fmDay'));
    v_time := p_scheduled_at::TIME;
    v_end_time := (p_scheduled_at + (p_duration_minutes || ' minutes')::INTERVAL)::TIME;
    
    -- Verificar si tiene horario ese día
    SELECT EXISTS (
        SELECT 1 FROM specialist_schedules
        WHERE specialist_id = p_specialist_id
          AND day_of_week = v_day_of_week::day_of_week
          AND is_active = true
          AND v_time >= start_time
          AND v_end_time <= end_time
    ) INTO v_has_schedule;
    
    IF NOT v_has_schedule THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar excepciones (día libre)
    SELECT EXISTS (
        SELECT 1 FROM schedule_exceptions
        WHERE specialist_id = p_specialist_id
          AND exception_date = DATE(p_scheduled_at)
          AND is_day_off = true
    ) INTO v_has_exception;
    
    IF v_has_exception THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar conflictos con otras citas
    SELECT EXISTS (
        SELECT 1 FROM appointments
        WHERE specialist_id = p_specialist_id
          AND status NOT IN ('cancelled', 'no_show')
          AND (
            (scheduled_at <= p_scheduled_at AND ends_at > p_scheduled_at)
            OR (scheduled_at < p_scheduled_at + (p_duration_minutes || ' minutes')::INTERVAL AND ends_at >= p_scheduled_at + (p_duration_minutes || ' minutes')::INTERVAL)
            OR (scheduled_at >= p_scheduled_at AND ends_at <= p_scheduled_at + (p_duration_minutes || ' minutes')::INTERVAL)
          )
    ) INTO v_has_conflict;
    
    RETURN NOT v_has_conflict;
END;
$$ LANGUAGE plpgsql STABLE;

-- Función para obtener siguiente slot disponible
CREATE OR REPLACE FUNCTION get_next_available_slot(
    p_tenant_id UUID,
    p_branch_id UUID,
    p_service_id UUID,
    p_specialist_id UUID DEFAULT NULL,
    p_start_from TIMESTAMPTZ DEFAULT NOW()
) RETURNS TABLE (
    slot_time TIMESTAMPTZ,
    specialist_id UUID,
    specialist_name TEXT
) AS $$
DECLARE
    v_duration INTEGER;
BEGIN
    -- Obtener duración del servicio
    SELECT duration_minutes INTO v_duration
    FROM services WHERE id = p_service_id;
    
    -- Buscar slots disponibles
    -- (Implementación simplificada - en producción sería más compleja)
    RETURN QUERY
    SELECT 
        (p_start_from + '1 hour'::INTERVAL) as slot_time,
        p.id as specialist_id,
        p.full_name as specialist_name
    FROM profiles p
    WHERE p.tenant_id = p_tenant_id
      AND p.branch_id = p_branch_id
      AND p.is_specialist = true
      AND p.is_active = true
      AND (p_specialist_id IS NULL OR p.id = p_specialist_id)
    LIMIT 5;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 20. TRIGGERS ADICIONALES
-- ============================================================================

-- Trigger para actualizar updated_at en nuevas tablas
CREATE TRIGGER update_branches_updated_at
    BEFORE UPDATE ON branches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_workstations_updated_at
    BEFORE UPDATE ON workstations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_cash_registers_updated_at
    BEFORE UPDATE ON cash_registers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_closures_updated_at
    BEFORE UPDATE ON cash_register_closures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger para actualizar estadísticas de cliente
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE customers
        SET 
            total_visits = total_visits + 1,
            last_visit_at = NOW()
        WHERE id = NEW.customer_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_customer_stats
    AFTER UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_customer_stats();

-- ============================================================================
-- 21. ROW LEVEL SECURITY (RLS) - NUEVAS TABLAS
-- ============================================================================

-- Habilitar RLS
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialist_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE workstations ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialist_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_register_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_register_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Función helper para verificar pertenencia al tenant
CREATE OR REPLACE FUNCTION user_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT tenant_id FROM profiles 
        WHERE id = auth.uid()
        LIMIT 1
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Policies genéricas para tenant isolation
-- Branches
CREATE POLICY "branches_tenant_isolation" ON branches
    FOR ALL USING (tenant_id = user_tenant_id() OR is_global_admin());

-- Profiles
CREATE POLICY "profiles_tenant_isolation" ON profiles
    FOR ALL USING (tenant_id = user_tenant_id() OR is_global_admin());

-- Customers
CREATE POLICY "customers_tenant_isolation" ON customers
    FOR ALL USING (tenant_id = user_tenant_id() OR is_global_admin());

-- Services
CREATE POLICY "services_tenant_isolation" ON services
    FOR ALL USING (tenant_id = user_tenant_id() OR is_global_admin());

-- Workstations
CREATE POLICY "workstations_tenant_isolation" ON workstations
    FOR ALL USING (tenant_id = user_tenant_id() OR is_global_admin());

-- Appointments
CREATE POLICY "appointments_tenant_isolation" ON appointments
    FOR ALL USING (tenant_id = user_tenant_id() OR is_global_admin());

-- Invoices
CREATE POLICY "invoices_tenant_isolation" ON invoices
    FOR ALL USING (tenant_id = user_tenant_id() OR is_global_admin());

-- Cash Registers
CREATE POLICY "cash_registers_tenant_isolation" ON cash_registers
    FOR ALL USING (tenant_id = user_tenant_id() OR is_global_admin());

-- Exchange Rates
CREATE POLICY "exchange_rates_tenant_isolation" ON exchange_rates
    FOR ALL USING (tenant_id = user_tenant_id() OR is_global_admin());

-- Cash Transfers
CREATE POLICY "cash_transfers_tenant_isolation" ON cash_transfers
    FOR ALL USING (tenant_id = user_tenant_id() OR is_global_admin());

-- Notifications
CREATE POLICY "notifications_tenant_isolation" ON notifications
    FOR ALL USING (tenant_id = user_tenant_id() OR is_global_admin());

-- ============================================================================
-- 22. DATOS INICIALES - MÓDULOS ADICIONALES
-- ============================================================================

-- Agregar módulos específicos para salón de belleza
INSERT INTO modules (slug, name, description, icon, category, is_core, sort_order) VALUES
('services', 'Servicios', 'Catálogo de servicios y variantes', 'Scissors', 'core', true, 7),
('specialists', 'Especialistas', 'Gestión de especialistas y horarios', 'UserCog', 'core', true, 8),
('workstations', 'Puestos de Trabajo', 'Diagrama del salón y estaciones', 'LayoutGrid', 'core', true, 9),
('customers', 'Clientes', 'Base de datos de clientes', 'Users', 'core', true, 10),
('notifications', 'Notificaciones', 'Sistema de notificaciones', 'Bell', 'addon', false, 13),
('multi-currency', 'Multi-Moneda', 'Soporte para múltiples monedas', 'Coins', 'addon', false, 14)
ON CONFLICT (slug) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- ============================================================================
-- 23. COMENTARIOS DE DOCUMENTACIÓN
-- ============================================================================

COMMENT ON TABLE branches IS 'Sucursales del tenant';
COMMENT ON TABLE profiles IS 'Perfiles extendidos de usuarios, incluyendo especialistas';
COMMENT ON TABLE customers IS 'Base de datos de clientes del salón';
COMMENT ON TABLE services IS 'Catálogo de servicios ofrecidos';
COMMENT ON TABLE service_variants IS 'Variantes de servicios (ej: cabello corto, largo)';
COMMENT ON TABLE specialist_services IS 'Relación especialista-servicio con habilidades';
COMMENT ON TABLE workstations IS 'Puestos de trabajo/estaciones del salón';
COMMENT ON TABLE specialist_schedules IS 'Horarios base de especialistas por día';
COMMENT ON TABLE schedule_exceptions IS 'Excepciones de horario (vacaciones, etc.)';
COMMENT ON TABLE appointments IS 'Citas/reservas del salón';
COMMENT ON TABLE invoices IS 'Facturas generadas';
COMMENT ON TABLE cash_registers IS 'Cajas registradoras físicas y virtuales';
COMMENT ON TABLE exchange_rates IS 'Tasas de cambio para operación multi-moneda';
COMMENT ON TABLE notifications IS 'Sistema de notificaciones';

-- ============================================================================
-- FIN DEL SCRIPT COMPLEMENTARIO
-- ============================================================================