// src/lib/services/appearance.ts
import { createBrowserSB } from "@/lib/supabase/client";
import type { Database, Theme, ThemeCSSVariables } from "@/types";

type Json = Database["public"]["Tables"]["tenants"]["Row"]["custom_theme"];

class AppearanceService {
  private supabase = createBrowserSB();

  /**
   * Obtener todos los temas disponibles
   */
  async getThemes(): Promise<Theme[]> {
    const { data, error } = await this.supabase
      .from("themes")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) throw error;
    return data || [];
  }

  /**
   * Obtener un tema por ID
   */
  async getThemeById(themeId: string): Promise<Theme | null> {
    const { data, error } = await this.supabase
      .from("themes")
      .select("*")
      .eq("id", themeId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  }

  /**
   * Obtener el tema actual del tenant (funciona en vistas autenticadas y públicas)
   */
  async getTenantTheme(tenantId: string): Promise<{
    theme_id: string | null;
    custom_theme: ThemeCSSVariables | null;
    theme: Theme | null;
  }> {
    const { data, error } = await this.supabase
      .from("v_tenants_public")
      .select("theme_id, custom_theme")
      .eq("id", tenantId)
      .single();

    if (error) throw error;

    const themeId = data?.theme_id || null;
    const theme = themeId ? await this.getThemeById(themeId) : null;

    return {
      theme_id: themeId,
      custom_theme:
        (data?.custom_theme as unknown as ThemeCSSVariables) || null,
      theme,
    };
  }

  /**
   * Actualizar el tema seleccionado del tenant
   */
  async updateTenantTheme(
    tenantId: string,
    themeId: string | null,
  ): Promise<void> {
    const { error } = await this.supabase
      .from("tenants")
      .update({
        theme_id: themeId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tenantId);

    if (error) throw error;
  }

  /**
   * Actualizar el tema personalizado del tenant (CSS variables override)
   */
  async updateCustomTheme(
    tenantId: string,
    customTheme: ThemeCSSVariables | null,
  ): Promise<void> {
    const { error } = await this.supabase
      .from("tenants")
      .update({
        custom_theme: customTheme as unknown as Json,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tenantId);

    if (error) throw error;
  }

  /**
   * Actualizar tema seleccionado y custom theme a la vez
   */
  async updateTenantAppearance(
    tenantId: string,
    data: {
      theme_id?: string | null;
      custom_theme?: ThemeCSSVariables | null;
    },
  ): Promise<void> {
    // biome-ignore lint/suspicious/noExplicitAny: Supabase Json type casting
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.theme_id !== undefined) {
      updateData.theme_id = data.theme_id;
    }
    if (data.custom_theme !== undefined) {
      updateData.custom_theme = data.custom_theme;
    }

    const { error } = await this.supabase
      .from("tenants")
      .update(updateData)
      .eq("id", tenantId);

    if (error) throw error;
  }
}

export const appearanceService = new AppearanceService();
