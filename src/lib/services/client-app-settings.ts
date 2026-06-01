import { createBrowserSB } from "@/lib/supabase/client";
import type { Database } from "@/types";

export type TenantClientAppSettings =
  Database["public"]["Tables"]["tenant_client_app_settings"]["Row"];

export type PublicClientAppSettings =
  Database["public"]["Functions"]["get_public_client_app_settings"]["Returns"][number];

export type UpdateClientAppSettingsPayload = Partial<
  Pick<
    TenantClientAppSettings,
    | "template_slug"
    | "theme_mode"
    | "brand_name"
    | "logo_url"
    | "hero_image_url"
    | "welcome_title"
    | "welcome_subtitle"
    | "google_login_enabled"
    | "show_google_login_preview"
    | "custom_tokens"
    | "custom_sections"
  >
> & {
  client_app_enabled?: boolean;
};

class ClientAppSettingsService {
  private supabase = createBrowserSB();

  async getTenantSettings(
    tenantId: string,
  ): Promise<TenantClientAppSettings | null> {
    const { data, error } = await this.supabase
      .from("tenant_client_app_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async getPublicSettings(
    tenantSlug: string,
  ): Promise<PublicClientAppSettings | null> {
    const { data, error } = await this.supabase.rpc(
      "get_public_client_app_settings",
      { p_tenant_slug: tenantSlug },
    );

    if (error) throw error;
    return data?.[0] ?? null;
  }

  async updateTenantSettings(
    tenantId: string,
    payload: UpdateClientAppSettingsPayload,
  ): Promise<{
    tenant: { id: string; slug: string; client_app_enabled: boolean };
    settings: TenantClientAppSettings;
  }> {
    const res = await fetch(`/api/tenants/${tenantId}/client-app`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "No se pudo actualizar la app cliente");
    }
    return data;
  }
}

export const clientAppSettingsService = new ClientAppSettingsService();
