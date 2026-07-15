"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CampaignWizard } from "@/components/campaigns/campaign-wizard";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function NuevaCampaignPage() {
  const { tenant } = useAuthStore();
  const tenantId = tenant?.id ?? null;
  const tenantSlug = tenant?.slug ?? "";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href={`/t/${tenantSlug}/campaigns`}>
          <Button variant="ghost" size="sm" className="-ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a campañas
          </Button>
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Nueva campaña</h1>
        <p className="text-muted-foreground">
          Elige un tipo, define el segmento, redacta el mensaje y materializa.
        </p>
      </div>

      {tenantId ? (
        <CampaignWizard tenantId={tenantId} tenantSlug={tenantSlug} />
      ) : null}
    </div>
  );
}
