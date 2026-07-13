import { createBrowserSB } from "@/lib/supabase/client";
import type { Database, Module, PublicTenant, Tenant } from "@/types";

type TenantInsert = Database["public"]["Tables"]["tenants"]["Insert"];

export interface CreateTenantData {
  name: string;
  slug: string;
  legal_name?: string | null;
  country_code?: string | null;
  timezone?: string | null;
  currency_code?: string | null;
  subscription_plan?: string | null;
  max_users?: number | null;
  status?: Database["public"]["Enums"]["tenant_status"] | null;
}

export interface TenantWithModules {
  tenant: PublicTenant;
  modules: Module[];
}

class TenantsService {
  private supabase = createBrowserSB();

  /**
   * Obtener tenant por slug
   */
  async getTenantBySlug(slug: string): Promise<PublicTenant | null> {
    const { data, error } = await this.supabase
      .from("v_tenants_public")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data as PublicTenant;
  }

  /**
   * Crear nuevo tenant
   */
  async createTenant(data: CreateTenantData): Promise<Tenant> {
    const insertData: TenantInsert = {
      name: data.name,
      slug: data.slug,
      legal_name: data.legal_name,
      country_code: data.country_code,
      timezone: data.timezone,
      currency_code: data.currency_code,
      subscription_plan: data.subscription_plan,
      max_users: data.max_users,
      status: data.status,
    };

    const { data: tenant, error } = await this.supabase
      .from("tenants")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("Ya existe un tenant con ese slug");
      }
      throw error;
    }
    return tenant;
  }

  /**
   * Obtener módulos activos de un tenant
   */
  async getTenantModules(tenantId: string): Promise<Module[]> {
    const { data, error } = await this.supabase
      .from("tenant_modules")
      .select(`
                id,
                is_enabled,
                config,
                module:modules (
                    id,
                    slug,
                    name,
                    description,
                    icon,
                    category,
                    is_core
                )
            `)
      .eq("tenant_id", tenantId)
      .eq("is_enabled", true);

    if (error) throw error;

    // Extraer los módulos del join
    const modules = data?.map((tm) => tm.module).filter(Boolean) as Module[];

    return modules || [];
  }

  /**
   * Obtener el estado (is_enabled) de cada módulo del tenant.
   * Devuelve un mapa module_id → is_enabled (sólo módulos con fila).
   */
  async getTenantModuleStates(
    tenantId: string,
  ): Promise<Record<string, boolean>> {
    const { data, error } = await this.supabase
      .from("tenant_modules")
      .select("module_id, is_enabled")
      .eq("tenant_id", tenantId);

    if (error) throw error;

    const states: Record<string, boolean> = {};
    for (const row of data ?? []) {
      states[row.module_id] = row.is_enabled ?? false;
    }
    return states;
  }

  /**
   * Activar/desactivar un módulo de un tenant (escritura vía API route).
   */
  async setModuleEnabled(
    tenantId: string,
    moduleId: string,
    enabled: boolean,
  ): Promise<void> {
    const res = await fetch(`/api/tenants/${tenantId}/modules`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleId, enabled }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error((json as { error?: string }).error || "Error al guardar");
    }
  }

  /**
   * Obtener un tenant por id (lectura admin vía vista pública).
   */
  async getTenantById(id: string): Promise<PublicTenant | null> {
    const { data, error } = await this.supabase
      .from("v_tenants_public")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data as PublicTenant;
  }

  /**
   * Asignar módulos a un tenant
   */
  async assignModulesToTenant(
    tenantId: string,
    moduleIds: string[],
  ): Promise<void> {
    if (moduleIds.length === 0) return;

    const moduleAssignments = moduleIds.map((moduleId) => ({
      tenant_id: tenantId,
      module_id: moduleId,
      is_enabled: true,
    }));

    const { error } = await this.supabase
      .from("tenant_modules")
      .insert(moduleAssignments);

    if (error) {
      console.error("Error asignando módulos:", error);
      throw error;
    }
  }

  /**
   * Obtener datos completos del tenant con sus módulos
   */
  async getTenantWithModules(slug: string): Promise<TenantWithModules | null> {
    const tenant = await this.getTenantBySlug(slug);
    if (!tenant) return null;

    const modules = await this.getTenantModules(tenant.id);
    return { tenant, modules };
  }

  /**
   * Obtener todos los tenants
   */
  async getAllTenants(): Promise<Tenant[]> {
    const { data, error } = await this.supabase
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Obtener estadísticas de tenants
   */
  async getTenantsStats(): Promise<{
    total: number;
    active: number;
    trial: number;
    suspended: number;
  }> {
    const { data, error } = await this.supabase
      .from("tenants")
      .select("status");

    if (error) throw error;

    const tenants = data || [];
    return {
      total: tenants.length,
      active: tenants.filter((t) => t.status === "active").length,
      trial: tenants.filter((t) => t.status === "trial").length,
      suspended: tenants.filter((t) => t.status === "suspended").length,
    };
  }
}

export const tenantsService = new TenantsService();
