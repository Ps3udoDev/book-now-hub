"use client";

import {
  ExternalLink,
  Loader2,
  Printer,
  QrCode,
  RefreshCcw,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useActiveBranches } from "@/hooks/supabase/use-branches";
import { useCafeteriaQrWorkstations } from "@/hooks/supabase/use-cafeteria-qr";
import { workstationsService } from "@/lib/services/workstations";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
  buildPublicCafeteriaQrPath,
  slugifyWorkstationQr,
} from "@/lib/utils/cafeteria-qr";

export default function CafeteriaSettingsPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const { tenant } = useAuthStore();
  const { branches } = useActiveBranches(tenant?.id ?? null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [slugDrafts, setSlugDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedBranchId && branches[0]?.id) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  const { workstations, isLoading, mutate } = useCafeteriaQrWorkstations(
    tenant?.id ?? null,
    selectedBranchId,
  );

  useEffect(() => {
    setSlugDrafts((current) => {
      const next = { ...current };
      for (const workstation of workstations) {
        if (!(workstation.id in next)) {
          next[workstation.id] = workstation.cafeteria_qr_slug || "";
        }
      }
      return next;
    });
  }, [workstations]);

  const activeCount = useMemo(
    () =>
      workstations.filter((workstation) => workstation.cafeteria_qr_enabled)
        .length,
    [workstations],
  );

  async function updateQr(
    workstationId: string,
    enabled: boolean,
    draftSlug?: string,
  ) {
    setSavingId(workstationId);
    try {
      await workstationsService.updateCafeteriaQr(workstationId, {
        enabled,
        slug: draftSlug ? slugifyWorkstationQr(draftSlug) : null,
      });
      await mutate();
      toast.success(enabled ? "QR activado" : "QR desactivado");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo actualizar el QR",
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings Cafetería</h1>
          <p className="text-muted-foreground">
            Configura los QR públicos por estación para acceso rápido al menú.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={selectedBranchId ?? undefined}
            onValueChange={setSelectedBranchId}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Selecciona sucursal" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => mutate()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Estaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {workstations.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              QR activos
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {activeCount}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Cobertura
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {workstations.length > 0
              ? `${Math.round((activeCount / workstations.length) * 100)}%`
              : "0%"}
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {workstations.map((workstation) => {
            const draft = slugDrafts[workstation.id] ?? "";
            const qrPath = workstation.cafeteria_qr_slug
              ? buildPublicCafeteriaQrPath(
                  tenantSlug,
                  workstation.cafeteria_qr_slug,
                )
              : null;

            return (
              <Card key={workstation.id}>
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">
                        {workstation.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {workstation.code || "Sin código"} ·{" "}
                        {workstation.current_specialist_name ||
                          "Sin especialista inferido"}
                      </p>
                    </div>
                    <Badge
                      variant={
                        workstation.cafeteria_qr_enabled
                          ? "default"
                          : "secondary"
                      }
                    >
                      {workstation.cafeteria_qr_enabled
                        ? "QR activo"
                        : "QR inactivo"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-2xl border p-4">
                    <div>
                      <p className="font-medium">Habilitar acceso QR</p>
                      <p className="text-sm text-muted-foreground">
                        Activa un enlace público directo al menú desde esta
                        estación.
                      </p>
                    </div>
                    <Switch
                      checked={workstation.cafeteria_qr_enabled}
                      disabled={savingId === workstation.id}
                      onCheckedChange={(checked) =>
                        updateQr(workstation.id, checked, draft)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`qr-slug-${workstation.id}`}>
                      Slug público
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id={`qr-slug-${workstation.id}`}
                        value={draft}
                        onChange={(event) =>
                          setSlugDrafts((current) => ({
                            ...current,
                            [workstation.id]: slugifyWorkstationQr(
                              event.target.value,
                            ),
                          }))
                        }
                        placeholder={slugifyWorkstationQr(workstation.name)}
                      />
                      <Button
                        variant="outline"
                        disabled={savingId === workstation.id}
                        onClick={() => updateQr(workstation.id, true, draft)}
                      >
                        Guardar
                      </Button>
                    </div>
                    {qrPath ? (
                      <p className="text-xs text-muted-foreground">{qrPath}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      asChild
                      variant="outline"
                      disabled={!workstation.cafeteria_qr_enabled}
                    >
                      <Link
                        href={`/t/${tenantSlug}/cafeteria/stations/${workstation.id}`}
                      >
                        <QrCode className="mr-2 h-4 w-4" />
                        Ver QR
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      disabled={!workstation.cafeteria_qr_enabled}
                    >
                      <Link
                        href={`/t/${tenantSlug}/cafeteria/stations/${workstation.id}?print=1`}
                      >
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir
                      </Link>
                    </Button>
                    {qrPath ? (
                      <Button asChild variant="ghost">
                        <Link href={qrPath} target="_blank">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Abrir público
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
