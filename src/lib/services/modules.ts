import { createBrowserSB } from "@/lib/supabase/client";
import type { Module } from "@/types";

class ModulesService {
    private supabase = createBrowserSB();

    /**
     * Obtener todos los módulos activos ordenados
     */
    async getActiveModules(): Promise<Module[]> {
        const { data, error } = await this.supabase
            .from("modules")
            .select("*")
            .eq("status", "active")
            .order("sort_order");

        if (error) throw error;
        return data || [];
    }

    /**
     * Obtener un módulo por su slug
     */
    async getModuleBySlug(slug: string): Promise<Module | null> {
        const { data, error } = await this.supabase
            .from("modules")
            .select("*")
            .eq("slug", slug)
            .single();

        if (error) {
            if (error.code === "PGRST116") return null;
            throw error;
        }
        return data;
    }

    /**
     * Obtener módulos core (obligatorios)
     */
    async getCoreModules(): Promise<Module[]> {
        const { data, error } = await this.supabase
            .from("modules")
            .select("*")
            .eq("status", "active")
            .eq("is_core", true)
            .order("sort_order");

        if (error) throw error;
        return data || [];
    }
}

export const modulesService = new ModulesService();
