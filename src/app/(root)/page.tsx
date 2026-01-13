// src/app/(root)/page.tsx
"use client";

import Link from "next/link";
import { Building2, Puzzle, Layout, Palette, Plus, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { useActiveModules } from "@/hooks/supabase/use-modules";
import { useAllTenants, useTenantsStats } from "@/hooks/supabase/use-tenant";

export default function RootDashboard() {
  const { stats: tenantsStats, isLoading: loadingTenants } = useTenantsStats();
  const { modules, isLoading: loadingModules } = useActiveModules();
  const { tenants: recentTenants } = useAllTenants();

  const isLoading = loadingTenants || loadingModules;

  const stats = {
    tenants: tenantsStats.total,
    tenantsActive: tenantsStats.active,
    modules: modules.length,
    modulesCore: modules.filter((m) => m.is_core).length,
    templates: 1,
    themes: 1,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Bienvenido al panel de administración de la plataforma.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-20" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-12 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <StatCard
              title="Tenants"
              value={stats.tenants}
              description={`${stats.tenantsActive} activos`}
              href="/tenants"
              icon={Building2}
            />
            <StatCard
              title="Módulos"
              value={stats.modules}
              description={`${stats.modulesCore} core`}
              href="/modules"
              icon={Puzzle}
            />
            <StatCard
              title="Templates"
              value={stats.templates}
              description="Creados"
              href="/templates"
              icon={Layout}
            />
            <StatCard
              title="Temas"
              value={stats.themes}
              description="Disponibles"
              href="/themes"
              icon={Palette}
            />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Acciones rápidas</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <QuickActionCard
            href="/tenants/new"
            icon={Plus}
            title="Nuevo Tenant"
            description="Registrar nueva empresa"
          />
          <QuickActionCard
            href="/modules"
            icon={Puzzle}
            title="Ver Módulos"
            description="Gestionar módulos disponibles"
          />
          <QuickActionCard
            href="/templates"
            icon={Layout}
            title="Templates"
            description="Diseñar layouts"
          />
        </div>
      </div>

      {/* Recent Tenants */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Tenants recientes</h2>
          <Button variant="link" asChild className="gap-1">
            <Link href="/tenants">
              Ver todos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {recentTenants.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-4 font-medium">Nombre</th>
                      <th className="text-left p-4 font-medium">Slug</th>
                      <th className="text-left p-4 font-medium">Estado</th>
                      <th className="text-left p-4 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTenants.slice(0, 5).map((tenant) => (
                      <tr key={tenant.id} className="border-b last:border-0">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                              {tenant.name.charAt(0)}
                            </div>
                            <Link
                              href={`/tenants/${tenant.id}`}
                              className="font-medium hover:underline"
                            >
                              {tenant.name}
                            </Link>
                          </div>
                        </td>
                        <td className="p-4">
                          <code className="text-sm text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {tenant.slug}
                          </code>
                        </td>
                        <td className="p-4">
                          <StatusBadge status={tenant.status ?? "unknown"} />
                        </td>
                        <td className="p-4">
                          <Link
                            href={`/t/${tenant.slug}/login`}
                            target="_blank"
                            className="text-sm text-primary hover:underline"
                          >
                            Abrir ↗
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No hay tenants registrados</p>
                <Button variant="link" asChild className="mt-2">
                  <Link href="/tenants/new">Crear el primero</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Componentes auxiliares (igual que antes)
interface StatCardProps {
  title: string;
  value: number;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

function StatCard({ title, value, description, href, icon: Icon }: StatCardProps) {
  return (
    <Link href={href}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

interface QuickActionCardProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

function QuickActionCard({ href, icon: Icon, title, description }: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
    >
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
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