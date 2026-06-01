// src/lib/services/workstations.ts
import { createBrowserSB } from "@/lib/supabase/client";
import type { Tables } from "@/types";

type Workstation = Tables["workstations"]["Row"];

export interface CreateWorkstationData {
    tenant_id: string;
    branch_id: string;
    name: string;
    code?: string | null;
    station_type?: string;
    position_x?: number;
    position_y?: number;
    floor?: number;
    compatible_services?: string[] | null;
    is_active?: boolean;
}

export interface UpdateWorkstationData {
    name?: string;
    code?: string | null;
    branch_id?: string;
    station_type?: string;
    position_x?: number;
    position_y?: number;
    floor?: number;
    compatible_services?: string[] | null;
    is_active?: boolean;
    cafeteria_qr_enabled?: boolean;
    cafeteria_qr_slug?: string | null;
    cafeteria_qr_last_generated_at?: string | null;
    cafeteria_qr_updated_by?: string | null;
}

export interface CafeteriaQrWorkstation extends Workstation {
    current_specialist_id?: string | null;
    current_specialist_name?: string | null;
}

// Tipos de estación predefinidos
export const STATION_TYPES = [
    { value: "general", label: "General", icon: "Armchair", color: "#6B7280" },
    { value: "chair", label: "Sillón de corte", icon: "Armchair", color: "#8B4513" },
    { value: "wash_station", label: "Lavacabezas", icon: "Droplets", color: "#4169E1" },
    { value: "styling_station", label: "Tocador", icon: "Sparkles", color: "#FFD700" },
    { value: "nail_station", label: "Mesa de manicure", icon: "Hand", color: "#FF69B4" },
    { value: "pedicure_station", label: "Sillón de pedicure", icon: "Footprints", color: "#DDA0DD" },
    { value: "facial_room", label: "Cabina facial", icon: "Flower2", color: "#98FB98" },
    { value: "massage_room", label: "Cabina de masajes", icon: "Heart", color: "#E6E6FA" },
    { value: "makeup_station", label: "Tocador de maquillaje", icon: "Palette", color: "#FFC0CB" },
    { value: "waiting_area", label: "Área de espera", icon: "Sofa", color: "#D3D3D3" },
    { value: "reception", label: "Recepción", icon: "ConciergeBell", color: "#F5DEB3" },
] as const;

// Helper para obtener info de un tipo de estación
export function getStationType(value: string) {
    return STATION_TYPES.find((t) => t.value === value) || STATION_TYPES[0];
}

class WorkstationsService {
    private supabase = createBrowserSB();

    // ==================== CRUD ====================

    /**
     * Crear nueva estación de trabajo
     */
    async createWorkstation(data: CreateWorkstationData): Promise<Workstation> {
        const { data: workstation, error } = await this.supabase
            .from("workstations")
            .insert({
                ...data,
                station_type: data.station_type || "general",
                position_x: data.position_x ?? 0,
                position_y: data.position_y ?? 0,
                floor: data.floor ?? 1,
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating workstation:", error);
            throw new Error(`Error al crear puesto de trabajo: ${error.message}`);
        }

        return workstation;
    }

    /**
     * Actualizar estación de trabajo
     */
    async updateWorkstation(workstationId: string, data: UpdateWorkstationData): Promise<Workstation> {
        const { data: workstation, error } = await this.supabase
            .from("workstations")
            .update({
                ...data,
                updated_at: new Date().toISOString(),
            })
            .eq("id", workstationId)
            .select()
            .single();

        if (error) {
            console.error("Error updating workstation:", error);
            throw new Error(`Error al actualizar puesto de trabajo: ${error.message}`);
        }

        return workstation;
    }

    async updateCafeteriaQr(
        workstationId: string,
        data: {
            enabled: boolean;
            slug?: string | null;
        }
    ): Promise<CafeteriaQrWorkstation> {
        const res = await fetch(`/api/cafeteria/settings/workstations/${workstationId}/qr`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        const json = await res.json();
        if (!res.ok) {
            throw new Error(json.error || "No se pudo actualizar el QR de cafetería");
        }

        return json.workstation as CafeteriaQrWorkstation;
    }

    /**
     * Desactivar estación (soft delete)
     */
    async deactivateWorkstation(workstationId: string): Promise<void> {
        const { error } = await this.supabase
            .from("workstations")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq("id", workstationId);

        if (error) {
            console.error("Error deactivating workstation:", error);
            throw new Error(`Error al desactivar puesto de trabajo: ${error.message}`);
        }
    }

    /**
     * Reactivar estación
     */
    async reactivateWorkstation(workstationId: string): Promise<void> {
        const { error } = await this.supabase
            .from("workstations")
            .update({ is_active: true, updated_at: new Date().toISOString() })
            .eq("id", workstationId);

        if (error) {
            console.error("Error reactivating workstation:", error);
            throw new Error(`Error al reactivar puesto de trabajo: ${error.message}`);
        }
    }

    /**
     * Eliminar estación permanentemente
     */
    async deleteWorkstation(workstationId: string): Promise<void> {
        const { error } = await this.supabase
            .from("workstations")
            .delete()
            .eq("id", workstationId);

        if (error) {
            console.error("Error deleting workstation:", error);
            throw new Error(`Error al eliminar puesto de trabajo: ${error.message}`);
        }
    }

    // ==================== QUERIES ====================

    /**
     * Obtener todas las estaciones de un tenant
     */
    async getWorkstationsByTenant(tenantId: string): Promise<Workstation[]> {
        const { data, error } = await this.supabase
            .from("workstations")
            .select("*")
            .eq("tenant_id", tenantId)
            .order("branch_id")
            .order("name");

        if (error) {
            console.error("Error fetching workstations:", error);
            throw new Error(`Error al obtener puestos de trabajo: ${error.message}`);
        }

        return data || [];
    }

    /**
     * Obtener estaciones por sucursal
     */
    async getWorkstationsByBranch(branchId: string): Promise<Workstation[]> {
        const { data, error } = await this.supabase
            .from("workstations")
            .select("*")
            .eq("branch_id", branchId)
            .order("station_type")
            .order("name");

        if (error) {
            console.error("Error fetching workstations by branch:", error);
            throw new Error(`Error al obtener puestos de trabajo: ${error.message}`);
        }

        return data || [];
    }

    /**
     * Obtener estaciones activas por sucursal
     */
    async getActiveWorkstationsByBranch(branchId: string): Promise<Workstation[]> {
        const { data, error } = await this.supabase
            .from("workstations")
            .select("*")
            .eq("branch_id", branchId)
            .eq("is_active", true)
            .order("station_type")
            .order("name");

        if (error) {
            console.error("Error fetching active workstations:", error);
            throw new Error(`Error al obtener puestos activos: ${error.message}`);
        }

        return data || [];
    }

    async getCafeteriaQrWorkstations(
        tenantId: string,
        branchId?: string | null,
    ): Promise<CafeteriaQrWorkstation[]> {
        const params = new URLSearchParams({ tenant_id: tenantId });
        if (branchId) {
            params.set("branch_id", branchId);
        }

        const res = await fetch(`/api/cafeteria/settings/workstations?${params.toString()}`);
        const json = await res.json();

        if (!res.ok) {
            throw new Error(json.error || "No se pudieron obtener las estaciones de cafetería");
        }

        return (json.workstations || []) as CafeteriaQrWorkstation[];
    }

    /**
     * Obtener estación por ID
     */
    async getWorkstationById(workstationId: string): Promise<Workstation | null> {
        const { data, error } = await this.supabase
            .from("workstations")
            .select("*")
            .eq("id", workstationId)
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                return null;
            }
            console.error("Error fetching workstation:", error);
            throw new Error(`Error al obtener puesto de trabajo: ${error.message}`);
        }

        return data;
    }

    /**
     * Obtener estaciones compatibles con un servicio
     */
    async getWorkstationsForService(branchId: string, serviceId: string): Promise<Workstation[]> {
        const { data, error } = await this.supabase
            .from("workstations")
            .select("*")
            .eq("branch_id", branchId)
            .eq("is_active", true)
            .contains("compatible_services", [serviceId]);

        if (error) {
            console.error("Error fetching compatible workstations:", error);
            throw new Error(`Error al obtener estaciones compatibles: ${error.message}`);
        }

        return data || [];
    }

    // ==================== HELPERS ====================

    /**
     * Contar estaciones por sucursal
     */
    async countByBranch(branchId: string): Promise<{ total: number; active: number }> {
        const { data, error } = await this.supabase
            .from("workstations")
            .select("is_active")
            .eq("branch_id", branchId);

        if (error) {
            console.error("Error counting workstations:", error);
            throw new Error(`Error al contar puestos: ${error.message}`);
        }

        const all = data || [];
        return {
            total: all.length,
            active: all.filter((w) => w.is_active).length,
        };
    }

    /**
     * Obtener estadísticas de estaciones por tenant
     */
    async getStats(tenantId: string): Promise<{
        total: number;
        active: number;
        byType: Record<string, number>;
    }> {
        const { data, error } = await this.supabase
            .from("workstations")
            .select("is_active, station_type")
            .eq("tenant_id", tenantId);

        if (error) {
            console.error("Error fetching workstation stats:", error);
            throw new Error(`Error al obtener estadísticas: ${error.message}`);
        }

        const all = data || [];
        const byType: Record<string, number> = {};
        for (const w of all) {
            const type = w.station_type || "general";
            byType[type] = (byType[type] || 0) + 1;
        }

        return {
            total: all.length,
            active: all.filter((w) => w.is_active).length,
            byType,
        };
    }

    /**
     * Obtener label del tipo de estación
     */
    getStationTypeLabel(type: string): string {
        return getStationType(type).label;
    }

    /**
     * Verificar si un código ya existe en la sucursal
     */
    async isCodeTaken(branchId: string, tenantId: string, code: string, excludeId?: string): Promise<boolean> {
        let query = this.supabase
            .from("workstations")
            .select("id")
            .eq("branch_id", branchId)
            .eq("tenant_id", tenantId)
            .eq("code", code);

        if (excludeId) {
            query = query.neq("id", excludeId);
        }

        const { data } = await query;
        return (data?.length || 0) > 0;
    }
}

export const workstationsService = new WorkstationsService();
