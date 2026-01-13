// src/app/(root)/tenants/page.tsx
"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllTenants } from "@/hooks/supabase/use-tenant";

export default function TenantsPage() {
  const { tenants, isLoading, error } = useAllTenants();

  if (isLoading) {
    return <TenantsPageSkeleton />;
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
        Error cargando tenants: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tenants</h1>
          <p className="text-muted-foreground">
            Gestiona las empresas registradas en la plataforma.
          </p>
        </div>
        <Button asChild>
          <Link href="/tenants/new">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Tenant
          </Link>
        </Button>
      </div>

      {/* Table */}
      {tenants.length > 0 ? (
        <div className="rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-medium">Empresa</th>
                <th className="text-left p-4 font-medium">Slug / URL</th>
                <th className="text-left p-4 font-medium">Plan</th>
                <th className="text-left p-4 font-medium">Estado</th>
                <th className="text-left p-4 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="border-b last:border-0">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        {tenant.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {tenant.created_at ? new Date(tenant.created_at).toLocaleDateString("es") : "N/A"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      /t/{tenant.slug}
                    </code>
                  </td>
                  <td className="p-4 capitalize">
                    {tenant.subscription_plan || "starter"}
                  </td>
                  <td className="p-4">
                    <StatusBadge status={tenant.status ?? "unknown"} />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/tenants/${tenant.id}`}
                        className="text-sm text-primary hover:underline"
                      >
                        Ver
                      </Link>
                      <span className="text-muted-foreground">|</span>
                      <Link
                        href={`/t/${tenant.slug}/login`}
                        className="text-sm text-muted-foreground hover:text-foreground"
                        target="_blank"
                      >
                        Abrir ↗
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const safeStatus = status ?? "unknown";
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    active: "default",
    trial: "secondary",
    suspended: "destructive",
    cancelled: "outline",
  };
  const labels: Record<string, string> = {
    active: "Activo",
    trial: "Prueba",
    suspended: "Suspendido",
    cancelled: "Cancelado",
  };
  return <Badge variant={variants[safeStatus] || "outline"}>{labels[safeStatus] || safeStatus}</Badge>;
}

function EmptyState() {
  return (
    <div className="text-center py-12 border rounded-lg bg-muted/20">
      <p className="text-muted-foreground mb-4">No hay tenants registrados.</p>
      <Button asChild>
        <Link href="/tenants/new">
          <Plus className="w-4 h-4 mr-2" />
          Crear primer tenant
        </Link>
      </Button>
    </div>
  );
}

function TenantsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="rounded-lg border p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}