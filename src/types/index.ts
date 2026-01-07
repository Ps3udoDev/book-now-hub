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

export type GlobalRole = "super_admin" | "admin" | "support";
export type TenantRole = "owner" | "admin" | "manager" | "employee";
export type TenantStatus = "active" | "suspended" | "trial" | "cancelled";
export type ModuleStatus = "active" | "beta" | "deprecated" | "coming_soon";

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