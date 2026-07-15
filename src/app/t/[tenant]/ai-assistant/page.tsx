"use client";

import { Sparkles } from "lucide-react";
import { AiProposalCard } from "@/components/ai/ai-proposal-card";
import { Button } from "@/components/ui/button";
import { useAiCampaignSuggestions } from "@/hooks/supabase/use-ai-campaigns";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function AiAssistantPage() {
  const { tenant } = useAuthStore();
  const tenantId = tenant?.id ?? null;
  const { proposals, isLoading, error, hasRun, generate, dismiss } =
    useAiCampaignSuggestions(tenantId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Sparkles className="h-6 w-6 text-primary" /> Asistente IA
          </h1>
          <p className="text-muted-foreground">
            Sugerencias de campañas basadas en el comportamiento de tus
            clientes.
          </p>
        </div>
        <Button onClick={generate} disabled={isLoading || !tenantId}>
          {isLoading ? "Generando…" : "Generar sugerencias"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {hasRun && !isLoading && proposals.length === 0 && !error && (
        <p className="text-muted-foreground">
          No hay segmentos accionables ahora mismo. Vuelve a intentarlo más
          tarde.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {proposals.map((p) => (
          <AiProposalCard
            key={p._key}
            tenantId={tenantId as string}
            proposal={p}
            onDismiss={() => dismiss(p._key)}
          />
        ))}
      </div>
    </div>
  );
}
