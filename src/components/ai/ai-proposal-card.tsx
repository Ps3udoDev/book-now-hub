"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { campaignsService } from "@/lib/services/campaigns";
import type { GroundedProposal } from "@/types";

interface Props {
  tenantId: string;
  proposal: GroundedProposal;
  onDismiss: () => void;
}

export function AiProposalCard({ tenantId, proposal, onDismiss }: Props) {
  const [message, setMessage] = useState(proposal.message_template);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);

  async function createCampaign() {
    setCreating(true);
    try {
      await campaignsService.create({
        tenant_id: tenantId,
        name: proposal.title,
        description: proposal.rationale,
        campaign_type: proposal.campaign_type,
        channel: proposal.channel,
        rules_snapshot: proposal.rules,
        message_template: message,
      });
      setCreated(true);
      toast.success("Campaña creada como borrador");
    } catch (e) {
      toast.error((e as Error).message || "No se pudo crear la campaña");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{proposal.title}</h3>
          <p className="text-sm text-muted-foreground">{proposal.rationale}</p>
        </div>
        <Badge variant="secondary">{proposal.realCount} clientes</Badge>
      </div>

      {proposal.sample.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Ej: {proposal.sample.map((s) => s.full_name).join(", ")}
        </p>
      )}

      <Textarea
        className="mt-3"
        rows={4}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <div className="mt-3 flex gap-2">
        <Button onClick={createCampaign} disabled={creating || created}>
          {created ? "Campaña creada" : creating ? "Creando…" : "Crear campaña"}
        </Button>
        <Button variant="ghost" onClick={onDismiss}>
          Descartar
        </Button>
      </div>
    </div>
  );
}
