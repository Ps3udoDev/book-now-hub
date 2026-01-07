// src/app/(root)/page.tsx
import Link from "next/link";
import {
  Building2,
  Puzzle,
  Layout,
  Palette,
  Plus,
  ArrowRight,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function RootDashboard() {
  // En producción, estos datos vendrían de Supabase
  const stats = {
    tenants: 2,
    modules: 9,
    templates: 1,
    themes: 1,
  };

  // Datos de ejemplo
  const recentTenants = [
    {
      id: "1",
      name: "Elviz Studio",
      slug: "elviz-studio",
      status: "active",
      modules: "6 core + 2 addon",
    },
    {
      id: "2",
      name: "Denti Med",
      slug: "denti-med",
      status: "trial",
      modules: "6 core",
    },
  ];

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
        <StatCard
          title="Tenants"
          value={stats.tenants}
          description="Empresas activas"
          href="/tenants"
          icon={Building2}
        />
        <StatCard
          title="Módulos"
          value={stats.modules}
          description="Disponibles"
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Nombre</th>
                    <th className="text-left p-4 font-medium">Slug</th>
                    <th className="text-left p-4 font-medium">Estado</th>
                    <th className="text-left p-4 font-medium">Módulos</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTenants.map((tenant) => (
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
                      <td className="p-4 text-muted-foreground">
                        {tenant.slug}
                      </td>
                      <td className="p-4">
                        <StatusBadge status={tenant.status} />
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {tenant.modules}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Componentes auxiliares

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

function QuickActionCard({
  href,
  icon: Icon,
  title,
  description,
}: QuickActionCardProps) {
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

function StatusBadge({ status }: { status: string }) {
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

  return (
    <Badge variant={variants[status] || "outline"}>
      {labels[status] || status}
    </Badge>
  );
}