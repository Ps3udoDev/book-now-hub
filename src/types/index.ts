import type { Database } from "./supabase";

export type Tables = Database["public"]["Tables"];
export type InsertTables = Tables[keyof Tables]["Insert"];
export type UpdateTables = Tables[keyof Tables]["Update"];

export type GlobalUser = Tables["global_users"]["Row"];
export type Module = Tables["modules"]["Row"];
export type Template = Tables["templates"]["Row"];
export type Theme = Tables["themes"]["Row"];
export type Tenant = Tables["tenants"]["Row"];
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

export type { Database };
