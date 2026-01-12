-- ============================================================================
-- MULTI-TENANT SaaS PLATFORM - INITIAL SCHEMA
-- ============================================================================
-- Estructura base para gestionar múltiples tenants con módulos, templates y themes
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONES Y CONFIGURACIÓN
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. TIPOS ENUMERADOS
-- ============================================================================

-- Roles globales (superadmin de la plataforma)
CREATE TYPE global_role AS ENUM ('super_admin', 'admin', 'support');

-- Roles dentro de cada tenant
CREATE TYPE tenant_role AS ENUM ('owner', 'admin', 'manager', 'employee');

-- Estado del tenant
CREATE TYPE tenant_status AS ENUM ('active', 'suspended', 'trial', 'cancelled');

-- Estado del módulo
CREATE TYPE module_status AS ENUM ('active', 'beta', 'deprecated', 'coming_soon');

-- ============================================================================
-- 3. TABLAS CORE - USUARIOS GLOBALES (ADMINS DE LA PLATAFORMA)
-- ============================================================================

-- Usuarios globales que administran TODA la plataforma (tú)
CREATE TABLE global_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role global_role NOT NULL DEFAULT 'admin',
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. TABLAS CORE - MÓDULOS
-- ============================================================================

-- Catálogo de módulos disponibles en la plataforma
CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL, -- 'appointments', 'inventory', 'pos', etc.
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT, -- nombre del icono (lucide, etc.)
    category TEXT, -- 'core', 'addon', 'integration'
    is_core BOOLEAN DEFAULT false, -- módulos que todos deben tener
    status module_status DEFAULT 'active',
    version TEXT DEFAULT '1.0.0',
    config_schema JSONB DEFAULT '{}', -- schema de configuración del módulo
    default_config JSONB DEFAULT '{}', -- config por defecto
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. TABLAS CORE - TEMPLATES (Estructura de UI)
-- ============================================================================

-- Templates definen la ESTRUCTURA de la UI (qué componentes, dónde van)
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL, -- 'default', 'modern', 'minimal', 'dashboard-heavy'
    name TEXT NOT NULL,
    description TEXT,
    preview_image_url TEXT, -- screenshot del template
    
    -- Estructura de layout (sidebar, header, footer positions)
    layout_config JSONB NOT NULL DEFAULT '{
        "sidebar": {
            "position": "left",
            "width": "280px",
            "collapsible": true,
            "defaultCollapsed": false
        },
        "header": {
            "position": "top",
            "height": "64px",
            "sticky": true,
            "showLogo": true,
            "showSearch": true,
            "showUserMenu": true
        },
        "footer": {
            "show": false,
            "height": "48px"
        },
        "content": {
            "maxWidth": "1400px",
            "padding": "24px"
        }
    }',
    
    -- Componentes y sus posiciones
    components_config JSONB NOT NULL DEFAULT '{
        "loginPage": {
            "layout": "split",
            "logoPosition": "center",
            "showBackgroundImage": true
        },
        "dashboard": {
            "showWelcomeCard": true,
            "statsPosition": "top"
        }
    }',
    
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. TABLAS CORE - THEMES (Estilos CSS)
-- ============================================================================

-- Themes definen los ESTILOS (colores, fuentes, spacing)
CREATE TABLE themes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL, -- 'light', 'dark', 'ocean', 'sunset'
    name TEXT NOT NULL,
    description TEXT,
    preview_color TEXT, -- color principal para preview
    
    -- Variables CSS (compatible con tu globals.css y shadcn)
    css_variables JSONB NOT NULL DEFAULT '{
        "light": {
            "--radius": "0.625rem",
            "--background": "oklch(1 0 0)",
            "--foreground": "oklch(0.13 0.028 261.692)",
            "--card": "oklch(1 0 0)",
            "--card-foreground": "oklch(0.13 0.028 261.692)",
            "--popover": "oklch(1 0 0)",
            "--popover-foreground": "oklch(0.13 0.028 261.692)",
            "--primary": "oklch(0.21 0.034 264.665)",
            "--primary-foreground": "oklch(0.985 0.002 247.839)",
            "--secondary": "oklch(0.967 0.003 264.542)",
            "--secondary-foreground": "oklch(0.21 0.034 264.665)",
            "--muted": "oklch(0.967 0.003 264.542)",
            "--muted-foreground": "oklch(0.551 0.027 264.364)",
            "--accent": "oklch(0.967 0.003 264.542)",
            "--accent-foreground": "oklch(0.21 0.034 264.665)",
            "--destructive": "oklch(0.577 0.245 27.325)",
            "--border": "oklch(0.928 0.006 264.531)",
            "--input": "oklch(0.928 0.006 264.531)",
            "--ring": "oklch(0.707 0.022 261.325)"
        },
        "dark": {
            "--background": "oklch(0.13 0.028 261.692)",
            "--foreground": "oklch(0.985 0.002 247.839)",
            "--card": "oklch(0.21 0.034 264.665)",
            "--card-foreground": "oklch(0.985 0.002 247.839)",
            "--primary": "oklch(0.928 0.006 264.531)",
            "--primary-foreground": "oklch(0.21 0.034 264.665)"
        }
    }',
    
    -- Fuentes
    fonts JSONB DEFAULT '{
        "sans": "var(--font-geist-sans)",
        "mono": "var(--font-geist-mono)"
    }',
    
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. TABLAS CORE - TENANTS (Clientes/Empresas)
-- ============================================================================

-- Tenants son las empresas que usan tu plataforma
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificación
    slug TEXT UNIQUE NOT NULL, -- 'elviz-studio', 'denti-med' (usado en URL)
    name TEXT NOT NULL, -- nombre visible
    legal_name TEXT, -- razón social
    
    -- Dominio personalizado (opcional)
    custom_domain TEXT UNIQUE, -- 'elviz-studio.com' si tienen dominio propio
    
    -- Configuración regional
    country_code TEXT DEFAULT 'EC',
    timezone TEXT DEFAULT 'America/Guayaquil',
    currency_code TEXT DEFAULT 'USD',
    locale TEXT DEFAULT 'es-EC',
    
    -- Design (referencia a template y theme base, más customizaciones)
    template_id UUID REFERENCES templates(id),
    theme_id UUID REFERENCES themes(id),
    
    -- Customizaciones específicas de este tenant (overrides)
    custom_theme JSONB DEFAULT '{}', -- override de variables CSS
    custom_layout JSONB DEFAULT '{}', -- override de layout
    
    -- Branding
    logo_url TEXT,
    favicon_url TEXT,
    
    -- Estado y metadata
    status tenant_status DEFAULT 'trial',
    trial_ends_at TIMESTAMPTZ,
    subscription_plan TEXT DEFAULT 'starter', -- 'starter', 'pro', 'enterprise'
    
    -- Límites según plan
    max_users INTEGER DEFAULT 5,
    max_storage_mb INTEGER DEFAULT 500,
    
    -- Auditoría
    created_by UUID REFERENCES global_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 8. TABLAS CORE - RELACIÓN TENANT-MÓDULOS
-- ============================================================================

-- Qué módulos tiene activado cada tenant
CREATE TABLE tenant_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    
    -- Configuración específica de este módulo para este tenant
    config JSONB DEFAULT '{}',
    
    -- Estado
    is_enabled BOOLEAN DEFAULT true,
    enabled_at TIMESTAMPTZ DEFAULT NOW(),
    enabled_by UUID REFERENCES global_users(id),
    
    -- Límites específicos del módulo para este tenant
    limits JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, module_id)
);

-- ============================================================================
-- 9. TABLAS CORE - USUARIOS DE TENANTS
-- ============================================================================

-- Usuarios que pertenecen a un tenant específico
CREATE TABLE tenant_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role tenant_role NOT NULL DEFAULT 'employee',
    
    -- Permisos específicos (además del rol)
    permissions JSONB DEFAULT '[]', -- ['inventory.write', 'appointments.read']
    
    -- Datos del usuario en este tenant
    avatar_url TEXT,
    phone TEXT,
    position TEXT, -- 'Estilista Senior', 'Recepcionista'
    
    -- Estado
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(auth_user_id, tenant_id),
    UNIQUE(email, tenant_id)
);

-- ============================================================================
-- 10. ÍNDICES
-- ============================================================================

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_custom_domain ON tenants(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX idx_tenants_status ON tenants(status);

CREATE INDEX idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX idx_tenant_users_auth_user ON tenant_users(auth_user_id);
CREATE INDEX idx_tenant_users_email ON tenant_users(email);

CREATE INDEX idx_tenant_modules_tenant ON tenant_modules(tenant_id);
CREATE INDEX idx_tenant_modules_module ON tenant_modules(module_id);

CREATE INDEX idx_modules_slug ON modules(slug);
CREATE INDEX idx_modules_category ON modules(category);

-- ============================================================================
-- 11. FUNCIONES HELPER
-- ============================================================================

-- Función para obtener el tenant actual del JWT
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('request.jwt.claims', true)::json->>'tenant_id', '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si el usuario actual es global admin
CREATE OR REPLACE FUNCTION is_global_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role::TEXT INTO user_role
    FROM global_users
    WHERE auth_user_id = auth.uid();
    
    RETURN user_role IN ('super_admin', 'admin');
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si el usuario pertenece al tenant
CREATE OR REPLACE FUNCTION user_belongs_to_tenant(check_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM tenant_users
        WHERE auth_user_id = auth.uid()
        AND tenant_id = check_tenant_id
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 12. TRIGGERS
-- ============================================================================

CREATE TRIGGER update_global_users_updated_at
    BEFORE UPDATE ON global_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tenant_users_updated_at
    BEFORE UPDATE ON tenant_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_modules_updated_at
    BEFORE UPDATE ON modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tenant_modules_updated_at
    BEFORE UPDATE ON tenant_modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_themes_updated_at
    BEFORE UPDATE ON themes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 13. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE global_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 13.1 POLICIES - GLOBAL_USERS (Solo admins globales)
-- ============================================================================

CREATE POLICY "global_users_select_own"
    ON global_users FOR SELECT
    USING (auth_user_id = auth.uid());

CREATE POLICY "global_users_select_all_if_admin"
    ON global_users FOR SELECT
    USING (is_global_admin());

CREATE POLICY "global_users_insert_if_super_admin"
    ON global_users FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM global_users
            WHERE auth_user_id = auth.uid()
            AND role = 'super_admin'
        )
    );

CREATE POLICY "global_users_update_own"
    ON global_users FOR UPDATE
    USING (auth_user_id = auth.uid());

-- ============================================================================
-- 13.2 POLICIES - TENANTS
-- ============================================================================

-- Admins globales pueden ver todos los tenants
CREATE POLICY "tenants_select_if_global_admin"
    ON tenants FOR SELECT
    USING (is_global_admin());

-- Usuarios de un tenant pueden ver su propio tenant
CREATE POLICY "tenants_select_own"
    ON tenants FOR SELECT
    USING (user_belongs_to_tenant(id));

-- Solo admins globales pueden crear tenants
CREATE POLICY "tenants_insert_if_global_admin"
    ON tenants FOR INSERT
    WITH CHECK (is_global_admin());

-- Solo admins globales pueden actualizar tenants
CREATE POLICY "tenants_update_if_global_admin"
    ON tenants FOR UPDATE
    USING (is_global_admin());

-- ============================================================================
-- 13.3 POLICIES - TENANT_USERS
-- ============================================================================

-- Admins globales ven todos
CREATE POLICY "tenant_users_select_if_global_admin"
    ON tenant_users FOR SELECT
    USING (is_global_admin());

-- Usuarios ven a otros usuarios de su mismo tenant
CREATE POLICY "tenant_users_select_same_tenant"
    ON tenant_users FOR SELECT
    USING (user_belongs_to_tenant(tenant_id));

-- Admins globales pueden crear usuarios en cualquier tenant
CREATE POLICY "tenant_users_insert_if_global_admin"
    ON tenant_users FOR INSERT
    WITH CHECK (is_global_admin());

-- Owners/Admins del tenant pueden crear usuarios
CREATE POLICY "tenant_users_insert_if_tenant_admin"
    ON tenant_users FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tenant_users
            WHERE auth_user_id = auth.uid()
            AND tenant_id = tenant_users.tenant_id
            AND role IN ('owner', 'admin')
        )
    );

-- ============================================================================
-- 13.4 POLICIES - MODULES (Catálogo público, solo admins modifican)
-- ============================================================================

CREATE POLICY "modules_select_all"
    ON modules FOR SELECT
    USING (true); -- Todos pueden ver los módulos disponibles

CREATE POLICY "modules_insert_if_global_admin"
    ON modules FOR INSERT
    WITH CHECK (is_global_admin());

CREATE POLICY "modules_update_if_global_admin"
    ON modules FOR UPDATE
    USING (is_global_admin());

-- ============================================================================
-- 13.5 POLICIES - TENANT_MODULES
-- ============================================================================

CREATE POLICY "tenant_modules_select_if_global_admin"
    ON tenant_modules FOR SELECT
    USING (is_global_admin());

CREATE POLICY "tenant_modules_select_own_tenant"
    ON tenant_modules FOR SELECT
    USING (user_belongs_to_tenant(tenant_id));

CREATE POLICY "tenant_modules_insert_if_global_admin"
    ON tenant_modules FOR INSERT
    WITH CHECK (is_global_admin());

CREATE POLICY "tenant_modules_update_if_global_admin"
    ON tenant_modules FOR UPDATE
    USING (is_global_admin());

-- ============================================================================
-- 13.6 POLICIES - TEMPLATES & THEMES (Catálogo público)
-- ============================================================================

CREATE POLICY "templates_select_all"
    ON templates FOR SELECT
    USING (true);

CREATE POLICY "templates_insert_if_global_admin"
    ON templates FOR INSERT
    WITH CHECK (is_global_admin());

CREATE POLICY "templates_update_if_global_admin"
    ON templates FOR UPDATE
    USING (is_global_admin());

CREATE POLICY "themes_select_all"
    ON themes FOR SELECT
    USING (true);

CREATE POLICY "themes_insert_if_global_admin"
    ON themes FOR INSERT
    WITH CHECK (is_global_admin());

CREATE POLICY "themes_update_if_global_admin"
    ON themes FOR UPDATE
    USING (is_global_admin());

-- ============================================================================
-- 14. DATOS INICIALES
-- ============================================================================

-- Template por defecto
INSERT INTO templates (slug, name, description, is_default) VALUES
('default', 'Default Layout', 'Layout estándar con sidebar izquierdo y header fijo', true);

-- Theme por defecto (usando tus valores de globals.css)
INSERT INTO themes (slug, name, description, preview_color, is_default) VALUES
('gray', 'Gray Default', 'Tema gris por defecto de shadcn', '#71717a', true);

-- Módulos core iniciales
INSERT INTO modules (slug, name, description, icon, category, is_core, sort_order) VALUES
('dashboard', 'Dashboard', 'Panel principal con métricas y resumen', 'LayoutDashboard', 'core', true, 1),
('appointments', 'Citas', 'Gestión de citas y agenda', 'Calendar', 'core', true, 2),
('inventory', 'Inventario', 'Control de stock y productos', 'Package', 'core', true, 3),
('staff', 'Personal', 'Gestión de empleados y horarios', 'Users', 'core', true, 4),
('pos', 'Punto de Venta', 'Caja y ventas', 'CreditCard', 'core', true, 5),
('reports', 'Reportes', 'Analíticas y reportes', 'BarChart3', 'core', true, 6);

-- Módulos addon ejemplo
INSERT INTO modules (slug, name, description, icon, category, is_core, sort_order) VALUES
('ecommerce', 'E-Commerce', 'Tienda online y ventas web', 'ShoppingCart', 'addon', false, 10),
('campaigns', 'Campañas', 'Marketing y promociones', 'Megaphone', 'addon', false, 11),
('cafeteria', 'Cafetería', 'Gestión de área de cafetería', 'Coffee', 'addon', false, 12);