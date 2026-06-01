// src/lib/services/client-services.ts
// Cliente HTTP para el catalogo de servicios y agendamiento de la app cliente.
import type { ServiceCategory } from "@/types";

export interface ClientServiceListItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: ServiceCategory | null;
  duration_minutes: number;
  base_price: number;
  currency_code: string | null;
  image_url: string | null;
  is_featured: boolean | null;
  requires_specialist: boolean | null;
}

export interface ClientServiceDetail extends ClientServiceListItem {
  buffer_minutes: number | null;
  gallery_urls: string[] | null;
  has_variants: boolean | null;
}

export interface ClientServiceBranch {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  timezone: string | null;
}

export interface ClientServiceDetailResponse {
  service: ClientServiceDetail;
  default_branch_id: string | null;
  branches: ClientServiceBranch[];
}

export interface ClientServiceSpecialist {
  specialist_id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  rating: number;
  total_ratings: number;
  custom_price: number | null;
  custom_duration: number | null;
}

export interface ClientSlotSpecialist {
  specialist_id: string;
  specialist_name: string;
  specialist_avatar_url: string | null;
  specialist_rating: number;
  specialist_total_ratings: number;
}

export interface ClientAvailabilitySlot {
  slot_start: string;
  slot_end: string;
  best: ClientSlotSpecialist;
  available_specialists: ClientSlotSpecialist[];
}

export interface ClientAvailabilityResponse {
  slots: ClientAvailabilitySlot[];
  raw_count: number;
}

export interface CreateAppointmentPayload {
  service_id: string;
  branch_id: string;
  scheduled_at: string;
  specialist_id?: string | null;
  customer_notes?: string | null;
}

class ClientServicesService {
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

  async listServices(
    tenantSlug: string,
    options: { search?: string; category?: string } = {},
  ): Promise<{
    services: ClientServiceListItem[];
    grouped: Record<string, ClientServiceListItem[]>;
  }> {
    const params = new URLSearchParams();
    if (options.search) params.set("search", options.search);
    if (options.category) params.set("category", options.category);

    const res = await fetch(
      this.withTenant("/api/client/services", tenantSlug, params),
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Error al cargar servicios");
    return data;
  }

  async getService(
    tenantSlug: string,
    serviceId: string,
  ): Promise<ClientServiceDetailResponse> {
    const res = await fetch(
      this.withTenant(`/api/client/services/${serviceId}`, tenantSlug),
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Error al cargar servicio");
    return data as ClientServiceDetailResponse;
  }

  async getSpecialists(
    tenantSlug: string,
    serviceId: string,
    branchId: string,
  ): Promise<ClientServiceSpecialist[]> {
    const params = new URLSearchParams({ branch_id: branchId });
    const res = await fetch(
      this.withTenant(
        `/api/client/services/${serviceId}/specialists`,
        tenantSlug,
        params,
      ),
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Error al cargar especialistas");
    return data.specialists ?? [];
  }

  async getAvailability(
    tenantSlug: string,
    serviceId: string,
    branchId: string,
    date: string,
    specialistId?: string | null,
  ): Promise<ClientAvailabilityResponse> {
    const params = new URLSearchParams({
      branch_id: branchId,
      date,
    });
    if (specialistId) params.set("specialist_id", specialistId);

    const res = await fetch(
      this.withTenant(
        `/api/client/services/${serviceId}/availability`,
        tenantSlug,
        params,
      ),
    );
    const data = await res.json();
    if (!res.ok)
      throw new Error(data.error ?? "Error al cargar disponibilidad");
    return data as ClientAvailabilityResponse;
  }

  async createAppointment(
    tenantSlug: string,
    payload: CreateAppointmentPayload,
  ) {
    const res = await fetch(
      this.withTenant("/api/client/appointments", tenantSlug),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "No se pudo crear la cita");
    return data.appointment;
  }
}

export const clientServicesService = new ClientServicesService();
