"use client";

import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { TenantModulesManager } from "@/components/tenant/tenant-modules-manager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenantById } from "@/hooks/supabase/use-tenant";

const STATUS_LABELS: Record<string, string> = {
  active: "Activo",
  trial: "Prueba",
  suspended: "Suspendido",
  cancelled: "Cancelado",
};

export default function TenantDetailPage() {
  const params = useParams();
  const tenantId = params.id as string;
  const { tenant, isLoading } = useTenantById(tenantId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="space-y-4">
        <Link href="/tenants">
          <Button variant="ghost" size="sm" className="-ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
        <p className="py-12 text-center text-muted-foreground">
          Tenant no encontrado.
        </p>
      </div>
    );
  }

  const status = tenant.status ?? "unknown";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/tenants">
          <Button variant="ghost" size="sm" className="-ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a tenants
          </Button>
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-lg font-semibold text-primary">
              {tenant.name?.charAt(0) ?? "T"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{tenant.name}</h1>
                <Badge variant="secondary">
                  {STATUS_LABELS[status] ?? status}
                </Badge>
              </div>
              <code className="text-sm text-muted-foreground">
                /t/{tenant.slug}
              </code>
            </div>
          </div>
          <Link href={`/t/${tenant.slug}/login`} target="_blank">
            <Button variant="outline">
              Abrir panel
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle>Información</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Slug" value={tenant.slug ?? "—"} />
            <Row label="Estado" value={STATUS_LABELS[status] ?? status} />
          </CardContent>
        </Card>

        <TenantModulesManager tenantId={tenantId} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
