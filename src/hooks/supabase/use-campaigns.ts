// src/hooks/supabase/use-campaigns.ts
import useSWR from "swr";
import {
  type CampaignDetail,
  campaignsService,
  type RecipientWithCustomer,
} from "@/lib/services/campaigns";
import type { Campaign } from "@/types";

/** Lista de campañas del tenant. */
export function useCampaigns(tenantId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Campaign[]>(
    tenantId ? `campaigns:${tenantId}` : null,
    () => (tenantId ? campaignsService.list(tenantId) : []),
    { revalidateOnFocus: false, dedupingInterval: 30000 },
  );

  return {
    campaigns: data || [],
    isLoading,
    error: error?.message || null,
    mutate,
  };
}

/** Detalle de una campaña (con conteo de destinatarios por status). */
export function useCampaign(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<CampaignDetail | null>(
    id ? `campaign:${id}` : null,
    () => (id ? campaignsService.get(id) : null),
    { revalidateOnFocus: false },
  );

  return {
    campaign: data?.campaign || null,
    recipientCounts: data?.recipientCounts || {
      queued: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    },
    isLoading,
    error: error?.message || null,
    mutate,
  };
}

/** Destinatarios de una campaña. */
export function useCampaignRecipients(campaignId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<RecipientWithCustomer[]>(
    campaignId ? `campaign-recipients:${campaignId}` : null,
    () => (campaignId ? campaignsService.getRecipients(campaignId) : []),
    { revalidateOnFocus: false },
  );

  return {
    recipients: data || [],
    isLoading,
    error: error?.message || null,
    mutate,
  };
}
