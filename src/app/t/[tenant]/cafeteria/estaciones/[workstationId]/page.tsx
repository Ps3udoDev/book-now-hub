"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Copy, ExternalLink, Loader2, Printer, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useWorkstation } from "@/hooks/supabase/use-workstations";
import {
  buildPublicCafeteriaQrUrl,
  generateQrDataUrl,
} from "@/lib/utils/cafeteria-qr";

export default function CafeteriaWorkstationQrPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = params.tenant as string;
  const workstationId = params.workstationId as string;
  const { workstation, isLoading, mutate } = useWorkstation(workstationId);
  const { tenant } = useAuthStore();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const publicUrl =
    workstation?.cafeteria_qr_slug
      ? buildPublicCafeteriaQrUrl(tenantSlug, workstation.cafeteria_qr_slug)
      : null;

  useEffect(() => {
    async function createQr() {
      if (!publicUrl) {
        setQrDataUrl(null);
        return;
      }

      setGenerating(true);
      try {
        setQrDataUrl(await generateQrDataUrl(publicUrl));
      } catch {
        toast.error("No se pudo generar el QR");
      } finally {
        setGenerating(false);
      }
    }

    void createQr();
  }, [publicUrl]);

  useEffect(() => {
    if (searchParams.get("print") === "1" && qrDataUrl) {
      window.print();
    }
  }, [qrDataUrl, searchParams]);

  async function copyUrl() {
    if (!publicUrl) {
      return;
    }

    await navigator.clipboard.writeText(publicUrl);
    toast.success("Enlace copiado");
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!workstation) {
    return (
      <div className="rounded-3xl border border-dashed p-10 text-center">
        Estación no encontrada.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">{workstation.name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {tenant?.name || "Tu negocio"} · {workstation.code || "Sin código"}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {!workstation.cafeteria_qr_enabled || !workstation.cafeteria_qr_slug ? (
            <div className="rounded-2xl border border-dashed py-16 text-center text-muted-foreground">
              Esta estación aún no tiene QR de cafetería activo.
            </div>
          ) : (
            <>
              <div className="mx-auto flex max-w-[360px] items-center justify-center rounded-[2rem] border bg-white p-6 shadow-sm">
                {generating || !qrDataUrl ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : (
                  <img
                    src={qrDataUrl}
                    alt={`QR ${workstation.name}`}
                    className="h-full w-full"
                  />
                )}
              </div>

              <div className="rounded-2xl border bg-muted/20 p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Escanea para abrir la cafetería de esta estación.
                </p>
                <p className="mt-2 break-all text-sm font-medium">{publicUrl}</p>
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="outline" onClick={() => mutate()}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Refrescar
                </Button>
                <Button variant="outline" onClick={copyUrl}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar enlace
                </Button>
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir
                </Button>
                <Button asChild>
                  <Link href={publicUrl || "#"} target="_blank">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Abrir público
                  </Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
