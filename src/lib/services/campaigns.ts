// src/lib/services/campaigns.ts
import { createBrowserSB } from "@/lib/supabase/client";
import type {
  Campaign,
  CampaignRecipient,
  CampaignType,
  Customer,
  RecipientStatus,
  SegmentRules,
} from "@/types";

export interface CreateCampaignData {
  tenant_id: string;
  name: string;
  description?: string | null;
  campaign_type?: CampaignType;
  channel?: string;
  segment_id?: string | null;
  rules_snapshot?: SegmentRules | null;
  message_template: string;
}

export interface UpdateCampaignData {
  name?: string;
  description?: string | null;
  campaign_type?: CampaignType;
  channel?: string;
  segment_id?: string | null;
  rules_snapshot?: SegmentRules | null;
  message_template?: string;
}

export type RecipientWithCustomer = CampaignRecipient & {
  customer: Pick<
    Customer,
    "id" | "first_name" | "last_name" | "full_name" | "phone" | "email"
  > | null;
};

export interface CampaignDetail {
  campaign: Campaign;
  recipientCounts: Record<RecipientStatus, number>;
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

class CampaignsService {
  private supabase = createBrowserSB();

  /** Lista las campañas de un tenant. */
  async list(tenantId: string): Promise<Campaign[]> {
    const { data, error } = await this.supabase
      .from("campaigns")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  /** Obtiene una campaña + conteo de destinatarios por status. */
  async get(id: string): Promise<CampaignDetail | null> {
    const { data: campaign, error } = await this.supabase
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    const { data: recipients, error: rErr } = await this.supabase
      .from("campaign_recipients")
      .select("status")
      .eq("campaign_id", id);
    if (rErr) throw rErr;

    const recipientCounts: Record<RecipientStatus, number> = {
      queued: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    };
    for (const r of recipients ?? []) {
      const s = r.status as RecipientStatus;
      if (s in recipientCounts) recipientCounts[s] += 1;
    }

    return { campaign, recipientCounts };
  }

  /** Lista los destinatarios de una campaña (con datos del cliente). */
  async getRecipients(campaignId: string): Promise<RecipientWithCustomer[]> {
    const { data, error } = await this.supabase
      .from("campaign_recipients")
      .select(
        "*, customer:customers(id, first_name, last_name, full_name, phone, email)",
      )
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data || []) as unknown as RecipientWithCustomer[];
  }

  async create(payload: CreateCampaignData): Promise<Campaign> {
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const { campaign } = await parseJson<{ campaign: Campaign }>(res);
    return campaign;
  }

  async update(id: string, payload: UpdateCampaignData): Promise<Campaign> {
    const res = await fetch(`/api/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const { campaign } = await parseJson<{ campaign: Campaign }>(res);
    return campaign;
  }

  async remove(id: string): Promise<void> {
    const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    await parseJson<{ ok: boolean }>(res);
  }

  /** Materializa destinatarios reales (inserta campaign_recipients). */
  async materialize(id: string): Promise<Campaign> {
    const res = await fetch(`/api/campaigns/${id}/materialize`, {
      method: "POST",
    });
    const { campaign } = await parseJson<{ campaign: Campaign }>(res);
    return campaign;
  }

  /** Envía la campaña (stub: marca recipients como sent). */
  async send(id: string): Promise<Campaign> {
    const res = await fetch(`/api/campaigns/${id}/send`, { method: "POST" });
    const { campaign } = await parseJson<{ campaign: Campaign }>(res);
    return campaign;
  }
}

export const campaignsService = new CampaignsService();
