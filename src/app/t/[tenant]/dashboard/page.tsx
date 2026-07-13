// src/app/t/[tenant]/dashboard/page.tsx
"use client";

import { animate, stagger } from "animejs";
import { Calendar, DollarSign, Scissors, Users } from "lucide-react";
import { useEffect } from "react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { StatusDonut } from "@/components/dashboard/status-donut";
import { TopServicesChart } from "@/components/dashboard/top-services-chart";
import { UpcomingAppointments } from "@/components/dashboard/upcoming-appointments";
import {
  useDashboardKpis,
  useRevenueLast7Days,
  useStatusBreakdown,
  useTodayAppointments,
  useTopServices,
} from "@/hooks/supabase/use-dashboard";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function TenantDashboardPage() {
  const { tenant, tenantUser } = useAuthStore();
  const tenantId = tenant?.id ?? null;

  const { kpis } = useDashboardKpis(tenantId);
  const { appointments, isLoading: loadingAppts } =
    useTodayAppointments(tenantId);
  const { revenue } = useRevenueLast7Days(tenantId);
  const { slices } = useStatusBreakdown(tenantId);
  const { services } = useTopServices(tenantId);

  // Entrada escalonada de las tarjetas al montar
  useEffect(() => {
    animate(".dashboard-stagger", {
      opacity: [0, 1],
      translateY: [12, 0],
      delay: stagger(70),
      duration: 500,
      ease: "out(3)",
    });
  }, []);

  const formatMoney = (n: number) =>
    `$${n.toLocaleString("es", { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6">
      {/* Bienvenida */}
      <div>
        <h1 className="text-2xl font-bold">
          ¡Hola, {tenantUser?.full_name?.split(" ")[0] || "Usuario"}!
        </h1>
        <p className="text-muted-foreground">
          Bienvenido al panel de {tenant?.name}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Citas hoy"
          value={kpis?.appointmentsToday ?? 0}
          description="programadas para hoy"
          icon={Calendar}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-100 dark:bg-blue-950/50"
        />
        <KpiCard
          title="Clientes"
          value={kpis?.totalCustomers ?? 0}
          description="activos"
          icon={Users}
          iconColor="text-green-600 dark:text-green-400"
          iconBg="bg-green-100 dark:bg-green-950/50"
        />
        <KpiCard
          title="Servicios"
          value={kpis?.activeServices ?? 0}
          description="activos"
          icon={Scissors}
          iconColor="text-purple-600 dark:text-purple-400"
          iconBg="bg-purple-100 dark:bg-purple-950/50"
        />
        <KpiCard
          title="Ingresos hoy"
          value={kpis?.revenueToday ?? 0}
          description="facturas pagadas"
          icon={DollarSign}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-100 dark:bg-emerald-950/50"
          format={formatMoney}
        />
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RevenueChart data={revenue} />
        <StatusDonut data={slices} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TopServicesChart data={services} />
        <UpcomingAppointments
          appointments={appointments}
          isLoading={loadingAppts}
        />
      </div>
    </div>
  );
}
