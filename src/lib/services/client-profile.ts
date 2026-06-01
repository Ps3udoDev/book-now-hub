// src/lib/services/client-profile.ts
// Cliente HTTP que consume las rutas /api/client/* desde el frontend.
// Patron 3 capas: este service es consumido por los hooks SWR.
import type {
  Customer,
  CustomerDashboard,
  CustomerFavorite,
  FavoriteEntityType,
} from "@/types";

export interface ClientProfileResponse {
  customer: Customer;
  user: { id: string; email: string | null };
  tenant: { id: string; slug: string; name: string };
}

export interface UpdateProfilePayload {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string | null;
  phone_country_code?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  address?: string | null;
  city?: string | null;
  preferred_language?: string | null;
  preferred_currency?: string | null;
  preferred_branch_id?: string | null;
  preferred_specialist_id?: string | null;
  marketing_consent?: boolean;
}

export interface ClientHistoryAppointment {
  id: string;
  scheduled_at: string;
  ends_at: string | null;
  duration_minutes: number;
  status: string;
  estimated_price: number | null;
  currency_code: string | null;
  customer_notes: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  service_id: string;
  services: {
    id: string;
    name: string;
    category: string | null;
    image_url: string | null;
  } | null;
  specialist_id: string | null;
  profiles: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  branch_id: string;
  branches: { id: string; name: string } | null;
  paid_amount: number | null;
  paid_currency: string | null;
  paid_at: string | null;
}

export interface ClientHistoryDetail extends ClientHistoryAppointment {
  rating: {
    score: number;
    comment: string | null;
    created_at: string;
  } | null;
  appointment_services: Array<{
    id: string;
    service_id: string;
    service_variant_id: string | null;
    specialist_id: string | null;
    price: number | null;
    duration_minutes: number | null;
    services: {
      id: string;
      name: string;
      category: string | null;
      image_url: string | null;
    } | null;
    service_variants: {
      id: string;
      name: string;
    } | null;
    profiles: {
      id: string;
      full_name: string;
      avatar_url: string | null;
    } | null;
  }>;
  payments: Array<{
    id: string;
    payment_method: string | null;
    amount: number;
    currency_code: string | null;
    paid_at: string | null;
    reference_number: string | null;
  }>;
}

export interface ClientHistoryResponse {
  appointments: ClientHistoryAppointment[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export interface ClientHistoryFilters {
  page?: number;
  pageSize?: number;
  status?: string;
  fromDate?: string;
  toDate?: string;
  serviceId?: string;
  specialistId?: string;
}

export interface ClientFavoriteWithEntity extends CustomerFavorite {
  entity: unknown;
}

class ClientProfileService {
  private withTenant(
    path: string,
    tenantSlug: string,
    extra?: URLSearchParams,
  ) {
    const params = new URLSearchParams({ tenant: tenantSlug });
    if (extra) {
      extra.forEach((value, key) => {
        params.set(key, value);
      });
    }
    return `${path}?${params.toString()}`;
  }

  async getProfile(tenantSlug: string): Promise<ClientProfileResponse> {
    const res = await fetch(this.withTenant("/api/client/profile", tenantSlug));
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Error al cargar perfil");
    return data as ClientProfileResponse;
  }

  async updateProfile(
    tenantSlug: string,
    payload: UpdateProfilePayload,
  ): Promise<Customer> {
    const res = await fetch(
      this.withTenant("/api/client/profile", tenantSlug),
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Error al actualizar perfil");
    return data.customer as Customer;
  }

  async uploadAvatar(tenantSlug: string, file: File): Promise<Customer> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(
      this.withTenant("/api/client/profile/avatar", tenantSlug),
      { method: "POST", body: formData },
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Error al subir avatar");
    return data.customer as Customer;
  }

  async getDashboard(
    tenantSlug: string,
  ): Promise<{ dashboard: CustomerDashboard | null; favorites_count: number }> {
    const res = await fetch(
      this.withTenant("/api/client/dashboard", tenantSlug),
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Error al cargar dashboard");
    return data;
  }

  async getHistory(
    tenantSlug: string,
    filters: ClientHistoryFilters = {},
  ): Promise<ClientHistoryResponse> {
    const params = new URLSearchParams();
    if (filters.page) params.set("page", String(filters.page));
    if (filters.pageSize) params.set("page_size", String(filters.pageSize));
    if (filters.status) params.set("status", filters.status);
    if (filters.fromDate) params.set("from", filters.fromDate);
    if (filters.toDate) params.set("to", filters.toDate);
    if (filters.serviceId) params.set("service_id", filters.serviceId);
    if (filters.specialistId) params.set("specialist_id", filters.specialistId);

    const res = await fetch(
      this.withTenant("/api/client/history", tenantSlug, params),
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Error al cargar historial");
    return data as ClientHistoryResponse;
  }

  async getHistoryDetail(
    tenantSlug: string,
    appointmentId: string,
  ): Promise<{ appointment: ClientHistoryDetail }> {
    const res = await fetch(
      this.withTenant(`/api/client/history/${appointmentId}`, tenantSlug),
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Error al cargar la cita");
    return data as { appointment: ClientHistoryDetail };
  }

  async getFavorites(
    tenantSlug: string,
  ): Promise<{ favorites: ClientFavoriteWithEntity[] }> {
    const res = await fetch(
      this.withTenant("/api/client/favorites", tenantSlug),
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Error al cargar favoritos");
    return data;
  }

  async addFavorite(
    tenantSlug: string,
    entityType: FavoriteEntityType,
    entityId: string,
  ): Promise<CustomerFavorite> {
    const res = await fetch(
      this.withTenant("/api/client/favorites", tenantSlug),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity_type: entityType, entity_id: entityId }),
      },
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Error al agregar favorito");
    return data.favorite as CustomerFavorite;
  }

  async removeFavorite(tenantSlug: string, favoriteId: string): Promise<void> {
    const res = await fetch(
      this.withTenant(`/api/client/favorites/${favoriteId}`, tenantSlug),
      { method: "DELETE" },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Error al eliminar favorito");
    }
  }
}

export const clientProfileService = new ClientProfileService();
