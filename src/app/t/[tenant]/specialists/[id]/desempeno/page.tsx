// src/app/t/[tenant]/specialists/[id]/desempeno/page.tsx
"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Medal,
  MinusCircle,
  PercentCircle,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMonthStats } from "@/hooks/supabase/use-consumptions";
import { useSpecialist } from "@/hooks/supabase/use-specialists";
import { consumptionsService } from "@/lib/services/consumptions";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function DesempenoPage() {
  const { tenant, tenantUser } = useAuthStore();
  const { id: specialistId, tenant: tenantSlug } = useParams<{
    id: string;
    tenant: string;
  }>();

  const tenantId = tenant?.id ?? null;
  const isAdminOrOwner = ["owner", "admin"].includes(tenantUser?.role ?? "");

  // Navegación de mes
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12

  const { specialist } = useSpecialist(specialistId);
  const { stats, isLoading } = useMonthStats(
    tenantId,
    specialistId,
    year,
    month,
  );

  // Ranking — solo para admins/owners
  const { data: ranking } = useSWR(
    isAdminOrOwner && tenantId ? `ranking:${tenantId}:${year}-${month}` : null,
    () =>
      tenantId
        ? consumptionsService.getMonthRanking(tenantId, year, month)
        : [],
    { revalidateOnFocus: false, dedupingInterval: 60000 },
  );

  function prevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  }

  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1;

  // Gráfico CSS de barras semanales
  const maxRevenue = Math.max(
    ...(stats?.weekly_revenue.map((w) => w.revenue) ?? [0]),
    1,
  );

  // Posición del especialista en el ranking
  const myRank =
    ranking?.findIndex((r) => r.specialist_id === specialistId) ?? -1;

  // Exportar PDF
  function handleExport() {
    if (!stats || !specialist) return;

    const periodLabel = format(new Date(year, month - 1, 1), "MMMM yyyy", {
      locale: es,
    });
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Desempeño – ${specialist.full_name} – ${periodLabel}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; font-size: 13px; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    h2 { font-size: 14px; margin: 20px 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
    .subtitle { color: #666; margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
    .kpi { border: 1px solid #eee; border-radius: 8px; padding: 14px; }
    .kpi-label { font-size: 11px; color: #666; margin-bottom: 4px; }
    .kpi-value { font-size: 22px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
    .net { font-size: 18px; font-weight: bold; color: #16a34a; }
    @media print { @page { margin: 20px; } }
  </style>
</head>
<body>
  <h1>Reporte de desempeño</h1>
  <p class="subtitle">${specialist.full_name} · ${periodLabel}</p>

  <div class="grid">
    <div class="kpi">
      <p class="kpi-label">Servicios realizados</p>
      <p class="kpi-value">${stats.services_count}</p>
    </div>
    <div class="kpi">
      <p class="kpi-label">Ingresos generados</p>
      <p class="kpi-value">${stats.currency_code} ${stats.revenue.toFixed(2)}</p>
    </div>
    <div class="kpi">
      <p class="kpi-label">Comisión acumulada</p>
      <p class="kpi-value">${stats.currency_code} ${stats.commission_amount.toFixed(2)}</p>
    </div>
    <div class="kpi">
      <p class="kpi-label">Consumos a descontar</p>
      <p class="kpi-value">-${stats.currency_code} ${stats.deductions.toFixed(2)}</p>
    </div>
    <div class="kpi">
      <p class="kpi-label">Neto estimado</p>
      <p class="kpi-value net">${stats.currency_code} ${stats.net_payable.toFixed(2)}</p>
    </div>
  </div>

  <h2>Ingresos por semana</h2>
  <table>
    <thead><tr><th>Semana</th><th>Ingresos</th></tr></thead>
    <tbody>
      ${stats.weekly_revenue.map((w) => `<tr><td>${w.label}</td><td>${stats.currency_code} ${w.revenue.toFixed(2)}</td></tr>`).join("")}
    </tbody>
  </table>

  <p style="margin-top: 32px; color: #999; font-size: 11px;">
    Generado el ${format(new Date(), "dd/MM/yyyy HH:mm")} · book-now-hub
  </p>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  const kpis = [
    {
      label: "Servicios",
      value: String(stats?.services_count ?? 0),
      icon: TrendingUp,
      color: "text-blue-500",
    },
    {
      label: "Ingresos",
      value: stats ? `${stats.currency_code} ${stats.revenue.toFixed(2)}` : "—",
      icon: TrendingUp,
      color: "text-emerald-500",
    },
    {
      label: "Comisión",
      value: stats
        ? `${stats.currency_code} ${stats.commission_amount.toFixed(2)}`
        : "—",
      icon: PercentCircle,
      color: "text-violet-500",
    },
    {
      label: "Consumos",
      value: stats
        ? `-${stats.currency_code} ${stats.deductions.toFixed(2)}`
        : "—",
      icon: MinusCircle,
      color: "text-red-500",
    },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/t/${tenantSlug}/specialists/${specialistId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">Desempeño</h1>
            <p className="text-sm text-muted-foreground">
              {specialist?.full_name ?? "Especialista"}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={!stats}
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      {/* Navegador de mes */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-semibold text-base capitalize w-36 text-center">
          {format(new Date(year, month - 1, 1), "MMMM yyyy", { locale: es })}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={nextMonth}
          disabled={isCurrentMonth}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {kpis.map((kpi) => (
              <Card key={kpi.label}>
                <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0 pt-4 px-4">
                  <CardTitle className="text-xs text-muted-foreground font-medium">
                    {kpi.label}
                  </CardTitle>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-lg font-bold">{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Neto estimado */}
          <Card className="border-2 border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Wallet className="h-6 w-6 text-emerald-600" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Neto estimado a pagar
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Comisión acumulada − consumos a descontar
                  </p>
                </div>
              </div>
              <p className="text-2xl font-bold text-emerald-600">
                {stats
                  ? `${stats.currency_code} ${stats.net_payable.toFixed(2)}`
                  : "—"}
              </p>
            </CardContent>
          </Card>

          {/* Gráfico de barras semanal */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Ingresos por semana</CardTitle>
            </CardHeader>
            <CardContent>
              {stats && stats.weekly_revenue.length > 0 ? (
                <div className="flex items-end gap-3 h-32">
                  {stats.weekly_revenue.map((w) => (
                    <div
                      key={w.week}
                      className="flex-1 flex flex-col items-center gap-1"
                    >
                      <span className="text-xs text-muted-foreground font-medium">
                        {stats.currency_code} {w.revenue.toFixed(0)}
                      </span>
                      <div
                        className="w-full rounded-t-md bg-primary transition-all"
                        style={{
                          height: `${Math.max((w.revenue / maxRevenue) * 80, w.revenue > 0 ? 4 : 0)}px`,
                          minHeight: w.revenue > 0 ? "4px" : "0",
                        }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {w.label}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-6">
                  Sin ingresos este mes
                </p>
              )}
            </CardContent>
          </Card>

          {/* Ranking (solo admin/owner) */}
          {isAdminOrOwner && ranking && ranking.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Medal className="h-4 w-4 text-yellow-500" />
                  Ranking del mes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {ranking.map((r, i) => {
                  const isMe = r.specialist_id === specialistId;
                  return (
                    <div
                      key={r.specialist_id}
                      className={`flex items-center gap-3 p-2 rounded-md ${isMe ? "bg-primary/5 border border-primary/20" : ""}`}
                    >
                      <span
                        className={`w-6 text-center font-bold text-sm ${
                          i === 0
                            ? "text-yellow-500"
                            : i === 1
                              ? "text-gray-400"
                              : i === 2
                                ? "text-amber-600"
                                : "text-muted-foreground"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span
                        className={`flex-1 text-sm ${isMe ? "font-semibold" : ""}`}
                      >
                        {r.full_name}
                        {isMe && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Tú
                          </Badge>
                        )}
                      </span>
                      <span className="text-sm font-medium">
                        ${r.revenue.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
                {myRank >= 0 && (
                  <p className="text-xs text-center text-muted-foreground pt-1">
                    {specialist?.full_name} está en la posición #{myRank + 1} de{" "}
                    {ranking.length}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
