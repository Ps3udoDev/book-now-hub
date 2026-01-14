// src/lib/services/specialists.ts
import { createBrowserSB } from "@/lib/supabase/client";
import type { Tables } from "@/types";

type Profile = Tables["profiles"]["Row"];
type ProfileInsert = Tables["profiles"]["Insert"];
type ProfileUpdate = Tables["profiles"]["Update"];
type SpecialistService = Tables["specialist_services"]["Row"];
type Service = Tables["services"]["Row"];

export interface SpecialistWithServices extends Profile {
    specialist_services?: (SpecialistService & { service: Service })[];
}

export interface CreateSpecialistData {
    tenant_id: string;
    branch_id?: string | null;
    full_name: string;
    email: string;
    phone?: string | null;
    avatar_url?: string | null;
    role?: "owner" | "admin" | "manager" | "employee";
    specialties?: string[];
    bio?: string | null;
    commission_type?: "percentage" | "fixed" | "mixed" | null;
    commission_percentage?: number;
    commission_fixed?: number;
    is_active?: boolean;
}

export interface UpdateSpecialistData {
    branch_id?: string | null;
    full_name?: string;
    email?: string;
    phone?: string | null;
    avatar_url?: string | null;
    role?: "owner" | "admin" | "manager" | "employee";
    specialties?: string[];
    bio?: string | null;
    commission_type?: "percentage" | "fixed" | "mixed" | null;
    commission_percentage?: number;
    commission_fixed?: number;
    rating?: number;
    total_ratings?: number;
    is_active?: boolean;
}

export interface AssignServiceData {
    specialist_id: string;
    service_id: string;
    tenant_id: string;
    custom_price?: number | null;
    custom_duration?: number | null;
    skill_level?: number;
    is_active?: boolean;
}

export interface SpecialistStats {
    total: number;
    active: number;
    byBranch: Record<string, number>;
}

// Especialidades predefinidas
export const SPECIALTIES = [
    { value: "hair_cutting", label: "Corte de cabello" },
    { value: "hair_coloring", label: "Coloración" },
    { value: "hair_styling", label: "Peinados" },
    { value: "balayage", label: "Balayage / Mechas" },
    { value: "keratin", label: "Keratina / Alisados" },
    { value: "nails_manicure", label: "Manicure" },
    { value: "nails_pedicure", label: "Pedicure" },
    { value: "nails_acrylic", label: "Uñas acrílicas" },
    { value: "nails_gel", label: "Uñas en gel" },
    { value: "makeup", label: "Maquillaje" },
    { value: "skincare", label: "Tratamientos faciales" },
    { value: "massage", label: "Masajes" },
    { value: "barbering", label: "Barbería" },
    { value: "eyebrows", label: "Cejas / Micropigmentación" },
    { value: "eyelashes", label: "Pestañas" },
] as const;

class SpecialistsService {
    private supabase = createBrowserSB();

    // ============================================
    // ESPECIALISTAS (PROFILES)
    // ============================================

    /**
     * Obtener todos los especialistas de un tenant
     */
    async getSpecialistsByTenant(tenantId: string): Promise<Profile[]> {
        const { data, error } = await this.supabase
            .from("profiles")
            .select("*")
            .eq("tenant_id", tenantId)
            .eq("is_specialist", true)
            .order("full_name", { ascending: true });

        if (error) throw error;
        return data || [];
    }

    /**
     * Obtener especialistas activos de un tenant
     */
    async getActiveSpecialists(tenantId: string): Promise<Profile[]> {
        const { data, error } = await this.supabase
            .from("profiles")
            .select("*")
            .eq("tenant_id", tenantId)
            .eq("is_specialist", true)
            .eq("is_active", true)
            .order("rating", { ascending: false })
            .order("full_name", { ascending: true });

        if (error) throw error;
        return data || [];
    }

    /**
     * Obtener especialistas por sucursal
     */
    async getSpecialistsByBranch(
        tenantId: string,
        branchId: string
    ): Promise<Profile[]> {
        const { data, error } = await this.supabase
            .from("profiles")
            .select("*")
            .eq("tenant_id", tenantId)
            .eq("branch_id", branchId)
            .eq("is_specialist", true)
            .eq("is_active", true)
            .order("full_name", { ascending: true });

        if (error) throw error;
        return data || [];
    }

    /**
     * Obtener especialista por ID con sus servicios
     */
    async getSpecialistById(
        specialistId: string
    ): Promise<SpecialistWithServices | null> {
        const { data, error } = await this.supabase
            .from("profiles")
            .select(`
        *,
        specialist_services(
          *,
          service:services(*)
        )
      `)
            .eq("id", specialistId)
            .eq("is_specialist", true)
            .single();

        if (error) {
            if (error.code === "PGRST116") return null;
            throw error;
        }

        return data as SpecialistWithServices;
    }

    /**
     * Obtener especialistas que pueden realizar un servicio específico
     */
    async getSpecialistsForService(
        tenantId: string,
        serviceId: string
    ): Promise<Profile[]> {
        const { data, error } = await this.supabase
            .from("specialist_services")
            .select(`
        specialist:profiles!specialist_id(*)
      `)
            .eq("service_id", serviceId)
            .eq("is_active", true);

        if (error) throw error;

        // Filtrar por tenant y especialistas activos
        const specialists = (data || [])
            .map((item) => item.specialist as Profile)
            .filter(
                (s) => s && s.tenant_id === tenantId && s.is_specialist && s.is_active
            );

        // Ordenar por rating descendente
        return specialists.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    /**
     * Crear nuevo especialista
     * NOTA: El usuario debe existir en auth.users primero
     */
    async createSpecialist(
        userId: string,
        data: CreateSpecialistData
    ): Promise<Profile> {
        const insertData: ProfileInsert = {
            id: userId,
            tenant_id: data.tenant_id,
            branch_id: data.branch_id || null,
            full_name: data.full_name.trim(),
            email: data.email.toLowerCase().trim(),
            phone: data.phone || null,
            avatar_url: data.avatar_url || null,
            role: data.role || "employee",
            is_specialist: true,
            specialties: data.specialties || [],
            bio: data.bio || null,
            commission_type: data.commission_type || "percentage",
            commission_percentage: data.commission_percentage ?? 0,
            commission_fixed: data.commission_fixed ?? 0,
            rating: 0,
            total_ratings: 0,
            is_active: data.is_active ?? true,
        };

        const { data: profile, error } = await this.supabase
            .from("profiles")
            .insert(insertData)
            .select()
            .single();

        if (error) {
            if (error.code === "23505") {
                throw new Error("Ya existe un perfil para este usuario");
            }
            throw error;
        }

        return profile;
    }

    /**
     * Actualizar especialista
     */
    async updateSpecialist(
        specialistId: string,
        data: UpdateSpecialistData
    ): Promise<Profile> {
        const updateData: ProfileUpdate = {};

        if (data.branch_id !== undefined) updateData.branch_id = data.branch_id;
        if (data.full_name !== undefined)
            updateData.full_name = data.full_name.trim();
        if (data.email !== undefined)
            updateData.email = data.email.toLowerCase().trim();
        if (data.phone !== undefined) updateData.phone = data.phone;
        if (data.avatar_url !== undefined) updateData.avatar_url = data.avatar_url;
        if (data.role !== undefined) updateData.role = data.role;
        if (data.specialties !== undefined) updateData.specialties = data.specialties;
        if (data.bio !== undefined) updateData.bio = data.bio;
        if (data.commission_type !== undefined)
            updateData.commission_type = data.commission_type;
        if (data.commission_percentage !== undefined)
            updateData.commission_percentage = data.commission_percentage;
        if (data.commission_fixed !== undefined)
            updateData.commission_fixed = data.commission_fixed;
        if (data.rating !== undefined) updateData.rating = data.rating;
        if (data.total_ratings !== undefined)
            updateData.total_ratings = data.total_ratings;
        if (data.is_active !== undefined) updateData.is_active = data.is_active;

        const { data: profile, error } = await this.supabase
            .from("profiles")
            .update(updateData)
            .eq("id", specialistId)
            .select()
            .single();

        if (error) throw error;
        return profile;
    }

    /**
     * Desactivar especialista
     */
    async deactivateSpecialist(specialistId: string): Promise<void> {
        const { error } = await this.supabase
            .from("profiles")
            .update({ is_active: false })
            .eq("id", specialistId);

        if (error) throw error;
    }

    /**
     * Reactivar especialista
     */
    async reactivateSpecialist(specialistId: string): Promise<void> {
        const { error } = await this.supabase
            .from("profiles")
            .update({ is_active: true })
            .eq("id", specialistId);

        if (error) throw error;
    }

    // ============================================
    // SERVICIOS DEL ESPECIALISTA
    // ============================================

    /**
     * Obtener servicios asignados a un especialista
     */
    async getSpecialistServices(
        specialistId: string
    ): Promise<(SpecialistService & { service: Service })[]> {
        const { data, error } = await this.supabase
            .from("specialist_services")
            .select(`
        *,
        service:services(*)
      `)
            .eq("specialist_id", specialistId)
            .order("created_at", { ascending: true });

        if (error) throw error;
        return (data || []) as (SpecialistService & { service: Service })[];
    }

    /**
     * Asignar servicio a especialista
     */
    async assignService(data: AssignServiceData): Promise<SpecialistService> {
        const insertData = {
            specialist_id: data.specialist_id,
            service_id: data.service_id,
            tenant_id: data.tenant_id,
            custom_price: data.custom_price || null,
            custom_duration: data.custom_duration || null,
            skill_level: data.skill_level ?? 3,
            is_active: data.is_active ?? true,
        };

        const { data: specialistService, error } = await this.supabase
            .from("specialist_services")
            .insert(insertData)
            .select()
            .single();

        if (error) {
            if (error.code === "23505") {
                throw new Error("Este servicio ya está asignado al especialista");
            }
            throw error;
        }

        return specialistService;
    }

    /**
     * Actualizar servicio asignado
     */
    async updateAssignedService(
        id: string,
        data: Partial<AssignServiceData>
    ): Promise<SpecialistService> {
        const { data: updated, error } = await this.supabase
            .from("specialist_services")
            .update({
                custom_price: data.custom_price,
                custom_duration: data.custom_duration,
                skill_level: data.skill_level,
                is_active: data.is_active,
            })
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;
        return updated;
    }

    /**
     * Remover servicio de especialista
     */
    async removeService(id: string): Promise<void> {
        const { error } = await this.supabase
            .from("specialist_services")
            .delete()
            .eq("id", id);

        if (error) throw error;
    }

    /**
     * Asignar múltiples servicios a especialista
     */
    async assignMultipleServices(
        specialistId: string,
        serviceIds: string[],
        tenantId: string
    ): Promise<void> {
        const insertData = serviceIds.map((serviceId) => ({
            specialist_id: specialistId,
            service_id: serviceId,
            tenant_id: tenantId,
            skill_level: 3,
            is_active: true,
        }));

        const { error } = await this.supabase
            .from("specialist_services")
            .upsert(insertData, { onConflict: "specialist_id,service_id" });

        if (error) throw error;
    }

    // ============================================
    // UTILIDADES
    // ============================================

    /**
     * Obtener estadísticas de especialistas
     */
    async getSpecialistStats(tenantId: string): Promise<SpecialistStats> {
        const { data, error } = await this.supabase
            .from("profiles")
            .select("is_active, branch_id")
            .eq("tenant_id", tenantId)
            .eq("is_specialist", true);

        if (error) throw error;

        const specialists = data || [];
        const byBranch: Record<string, number> = {};

        specialists.forEach((s) => {
            if (s.branch_id) {
                byBranch[s.branch_id] = (byBranch[s.branch_id] || 0) + 1;
            }
        });

        return {
            total: specialists.length,
            active: specialists.filter((s) => s.is_active).length,
            byBranch,
        };
    }

    /**
     * Calcular comisión de un especialista
     */
    calculateCommission(
        specialist: Profile,
        servicePrice: number
    ): number {
        if (!specialist.commission_type) return 0;

        switch (specialist.commission_type) {
            case "percentage":
                return servicePrice * ((specialist.commission_percentage || 0) / 100);
            case "fixed":
                return specialist.commission_fixed || 0;
            case "mixed":
                const percentage =
                    servicePrice * ((specialist.commission_percentage || 0) / 100);
                return percentage + (specialist.commission_fixed || 0);
            default:
                return 0;
        }
    }

    /**
     * Formatear rating como estrellas
     */
    formatRating(rating: number | null): string {
        if (!rating) return "Sin calificaciones";
        const stars = "★".repeat(Math.floor(rating)) + "☆".repeat(5 - Math.floor(rating));
        return `${stars} (${rating.toFixed(1)})`;
    }

    /**
     * Obtener iniciales del nombre
     */
    getInitials(fullName: string): string {
        return fullName
            .split(" ")
            .map((n) => n.charAt(0))
            .join("")
            .substring(0, 2)
            .toUpperCase();
    }
}

export const specialistsService = new SpecialistsService();