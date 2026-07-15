// src/hooks/supabase/use-ai-campaigns.ts
import { useState } from "react";
import { aiCampaignsService } from "@/lib/services/ai-campaigns";
import type { GroundedProposal } from "@/types";

/** Propuesta con clave estable para evitar remounts al descartar hermanas. */
type KeyedProposal = GroundedProposal & { _key: string };

/** Genera propuestas de campaña bajo demanda (no SWR: es una acción). */
export function useAiCampaignSuggestions(tenantId: string | null) {
  const [proposals, setProposals] = useState<KeyedProposal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  async function generate() {
    if (!tenantId) return;
    setIsLoading(true);
    setError(null);
    try {
      const list = await aiCampaignsService.suggest(tenantId);
      setProposals(list.map((p) => ({ ...p, _key: crypto.randomUUID() })));
      setHasRun(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  function dismiss(key: string) {
    setProposals((prev) => prev.filter((p) => p._key !== key));
  }

  return { proposals, isLoading, error, hasRun, generate, dismiss };
}
