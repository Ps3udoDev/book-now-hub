"use client";

import { ArrowLeft, Loader2, Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUS_STYLES,
  CAMPAIGN_TYPE_LABELS,
} from "@/components/campaigns/campaign-meta";
import { RecipientsTable } from "@/components/campaigns/recipients-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useCampaign,
  useCampaignRecipients,
} from "@/hooks/supabase/use-campaigns";
import { campaignsService } from "@/lib/services/campaigns";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { CampaignStatus, CampaignType } from "@/types";

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = params.id as string;
  const { tenant } = useAuthStore();
  const basePath = `/t/${tenant?.slug ?? ""}`;

  const { campaign, recipientCounts, isLoading, mutate } =
    useCampaign(campaignId);
  const { recipients, mutate: mutateRecipients } =
    useCampaignRecipients(campaignId);

  const [working, setWorking] = useState(false);

  const refresh = () => {
    mutate();
    mutateRecipients();
  };

  const handleMaterialize = async () => {
    setWorking(true);
    try {
      await campaignsService.materialize(campaignId);
      toast.success("Destinatarios materializados");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setWorking(false);
    }
  };

  const handleSend = async () => {
    setWorking(true);
    try {
      await campaignsService.send(campaignId);
      toast.success("Campaña enviada");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setWorking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        Campaña no encontrada.
      </div>
    );
  }

  const status = campaign.status as CampaignStatus;
  const type = campaign.campaign_type as CampaignType;
  const total = recipients.length;
  const canSend =
    (status === "ready" || status === "queued") && recipientCounts.queued > 0;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`${basePath}/campaigns`}>
          <Button variant="ghost" size="sm" className="-ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a campañas
          </Button>
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{campaign.name}</h1>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${CAMPAIGN_STATUS_STYLES[status] ?? ""}`}
              >
                {CAMPAIGN_STATUS_LABELS[status] ?? status}
              </span>
            </div>
            <p className="text-muted-foreground">
              {CAMPAIGN_TYPE_LABELS[type] ?? type}
              {campaign.description ? ` · ${campaign.description}` : ""}
            </p>
          </div>

          <div className="flex gap-2">
            {status !== "sent" && (
              <Button
                variant="outline"
                onClick={handleMaterialize}
                disabled={working}
              >
                {working ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {total > 0 ? "Re-materializar" : "Materializar"}
              </Button>
            )}

            {status !== "sent" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={working || !canSend}>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Enviar campaña</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se marcarán {recipientCounts.queued} destinatarios como
                      enviados. El envío real por WhatsApp aún no está conectado
                      (esta acción es una simulación).
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSend}>
                      Enviar ahora
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total", value: total },
          { label: "En cola", value: recipientCounts.queued },
          { label: "Enviados", value: recipientCounts.sent },
          { label: "Fallidos", value: recipientCounts.failed },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold tabular-nums">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Destinatarios */}
      <Card>
        <CardHeader>
          <CardTitle>Destinatarios</CardTitle>
        </CardHeader>
        <CardContent>
          <RecipientsTable recipients={recipients} />
        </CardContent>
      </Card>
    </div>
  );
}
