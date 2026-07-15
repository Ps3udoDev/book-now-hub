// src/lib/services/segments.ts
import { createBrowserSB } from "@/lib/supabase/client";
import type { Customer, CustomerSegment, SegmentRules } from "@/types";

export interface CreateSegmentData {
  tenant_id: string;
  name: string;
  description?: string | null;
  rules: SegmentRules;
  is_active?: boolean;
}

export interface UpdateSegmentData {
  name?: string;
  description?: string | null;
  rules?: SegmentRules;
  is_active?: boolean;
}

export interface SegmentPreviewResult {
  count: number;
  sample: Customer[];
}

async function parseJson<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (json as { error?: string }).error || "Error en la solicitud",
    );
  }
  return json as T;
}

class SegmentsService {
  private supabase = createBrowserSB();

  /** Lista los segmentos de un tenant (lectura cliente). */
  async list(tenantId: string): Promise<CustomerSegment[]> {
    const { data, error } = await this.supabase
      .from("customer_segments")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  /** Obtiene un segmento por id. */
  async get(id: string): Promise<CustomerSegment | null> {
    const { data, error } = await this.supabase
      .from("customer_segments")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  }

  /** Crea un segmento (escritura vía API route). */
  async create(payload: CreateSegmentData): Promise<CustomerSegment> {
    const res = await fetch("/api/segments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const { segment } = await parseJson<{ segment: CustomerSegment }>(res);
    return segment;
  }

  /** Actualiza un segmento. */
  async update(
    id: string,
    payload: UpdateSegmentData,
  ): Promise<CustomerSegment> {
    const res = await fetch(`/api/segments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const { segment } = await parseJson<{ segment: CustomerSegment }>(res);
    return segment;
  }

  /** Elimina un segmento. */
  async remove(id: string): Promise<void> {
    const res = await fetch(`/api/segments/${id}`, { method: "DELETE" });
    await parseJson<{ ok: boolean }>(res);
  }

  /** Preview en vivo: conteo real + muestra. */
  async preview(
    tenantId: string,
    rules: SegmentRules,
  ): Promise<SegmentPreviewResult> {
    const res = await fetch("/api/segments/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, rules }),
    });
    return parseJson<SegmentPreviewResult>(res);
  }
}

export const segmentsService = new SegmentsService();
