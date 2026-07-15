"use client";

import { Loader2, Megaphone, Plus, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { CampaignCard } from "@/components/campaigns/campaign-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCampaigns } from "@/hooks/supabase/use-campaigns";
import { useSegments } from "@/hooks/supabase/use-segments";
import { segmentsService } from "@/lib/services/segments";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { SegmentRules } from "@/types";

export default function CampaignsPage() {
  const { tenant } = useAuthStore();
  const tenantId = tenant?.id ?? null;
  const basePath = `/t/${tenant?.slug ?? ""}`;

  const { campaigns, isLoading } = useCampaigns(tenantId);
  const {
    segments,
    isLoading: loadingSegments,
    mutate: mutateSegments,
  } = useSegments(tenantId);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteSegment = async (id: string) => {
    setDeletingId(id);
    try {
      await segmentsService.remove(id);
      toast.success("Segmento eliminado");
      mutateSegments();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campañas</h1>
          <p className="text-muted-foreground">
            Segmenta tu base de clientes y lanza campañas de mensajería.
          </p>
        </div>
        <Link href={`${basePath}/campaigns/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva campaña
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">Campañas</TabsTrigger>
          <TabsTrigger value="segments">Segmentos</TabsTrigger>
        </TabsList>

        {/* Campañas */}
        <TabsContent value="campaigns" className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : campaigns.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <Megaphone className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  Aún no has creado campañas.
                </p>
                <Link href={`${basePath}/campaigns/new`}>
                  <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Crear la primera
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  basePath={basePath}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Segmentos */}
        <TabsContent value="segments" className="mt-4">
          {loadingSegments ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : segments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <Users className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  No hay segmentos guardados. Puedes crear uno desde el
                  asistente de campañas.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {segments.map((segment) => {
                const rules = segment.rules as unknown as SegmentRules;
                return (
                  <Card key={segment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{segment.name}</p>
                          {segment.description && (
                            <p className="text-xs text-muted-foreground">
                              {segment.description}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSegment(segment.id)}
                          disabled={deletingId === segment.id}
                          aria-label="Eliminar segmento"
                        >
                          {deletingId === segment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {rules?.conditions?.length ?? 0} condiciones ·{" "}
                        {rules?.match === "any" ? "alguna" : "todas"}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
