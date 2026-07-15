import type { Database, Json } from "./supabase";

export type Tables = Database["public"]["Tables"];
export type InsertTables = Tables[keyof Tables]["Insert"];
export type UpdateTables = Tables[keyof Tables]["Update"];

export type GlobalUser = Tables["global_users"]["Row"];
export type Module = Tables["modules"]["Row"];
export type Template = Tables["templates"]["Row"];
export type Theme = Tables["themes"]["Row"];
export type Tenant = Tables["tenants"]["Row"];
export type PublicTenant =
  Database["public"]["Views"]["v_tenants_public"]["Row"] & {
    id: string;
    slug: string;
    name: string;
  };
export type TenantModule = Tables["tenant_modules"]["Row"];
export type TenantUser = Tables["tenant_users"]["Row"];
export type TenantEcommerceSettings =
  Tables["tenant_ecommerce_settings"]["Row"];
export type TenantClientAppSettings =
  Tables["tenant_client_app_settings"]["Row"];
export type EcommerceStorefront =
  Database["public"]["Views"]["v_ecommerce_storefront_public"]["Row"];
export type EcommercePublicProduct =
  Database["public"]["Views"]["v_ecommerce_products_public"]["Row"];

export type Service = Tables["services"]["Row"];
export type ServiceVariant = Tables["service_variants"]["Row"];
export type ServiceCategory = Database["public"]["Enums"]["service_category"];

export type Customer = Tables["customers"]["Row"];
export type CustomerFavorite = Tables["customer_favorites"]["Row"];
export type FavoriteEntityType =
  Database["public"]["Enums"]["favorite_entity_type"];
export type CustomerDashboard =
  Database["public"]["Views"]["v_customer_dashboard"]["Row"];

export interface CustomerDashboardNextAppointment {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  specialist_id: string | null;
  specialist_name: string | null;
  service_id: string;
  service_name: string;
  estimated_price: number | null;
  currency_code: string | null;
  branch_id: string;
  branch_name: string;
}

export interface CustomerDashboardPastAppointment {
  id: string;
  scheduled_at: string;
  service_name: string;
  specialist_name: string | null;
  price: number | null;
  currency_code: string | null;
  status: string;
}

export interface CustomerDashboardTopService {
  service_id: string;
  service_name: string;
  count: number;
}

export type Profile = Tables["profiles"]["Row"];
export type Branch = Tables["branches"]["Row"];
export type SpecialistSchedule = Tables["specialist_schedules"]["Row"];
export type ScheduleException = Tables["schedule_exceptions"]["Row"];
export type SpecialistService = Tables["specialist_services"]["Row"];

export type GlobalRole = "super_admin" | "admin" | "support";
export type TenantRole = "owner" | "admin" | "manager" | "employee";
export type TenantStatus = "active" | "suspended" | "trial" | "cancelled";
export type ModuleStatus = "active" | "beta" | "deprecated" | "coming_soon";

export type Currency = Tables["currencies"]["Row"];
export type ExchangeRate = Tables["exchange_rates"]["Row"];
export type ExchangeRateLog = Tables["exchange_rate_logs"]["Row"];
export type UpsertExchangeRateData = Tables["exchange_rates"]["Insert"];

export type CashRegisterSession = Tables["cash_register_sessions"]["Row"];
export type CashRegisterSummary = Tables["cash_register_summaries"]["Row"];
export type CashRegisterMovement = Tables["cash_register_movements"]["Row"];

export type CommissionRule = Tables["commission_rules"]["Row"];
export type Commission = Tables["commissions"]["Row"];
export type CommissionScope = Database["public"]["Enums"]["commission_scope"];
export type CommissionType = Database["public"]["Enums"]["commission_type"];
export type CommissionStatus = Database["public"]["Enums"]["commission_status"];
export type OrderItemType = Database["public"]["Enums"]["order_item_type"];

export type SpecialistDebt = Tables["specialist_debts"]["Row"];
export type SpecialistDebtPayment = Tables["specialist_debt_payments"]["Row"];

export type CafeOrderType = Database["public"]["Enums"]["cafe_order_type"];
export type CafeOrderStatus = Database["public"]["Enums"]["cafe_order_status"];
export type MenuCategory = Tables["menu_categories"]["Row"];
export type MenuItem = Tables["menu_items"]["Row"];
export type MenuItemImage = Tables["menu_item_images"]["Row"];
export type CafeOrder = Tables["cafe_orders"]["Row"];
export type CafeOrderItem = Tables["cafe_order_items"]["Row"];

export type ProductSale = Tables["product_sales"]["Row"];

// Campañas + Segmentación (Fase 4)
export type CustomerSegment = Tables["customer_segments"]["Row"];
export type Campaign = Tables["campaigns"]["Row"];
export type CampaignRecipient = Tables["campaign_recipients"]["Row"];

export type CampaignType =
  | "reactivation"
  | "last_minute"
  | "transformation"
  | "birthday"
  | "custom";
export type CampaignChannel = "whatsapp" | "email" | "sms";
export type CampaignStatus =
  | "draft"
  | "ready"
  | "queued"
  | "sent"
  | "cancelled";
export type RecipientStatus = "queued" | "sent" | "failed" | "skipped";

/** Estadísticas agregadas de una campaña (columna stats jsonb) */
export interface CampaignStats {
  total?: number;
  queued?: number;
  sent?: number;
  failed?: number;
  skipped?: number;
}

/** Operadores soportados por el motor de segmentación */
export type SegmentOperator =
  | "eq"
  | "ne"
  | "gte"
  | "lte"
  | "in"
  | "not_in"
  | "contains"
  | "contains_any"
  | "between";

/** Una condición individual dentro de las reglas de un segmento */
export interface SegmentCondition {
  field: string;
  operator: SegmentOperator;
  value: string | number | boolean | Array<string | number>;
}

/** Estructura de la columna rules (jsonb) de customer_segments */
export interface SegmentRules {
  match: "all" | "any";
  conditions: SegmentCondition[];
}

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

export interface LayoutConfig {
  sidebar: {
    position: "left" | "right";
    width: string;
    collapsible: boolean;
    defaultCollapsed: boolean;
  };
  header: {
    position: "top" | "bottom";
    height: string;
    sticky: boolean;
    showLogo: boolean;
    showSearch: boolean;
    showUserMenu: boolean;
  };
  footer: {
    show: boolean;
    height: string;
  };
  content: {
    maxWidth: string;
    padding: string;
  };
}

export interface ComponentsConfig {
  loginPage: {
    layout: "split" | "centered" | "minimal";
    logoPosition: "center" | "top" | "left";
    showBackgroundImage: boolean;
  };
  dashboard: {
    showWelcomeCard: boolean;
    statsPosition: "top" | "side" | "hidden";
  };
}

export interface ThemeCSSVariables {
  light: Record<string, string>;
  dark: Record<string, string>;
}

export interface ThemeFonts {
  sans: string;
  mono: string;
}

export interface TenantWithRelations extends Tenant {
  template?: Template | null;
  theme?: Theme | null;
  modules?: TenantModuleWithModule[];
}

export interface TenantModuleWithModule extends TenantModule {
  module: Module;
}

export type { Database, Json };
