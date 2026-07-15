// src/lib/services/ai-campaigns.ts
import type { GroundedProposal } from "@/types";

async function parseJson<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(
      (json as { error?: string }).error || "Error en la solicitud",
    );
  return json as T;
}

class AiCampaignsService {
  /** Pide propuestas de campaña al backend (IA + grounding). */
  async suggest(tenantId: string): Promise<GroundedProposal[]> {
    const res = await fetch("/api/ai/campaign-suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId }),
    });
    const { proposals } = await parseJson<{ proposals: GroundedProposal[] }>(
      res,
    );
    return proposals;
  }
}

export const aiCampaignsService = new AiCampaignsService();
