// src/lib/services/services.ts
import { createBrowserSB } from "@/lib/supabase/client";
import type { Service, ServiceVariant, Database } from "@/types";

type ServiceInsert = Database["public"]["Tables"]["services"]["Insert"];
type ServiceUpdate = Database["public"]["Tables"]["services"]["Update"];
type VariantInsert = Database["public"]["Tables"]["service_variants"]["Insert"];
type VariantUpdate = Database["public"]["Tables"]["service_variants"]["Update"];

export interface CreateServiceData {
    tenant_id: string;
    name: string;
    slug?: string;
    description?: string | null;
    category: Database["public"]["Enums"]["service_category"];
    duration_minutes: number;
    buffer_minutes?: number;
    base_price: number;
    currency_code?: string;
    has_variants?: boolean;
    requires_specialist?: boolean;
    requires_station?: boolean;
    is_featured?: boolean;
    is_active?: boolean;
    image_url?: string | null;
}

export interface UpdateServiceData {
    name?: string;
    slug?: string;
    description?: string | null;
    category?: Database["public"]["Enums"]["service_category"];
    duration_minutes?: number;
    buffer_minutes?: number;
    base_price?: number;
    currency_code?: string;
    has_variants?: boolean;
    requires_specialist?: boolean;
    requires_station?: boolean;
    is_featured?: boolean;
    is_active?: boolean;
    image_url?: string | null;
    sort_order?: number;
}

export interface CreateVariantData {
    service_id: string;
    name: string;
    description?: string | null;
    duration_modifier: number;
    price_modifier: number;
    is_active?: boolean;
    sort_order?: number;
    tenant_id: string;
}

export interface UpdateVariantData {
    name?: string;
    description?: string | null;
    duration_modifier?: number;
    price_modifier?: number;
    is_active?: boolean;
    sort_order?: number;
}

export interface ServiceWithVariants extends Service {
    variants: ServiceVariant[];
}

class ServicesService {
    private supabase = createBrowserSB();

    // ============================================
    // SERVICIOS
    // ============================================

    /**
     * Obtener todos los servicios de un tenant
     */
    async getServicesByTenant(tenantId: string): Promise<Service[]> {
        const { data, error } = await this.supabase
            .from("services")
            .select("*")
            .eq("tenant_id", tenantId)
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true });

        if (error) throw error;
        return data || [];
    }

    /**
     * Obtener servicios activos de un tenant (para clientes)
     */
    async getActiveServices(tenantId: string): Promise<Service[]> {
        const { data, error } = await this.supabase
            .from("services")
            .select("*")
            .eq("tenant_id", tenantId)
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true });

        if (error) throw error;
        return data || [];
    }

    /**
     * Obtener servicios por categoría
     */
    async getServicesByCategory(
        tenantId: string,
        category: Database["public"]["Enums"]["service_category"]
    ): Promise<Service[]> {
        const { data, error } = await this.supabase
            .from("services")
            .select("*")
            .eq("tenant_id", tenantId)
            .eq("category", category)
            .eq("is_active", true)
            .order("sort_order", { ascending: true });

        if (error) throw error;
        return data || [];
    }

    /**
     * Obtener un servicio por ID con sus variantes
     */
    async getServiceById(serviceId: string): Promise<ServiceWithVariants | null> {
        const { data, error } = await this.supabase
            .from("services")
            .select(`
        *,
        variants:service_variants(*)
      `)
            .eq("id", serviceId)
            .single();

        if (error) {
            if (error.code === "PGRST116") return null;
            throw error;
        }

        return {
            ...data,
            variants: data.variants || [],
        };
    }

    /**
     * Obtener servicio por slug
     */
    async getServiceBySlug(
        tenantId: string,
        slug: string
    ): Promise<ServiceWithVariants | null> {
        const { data, error } = await this.supabase
            .from("services")
            .select(`
        *,
        variants:service_variants(*)
      `)
            .eq("tenant_id", tenantId)
            .eq("slug", slug)
            .single();

        if (error) {
            if (error.code === "PGRST116") return null;
            throw error;
        }

        return {
            ...data,
            variants: data.variants || [],
        };
    }

    /**
     * Crear nuevo servicio
     */
    async createService(data: CreateServiceData): Promise<Service> {
        // Generar slug si no se proporciona
        const slug =
            data.slug ||
            data.name
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");

        const insertData: ServiceInsert = {
            tenant_id: data.tenant_id,
            name: data.name,
            slug,
            description: data.description,
            category: data.category,
            duration_minutes: data.duration_minutes,
            buffer_minutes: data.buffer_minutes ?? 0,
            base_price: data.base_price,
            currency_code: data.currency_code ?? "USD",
            has_variants: data.has_variants ?? false,
            requires_specialist: data.requires_specialist ?? true,
            requires_station: data.requires_station ?? false,
            is_featured: data.is_featured ?? false,
            is_active: data.is_active ?? true,
            image_url: data.image_url,
        };

        const { data: service, error } = await this.supabase
            .from("services")
            .insert(insertData)
            .select()
            .single();

        if (error) {
            if (error.code === "23505") {
                throw new Error("Ya existe un servicio con ese nombre");
            }
            throw error;
        }

        return service;
    }

    /**
     * Actualizar servicio
     */
    async updateService(
        serviceId: string,
        data: UpdateServiceData
    ): Promise<Service> {
        const updateData: ServiceUpdate = { ...data };

        // Regenerar slug si se cambió el nombre
        if (data.name && !data.slug) {
            updateData.slug = data.name
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");
        }

        const { data: service, error } = await this.supabase
            .from("services")
            .update(updateData)
            .eq("id", serviceId)
            .select()
            .single();

        if (error) throw error;
        return service;
    }

    /**
     * Eliminar servicio (soft delete - desactivar)
     */
    async deleteService(serviceId: string): Promise<void> {
        const { error } = await this.supabase
            .from("services")
            .update({ is_active: false })
            .eq("id", serviceId);

        if (error) throw error;
    }

    /**
     * Eliminar servicio permanentemente
     */
    async hardDeleteService(serviceId: string): Promise<void> {
        const { error } = await this.supabase
            .from("services")
            .delete()
            .eq("id", serviceId);

        if (error) throw error;
    }

    /**
     * Duplicar servicio
     */
    async duplicateService(serviceId: string): Promise<Service> {
        const original = await this.getServiceById(serviceId);
        if (!original) throw new Error("Servicio no encontrado");

        const newService = await this.createService({
            tenant_id: original.tenant_id,
            name: `${original.name} (copia)`,
            description: original.description,
            category: original.category ?? "other",
            duration_minutes: original.duration_minutes,
            buffer_minutes: original.buffer_minutes ?? 0,
            base_price: original.base_price,
            currency_code: original.currency_code ?? "USD",
            has_variants: original.has_variants ?? false,
            requires_specialist: original.requires_specialist ?? true,
            requires_station: original.requires_station ?? false,
            is_featured: false,
            is_active: false,
            image_url: original.image_url,
        });

        // Duplicar variantes si las tiene
        if (original.variants.length > 0) {
            for (const variant of original.variants) {
                await this.createVariant({
                    service_id: newService.id,
                    name: variant.name,
                    description: variant.description,
                    duration_modifier: variant.duration_modifier ?? 0,
                    price_modifier: variant.price_modifier ?? 0,
                    is_active: variant.is_active ?? true,
                    sort_order: variant.sort_order ?? 0,
                    tenant_id: original.tenant_id,
                });
            }
        }

        return newService;
    }

    /**
     * Reordenar servicios
     */
    async reorderServices(
        serviceIds: { id: string; sort_order: number }[]
    ): Promise<void> {
        for (const item of serviceIds) {
            const { error } = await this.supabase
                .from("services")
                .update({ sort_order: item.sort_order })
                .eq("id", item.id);

            if (error) throw error;
        }
    }

    // ============================================
    // VARIANTES
    // ============================================

    /**
     * Obtener variantes de un servicio
     */
    async getVariantsByService(serviceId: string): Promise<ServiceVariant[]> {
        const { data, error } = await this.supabase
            .from("service_variants")
            .select("*")
            .eq("service_id", serviceId)
            .order("sort_order", { ascending: true });

        if (error) throw error;
        return data || [];
    }

    /**
     * Crear variante
     */
    async createVariant(data: CreateVariantData): Promise<ServiceVariant> {
        const insertData: VariantInsert = {
            service_id: data.service_id,
            name: data.name,
            description: data.description,
            duration_modifier: data.duration_modifier,
            price_modifier: data.price_modifier,
            is_active: data.is_active ?? true,
            sort_order: data.sort_order ?? 0,
            tenant_id: data.tenant_id,
        };

        const { data: variant, error } = await this.supabase
            .from("service_variants")
            .insert(insertData)
            .select()
            .single();

        if (error) throw error;

        // Marcar el servicio como que tiene variantes
        await this.supabase
            .from("services")
            .update({ has_variants: true })
            .eq("id", data.service_id);

        return variant;
    }

    /**
     * Actualizar variante
     */
    async updateVariant(
        variantId: string,
        data: UpdateVariantData
    ): Promise<ServiceVariant> {
        const { data: variant, error } = await this.supabase
            .from("service_variants")
            .update(data)
            .eq("id", variantId)
            .select()
            .single();

        if (error) throw error;
        return variant;
    }

    /**
     * Eliminar variante
     */
    async deleteVariant(variantId: string, serviceId: string): Promise<void> {
        const { error } = await this.supabase
            .from("service_variants")
            .delete()
            .eq("id", variantId);

        if (error) throw error;

        // Verificar si quedan variantes
        const remaining = await this.getVariantsByService(serviceId);
        if (remaining.length === 0) {
            await this.supabase
                .from("services")
                .update({ has_variants: false })
                .eq("id", serviceId);
        }
    }

    /**
     * Reordenar variantes
     */
    async reorderVariants(
        variantIds: { id: string; sort_order: number }[]
    ): Promise<void> {
        for (const item of variantIds) {
            const { error } = await this.supabase
                .from("service_variants")
                .update({ sort_order: item.sort_order })
                .eq("id", item.id);

            if (error) throw error;
        }
    }

    // ============================================
    // UTILIDADES
    // ============================================

    /**
     * Calcular precio final con variantes seleccionadas
     */
    calculateFinalPrice(
        basePrice: number,
        selectedVariants: ServiceVariant[]
    ): number {
        const modifierSum = selectedVariants.reduce(
            (sum, v) => sum + (v.price_modifier ?? 0),
            0
        );
        return basePrice + modifierSum;
    }

    /**
     * Calcular duración final con variantes seleccionadas
     */
    calculateFinalDuration(
        baseDuration: number,
        selectedVariants: ServiceVariant[]
    ): number {
        const modifierSum = selectedVariants.reduce(
            (sum, v) => sum + (v.duration_modifier ?? 0),
            0
        );
        return baseDuration + modifierSum;
    }

    /**
     * Obtener categorías únicas de un tenant
     */
    async getCategories(tenantId: string): Promise<Database["public"]["Enums"]["service_category"][]> {
        const { data, error } = await this.supabase
            .from("services")
            .select("category")
            .eq("tenant_id", tenantId)
            .eq("is_active", true);

        if (error) throw error;

        const categories = [...new Set(
            (data?.map((s) => s.category) || [])
                .filter((c): c is Database["public"]["Enums"]["service_category"] => c !== null)
        )];
        return categories;
    }

    /**
     * Contar servicios de un tenant
     */
    async countServices(tenantId: string): Promise<{
        total: number;
        active: number;
        featured: number;
    }> {
        const { data, error } = await this.supabase
            .from("services")
            .select("is_active, is_featured")
            .eq("tenant_id", tenantId);

        if (error) throw error;

        const services = data || [];
        return {
            total: services.length,
            active: services.filter((s) => s.is_active).length,
            featured: services.filter((s) => s.is_featured).length,
        };
    }
}

export const servicesService = new ServicesService();