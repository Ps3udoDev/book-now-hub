// src/lib/services/branches.ts
import { createBrowserSB } from "@/lib/supabase/client";
import type { Tables } from "@/types";
import type { Json } from "@/types/supabase";

type Branch = Tables["branches"]["Row"];

export interface CreateBranchData {
    tenant_id: string;
    name: string;
    code?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    postal_code?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    phone?: string | null;
    email?: string | null;
    timezone?: string;
    is_main?: boolean;
    is_active?: boolean;
    operating_hours?: OperatingHours;
}

export interface UpdateBranchData {
    name?: string;
    code?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    postal_code?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    phone?: string | null;
    email?: string | null;
    timezone?: string;
    is_main?: boolean;
    is_active?: boolean;
    operating_hours?: OperatingHours;
}

export interface DayHours {
    open: string;
    close: string;
}

export interface OperatingHours {
    monday?: DayHours | null;
    tuesday?: DayHours | null;
    wednesday?: DayHours | null;
    thursday?: DayHours | null;
    friday?: DayHours | null;
    saturday?: DayHours | null;
    sunday?: DayHours | null;
}

// Horarios por defecto
export const DEFAULT_OPERATING_HOURS: OperatingHours = {
    monday: { open: "08:00", close: "18:00" },
    tuesday: { open: "08:00", close: "18:00" },
    wednesday: { open: "08:00", close: "18:00" },
    thursday: { open: "08:00", close: "18:00" },
    friday: { open: "08:00", close: "18:00" },
    saturday: { open: "09:00", close: "14:00" },
    sunday: null,
};

// Días de la semana para UI
export const WEEKDAYS = [
    { key: "monday", label: "Lunes" },
    { key: "tuesday", label: "Martes" },
    { key: "wednesday", label: "Miércoles" },
    { key: "thursday", label: "Jueves" },
    { key: "friday", label: "Viernes" },
    { key: "saturday", label: "Sábado" },
    { key: "sunday", label: "Domingo" },
] as const;

class BranchesService {
    private supabase = createBrowserSB();

    // ==================== CRUD ====================

    /**
     * Crear nueva sucursal
     */
    async createBranch(data: CreateBranchData): Promise<Branch> {
        // Si es la primera sucursal o se marca como principal, asegurarse de que sea la única principal
        if (data.is_main) {
            await this.clearMainBranch(data.tenant_id);
        }

        const { data: branch, error } = await this.supabase
            .from("branches")
            .insert({
                ...data,
                operating_hours: (data.operating_hours || DEFAULT_OPERATING_HOURS) as Json,
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating branch:", error);
            throw new Error(`Error al crear sucursal: ${error.message}`);
        }

        return branch;
    }

    /**
     * Actualizar sucursal
     */
    async updateBranch(branchId: string, data: UpdateBranchData): Promise<Branch> {
        // Si se marca como principal, quitar el flag de otras sucursales
        if (data.is_main) {
            const branch = await this.getBranchById(branchId);
            if (branch) {
                await this.clearMainBranch(branch.tenant_id);
            }
        }
        // Separar operating_hours del resto para manejar el tipo correctamente
        const { operating_hours, ...restData } = data;

        const updatePayload = {
            ...restData,
            updated_at: new Date().toISOString(),
            ...(operating_hours && { operating_hours: operating_hours as Json }),
        };

        const { data: branch, error } = await this.supabase
            .from("branches")
            .update(updatePayload)
            .eq("id", branchId)
            .select()
            .single();

        if (error) {
            console.error("Error updating branch:", error);
            throw new Error(`Error al actualizar sucursal: ${error.message}`);
        }

        return branch;
    }

    /**
     * Desactivar sucursal (soft delete)
     */
    async deactivateBranch(branchId: string): Promise<void> {
        const { error } = await this.supabase
            .from("branches")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq("id", branchId);

        if (error) {
            console.error("Error deactivating branch:", error);
            throw new Error(`Error al desactivar sucursal: ${error.message}`);
        }
    }

    /**
     * Reactivar sucursal
     */
    async reactivateBranch(branchId: string): Promise<void> {
        const { error } = await this.supabase
            .from("branches")
            .update({ is_active: true, updated_at: new Date().toISOString() })
            .eq("id", branchId);

        if (error) {
            console.error("Error reactivating branch:", error);
            throw new Error(`Error al reactivar sucursal: ${error.message}`);
        }
    }

    /**
     * Eliminar sucursal permanentemente
     */
    async deleteBranch(branchId: string): Promise<void> {
        const { error } = await this.supabase
            .from("branches")
            .delete()
            .eq("id", branchId);

        if (error) {
            console.error("Error deleting branch:", error);
            throw new Error(`Error al eliminar sucursal: ${error.message}`);
        }
    }

    // ==================== QUERIES ====================

    /**
     * Obtener todas las sucursales de un tenant
     */
    async getBranchesByTenant(tenantId: string): Promise<Branch[]> {
        const { data, error } = await this.supabase
            .from("branches")
            .select("*")
            .eq("tenant_id", tenantId)
            .order("is_main", { ascending: false })
            .order("name");

        if (error) {
            console.error("Error fetching branches:", error);
            throw new Error(`Error al obtener sucursales: ${error.message}`);
        }

        return data || [];
    }

    /**
     * Obtener sucursales activas de un tenant
     */
    async getActiveBranches(tenantId: string): Promise<Branch[]> {
        const { data, error } = await this.supabase
            .from("branches")
            .select("*")
            .eq("tenant_id", tenantId)
            .eq("is_active", true)
            .order("is_main", { ascending: false })
            .order("name");

        if (error) {
            console.error("Error fetching active branches:", error);
            throw new Error(`Error al obtener sucursales activas: ${error.message}`);
        }

        return data || [];
    }

    /**
     * Obtener sucursal por ID
     */
    async getBranchById(branchId: string): Promise<Branch | null> {
        const { data, error } = await this.supabase
            .from("branches")
            .select("*")
            .eq("id", branchId)
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                return null;
            }
            console.error("Error fetching branch:", error);
            throw new Error(`Error al obtener sucursal: ${error.message}`);
        }

        return data;
    }

    /**
     * Obtener sucursal principal de un tenant
     */
    async getMainBranch(tenantId: string): Promise<Branch | null> {
        const { data, error } = await this.supabase
            .from("branches")
            .select("*")
            .eq("tenant_id", tenantId)
            .eq("is_main", true)
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                return null;
            }
            console.error("Error fetching main branch:", error);
            throw new Error(`Error al obtener sucursal principal: ${error.message}`);
        }

        return data;
    }

    // ==================== HELPERS ====================

    /**
     * Quitar el flag de sucursal principal de todas las sucursales del tenant
     */
    private async clearMainBranch(tenantId: string): Promise<void> {
        const { error } = await this.supabase
            .from("branches")
            .update({ is_main: false })
            .eq("tenant_id", tenantId)
            .eq("is_main", true);

        if (error) {
            console.error("Error clearing main branch:", error);
        }
    }

    /**
     * Formatear dirección completa
     */
    formatFullAddress(branch: Branch): string {
        const parts = [
            branch.address,
            branch.city,
            branch.state,
            branch.postal_code,
            branch.country,
        ].filter(Boolean);

        return parts.join(", ");
    }

    /**
     * Verificar si la sucursal está abierta ahora
     */
    isOpenNow(branch: Branch): boolean {
        const hours = branch.operating_hours as OperatingHours | null;
        if (!hours) return false;

        const now = new Date();
        const dayIndex = now.getDay();
        const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const dayKey = dayKeys[dayIndex] as keyof OperatingHours;

        const todayHours = hours[dayKey];
        if (!todayHours) return false;

        const currentTime = now.toTimeString().slice(0, 5); // HH:MM
        return currentTime >= todayHours.open && currentTime <= todayHours.close;
    }

    /**
     * Obtener horario formateado para un día
     */
    formatDayHours(dayHours: DayHours | null): string {
        if (!dayHours) return "Cerrado";
        return `${dayHours.open} - ${dayHours.close}`;
    }
}

export const branchesService = new BranchesService();
