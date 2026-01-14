// src/lib/services/customers.ts
import { createBrowserSB } from "@/lib/supabase/client";
import type { Customer, Database } from "@/types";

type CustomerInsert = Database["public"]["Tables"]["customers"]["Insert"];
type CustomerUpdate = Database["public"]["Tables"]["customers"]["Update"];

export interface CreateCustomerData {
  tenant_id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  phone_country_code?: string | null;
  document_type?: string | null;
  document_number?: string | null;
  birth_date?: string | null;
  gender?: "male" | "female" | "other" | null;
  address?: string | null;
  city?: string | null;
  notes?: string | null;
  preferred_specialist_id?: string | null;
  tags?: string[];
  is_active?: boolean;
}

export interface UpdateCustomerData {
  first_name?: string;
  last_name?: string;
  email?: string | null;
  phone?: string | null;
  phone_country_code?: string | null;
  document_type?: string | null;
  document_number?: string | null;
  birth_date?: string | null;
  gender?: "male" | "female" | "other" | null;
  address?: string | null;
  city?: string | null;
  notes?: string | null;
  preferred_specialist_id?: string | null;
  tags?: string[];
  is_active?: boolean;
}

export interface CustomerFilters {
  search?: string;
  tag?: string;
  isActive?: boolean;
  hasEmail?: boolean;
  hasPhone?: boolean;
}

export interface CustomerStats {
  total: number;
  active: number;
  withEmail: number;
  withPhone: number;
  newThisMonth: number;
}

class CustomersService {
  private supabase = createBrowserSB();

  /**
   * Obtener todos los clientes de un tenant
   */
  async getCustomersByTenant(tenantId: string): Promise<Customer[]> {
    const { data, error } = await this.supabase
      .from("customers")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Obtener clientes activos de un tenant
   */
  async getActiveCustomers(tenantId: string): Promise<Customer[]> {
    const { data, error } = await this.supabase
      .from("customers")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("last_name", { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Buscar clientes por nombre, email o teléfono
   */
  async searchCustomers(tenantId: string, query: string): Promise<Customer[]> {
    const searchTerm = `%${query}%`;

    const { data, error } = await this.supabase
      .from("customers")
      .select("*")
      .eq("tenant_id", tenantId)
      .or(
        `first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`
      )
      .order("last_name", { ascending: true })
      .limit(20);

    if (error) throw error;
    return data || [];
  }

  /**
   * Obtener cliente por ID
   */
  async getCustomerById(customerId: string): Promise<Customer | null> {
    const { data, error } = await this.supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  }

  /**
   * Obtener cliente por email
   */
  async getCustomerByEmail(
    tenantId: string,
    email: string
  ): Promise<Customer | null> {
    const { data, error } = await this.supabase
      .from("customers")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("email", email.toLowerCase())
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  }

  /**
   * Obtener cliente por teléfono
   */
  async getCustomerByPhone(
    tenantId: string,
    phone: string
  ): Promise<Customer | null> {
    // Limpiar el teléfono de caracteres especiales
    const cleanPhone = phone.replace(/\D/g, "");

    const { data, error } = await this.supabase
      .from("customers")
      .select("*")
      .eq("tenant_id", tenantId)
      .ilike("phone", `%${cleanPhone}%`)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  }

  /**
   * Crear nuevo cliente
   */
  async createCustomer(data: CreateCustomerData): Promise<Customer> {
    // Verificar si ya existe un cliente con ese email
    if (data.email) {
      const existing = await this.getCustomerByEmail(
        data.tenant_id,
        data.email
      );
      if (existing) {
        throw new Error("Ya existe un cliente con ese correo electrónico");
      }
    }

    const insertData: CustomerInsert = {
      tenant_id: data.tenant_id,
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      full_name: `${data.first_name.trim()} ${data.last_name.trim()}`,
      email: data.email?.toLowerCase().trim() || null,
      phone: data.phone?.replace(/\D/g, "") || null,
      phone_country_code: data.phone_country_code || "+58",
      document_type: data.document_type || null,
      document_number: data.document_number || null,
      birth_date: data.birth_date || null,
      gender: data.gender || null,
      address: data.address || null,
      city: data.city || null,
      notes: data.notes || null,
      preferred_specialist_id: data.preferred_specialist_id || null,
      tags: data.tags || [],
      is_active: data.is_active ?? true,
    };

    const { data: customer, error } = await this.supabase
      .from("customers")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("Ya existe un cliente con esos datos");
      }
      throw error;
    }

    return customer;
  }

  /**
   * Actualizar cliente
   */
  async updateCustomer(
    customerId: string,
    data: UpdateCustomerData
  ): Promise<Customer> {
    const updateData: CustomerUpdate = {};

    if (data.first_name !== undefined) {
      updateData.first_name = data.first_name.trim();
    }
    if (data.last_name !== undefined) {
      updateData.last_name = data.last_name.trim();
    }
    if (data.email !== undefined) {
      updateData.email = data.email?.toLowerCase().trim() || null;
    }
    if (data.phone !== undefined) {
      updateData.phone = data.phone?.replace(/\D/g, "") || null;
    }
    if (data.phone_country_code !== undefined) {
      updateData.phone_country_code = data.phone_country_code;
    }
    if (data.document_type !== undefined) {
      updateData.document_type = data.document_type;
    }
    if (data.document_number !== undefined) {
      updateData.document_number = data.document_number;
    }
    if (data.birth_date !== undefined) {
      updateData.birth_date = data.birth_date;
    }
    if (data.gender !== undefined) {
      updateData.gender = data.gender;
    }
    if (data.address !== undefined) {
      updateData.address = data.address;
    }
    if (data.city !== undefined) {
      updateData.city = data.city;
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }
    if (data.preferred_specialist_id !== undefined) {
      updateData.preferred_specialist_id = data.preferred_specialist_id;
    }
    if (data.tags !== undefined) {
      updateData.tags = data.tags;
    }
    if (data.is_active !== undefined) {
      updateData.is_active = data.is_active;
    }

    const { data: customer, error } = await this.supabase
      .from("customers")
      .update(updateData)
      .eq("id", customerId)
      .select()
      .single();

    if (error) throw error;
    return customer;
  }

  /**
   * Desactivar cliente (soft delete)
   */
  async deactivateCustomer(customerId: string): Promise<void> {
    const { error } = await this.supabase
      .from("customers")
      .update({ is_active: false })
      .eq("id", customerId);

    if (error) throw error;
  }

  /**
   * Reactivar cliente
   */
  async reactivateCustomer(customerId: string): Promise<void> {
    const { error } = await this.supabase
      .from("customers")
      .update({ is_active: true })
      .eq("id", customerId);

    if (error) throw error;
  }

  /**
   * Eliminar cliente permanentemente
   */
  async deleteCustomer(customerId: string): Promise<void> {
    const { error } = await this.supabase
      .from("customers")
      .delete()
      .eq("id", customerId);

    if (error) throw error;
  }

  /**
   * Obtener clientes por tag
   */
  async getCustomersByTag(tenantId: string, tag: string): Promise<Customer[]> {
    const { data, error } = await this.supabase
      .from("customers")
      .select("*")
      .eq("tenant_id", tenantId)
      .contains("tags", [tag])
      .order("last_name", { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Agregar tag a cliente
   */
  async addTagToCustomer(customerId: string, tag: string): Promise<void> {
    const customer = await this.getCustomerById(customerId);
    if (!customer) throw new Error("Cliente no encontrado");

    const currentTags = customer.tags || [];
    if (currentTags.includes(tag)) return;

    const { error } = await this.supabase
      .from("customers")
      .update({ tags: [...currentTags, tag] })
      .eq("id", customerId);

    if (error) throw error;
  }

  /**
   * Remover tag de cliente
   */
  async removeTagFromCustomer(customerId: string, tag: string): Promise<void> {
    const customer = await this.getCustomerById(customerId);
    if (!customer) throw new Error("Cliente no encontrado");

    const currentTags = customer.tags || [];
    const newTags = currentTags.filter((t) => t !== tag);

    const { error } = await this.supabase
      .from("customers")
      .update({ tags: newTags })
      .eq("id", customerId);

    if (error) throw error;
  }

  /**
   * Obtener tags únicos de un tenant
   */
  async getUniqueTags(tenantId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from("customers")
      .select("tags")
      .eq("tenant_id", tenantId);

    if (error) throw error;

    const allTags = data?.flatMap((c) => c.tags || []) || [];
    const uniqueTags = [...new Set(allTags)].sort();
    return uniqueTags;
  }

  /**
   * Obtener estadísticas de clientes
   */
  async getCustomerStats(tenantId: string): Promise<CustomerStats> {
    const { data, error } = await this.supabase
      .from("customers")
      .select("is_active, email, phone, created_at")
      .eq("tenant_id", tenantId);

    if (error) throw error;

    const customers = data || [];
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      total: customers.length,
      active: customers.filter((c) => c.is_active).length,
      withEmail: customers.filter((c) => c.email).length,
      withPhone: customers.filter((c) => c.phone).length,
      newThisMonth: customers.filter(
        (c) => c.created_at ? new Date(c.created_at) >= startOfMonth : false
      ).length,
    };
  }

  /**
   * Obtener clientes con cumpleaños en un rango de fechas
   */
  async getCustomersWithBirthday(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Customer[]> {
    // Extraer mes y día para comparar
    const startMonth = startDate.getMonth() + 1;
    const startDay = startDate.getDate();
    const endMonth = endDate.getMonth() + 1;
    const endDay = endDate.getDate();

    const { data, error } = await this.supabase
      .from("customers")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .not("birth_date", "is", null);

    if (error) throw error;

    // Filtrar en el cliente por mes y día
    const filtered = (data || []).filter((customer) => {
      if (!customer.birth_date) return false;
      const birthDate = new Date(customer.birth_date);
      const month = birthDate.getMonth() + 1;
      const day = birthDate.getDate();

      // Caso simple: mismo mes
      if (startMonth === endMonth) {
        return month === startMonth && day >= startDay && day <= endDay;
      }

      // Caso cruzando meses
      return (
        (month === startMonth && day >= startDay) ||
        (month === endMonth && day <= endDay) ||
        (month > startMonth && month < endMonth)
      );
    });

    return filtered;
  }

  /**
   * Obtener nombre completo formateado
   */
  formatFullName(customer: Customer): string {
    return `${customer.first_name} ${customer.last_name}`.trim();
  }

  /**
   * Formatear teléfono con código de país
   */
  formatPhone(customer: Customer): string {
    if (!customer.phone) return "";
    const code = customer.phone_country_code || "+58";
    return `${code} ${customer.phone}`;
  }
}

export const customersService = new CustomersService();