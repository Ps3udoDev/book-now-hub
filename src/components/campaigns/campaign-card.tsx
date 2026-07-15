"use client";

import { Megaphone, Users } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import type {
  Campaign,
  CampaignStats,
  CampaignStatus,
  CampaignType,
} from "@/types";
import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUS_STYLES,
  CAMPAIGN_TYPE_LABELS,
} from "./campaign-meta";

interface CampaignCardProps {
  campaign: Campaign;
  basePath: string;
}

export function CampaignCard({ campaign, basePath }: CampaignCardProps) {
  const stats = (campaign.stats as CampaignStats) || {};
  const status = campaign.status as CampaignStatus;
  const type = campaign.campaign_type as CampaignType;

  return (
    <Link href={`${basePath}/campaigns/${campaign.id}`}>
      <Card className="transition-colors hover:bg-accent/50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Megaphone className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">{campaign.name}</p>
                <p className="text-xs text-muted-foreground">
                  {CAMPAIGN_TYPE_LABELS[type] ?? type}
                </p>
              </div>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${CAMPAIGN_STATUS_STYLES[status] ?? ""}`}
            >
              {CAMPAIGN_STATUS_LABELS[status] ?? status}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {stats.total ?? 0} destinatarios
            </span>
            {(stats.sent ?? 0) > 0 && (
              <span className="text-green-600 dark:text-green-400">
                {stats.sent} enviados
              </span>
            )}
            <span className="ml-auto">
              {campaign.created_at
                ? new Date(campaign.created_at).toLocaleDateString("es")
                : ""}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
