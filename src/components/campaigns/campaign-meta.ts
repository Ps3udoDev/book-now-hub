// src/components/campaigns/campaign-meta.ts
// Etiquetas y estilos compartidos para tipos/estados de campaña.
import type { CampaignStatus, CampaignType, RecipientStatus } from "@/types";

export const CAMPAIGN_TYPE_LABELS: Record<CampaignType, string> = {
  reactivation: "Reactivación",
  last_minute: "Última hora",
  transformation: "Transformación",
  birthday: "Cumpleaños",
  custom: "Personalizada",
};

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Borrador",
  ready: "Lista",
  queued: "En cola",
  sent: "Enviada",
  cancelled: "Cancelada",
};

export const CAMPAIGN_STATUS_STYLES: Record<CampaignStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  ready: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  queued:
    "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  sent: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

export const RECIPIENT_STATUS_LABELS: Record<RecipientStatus, string> = {
  queued: "En cola",
  sent: "Enviado",
  failed: "Fallido",
  skipped: "Omitido",
};

export const RECIPIENT_STATUS_STYLES: Record<RecipientStatus, string> = {
  queued:
    "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  sent: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  skipped: "bg-muted text-muted-foreground",
};
