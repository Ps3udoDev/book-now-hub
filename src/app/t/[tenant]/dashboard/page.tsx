// src/app/t/[tenant]/dashboard/page.tsx
"use client";

import { useAuthStore } from "@/lib/stores/auth-store";
import { useTenant } from "@/providers/tenant-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Scissors, DollarSign } from "lucide-react";

export default function TenantDashboardPage() {
  const { tenant, tenantUser } = useAuthStore();
  const { modules } = useTenant();

  // Stats de ejemplo (en producción vendrían de la API)
  const stats = [
    {
      title: "Citas Hoy",
      value: "12",
      description: "3 pendientes",
      icon: Calendar,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Clientes",
      value: "248",
      description: "+12 este mes",
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Servicios",
      value: "18",
      description: "activos",
      icon: Scissors,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Ingresos Hoy",
      value: "$450",
      description: "+15% vs ayer",
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header de bienvenida */}
      <div>
        <h1 className="text-2xl font-bold">
          ¡Hola, {tenantUser?.full_name?.split(" ")[0] || "Usuario"}!
        </h1>
        <p className="text-muted-foreground">
          Bienvenido al panel de {tenant?.name}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Módulos activos */}
      <Card>
        <CardHeader>
          <CardTitle>Módulos Activos</CardTitle>
          <CardDescription>
            Funcionalidades habilitadas para tu empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          {modules.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {modules.map((module) => (
                <div
                  key={module.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Scissors className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{module.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {module.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No hay módulos configurados aún.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Próximas citas (placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>Próximas Citas</CardTitle>
          <CardDescription>Citas programadas para hoy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Las citas aparecerán aquí</p>
            <p className="text-sm">Una vez implementes el módulo de agendamiento</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}