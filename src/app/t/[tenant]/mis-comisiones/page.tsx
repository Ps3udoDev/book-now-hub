// src/app/t/[tenant]/mis-comisiones/page.tsx
"use client";

import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MinusCircle,
  PercentCircle,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMyCommissions } from "@/hooks/supabase/use-commissions";
import { useConsumptions } from "@/hooks/supabase/use-consumptions";
import { useOutstandingDebts } from "@/hooks/supabase/use-debts";
import { commissionsService } from "@/lib/services/commissions";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { CommissionStatus } from "@/types";

const STATUS_OPTIONS: { value: CommissionStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos los estados" },
  { value: "pending", label: "Pendientes" },
  { value: "approved", label: "Aprobadas" },
  { value: "paid", label: "Liquidadas" },
  { value: "cancelled", label: "Canceladas" },
];

export default function MisComisionesPage() {
  const { tenant, user } = useAuthStore();
  const tenantId = tenant?.id ?? null;
  // profiles.id = auth user id
  const specialistId = user?.id ?? null;

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [filterStatus, setFilterStatus] = useState<CommissionStatus | "all">(
    "all",
  );
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1;

  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).toISOString().slice(0, 10);

  const { commissions, isLoading } = useMyCommissions(tenantId, specialistId, {
    year,
    month,
  });
  const { consumptions } = useConsumptions(tenantId, specialistId, {
    from: firstDay,
    to: lastDay,
  });
  const { debts: outstandingDebts } = useOutstandingDebts(
    tenantId,
    specialistId,
  );

  // Total de deudas pendientes
  const totalDebtRemaining = outstandingDebts.reduce(
    (s, d) => s + Number(d.remaining_amount),
    0,
  );

  // KPIs de hoy (solo cuando es el mes actual)
  const today = now.toISOString().slice(0, 10);
  const todayCommissions = commissions.filter(
    (c) => c.created_at?.slice(0, 10) === today,
  );
  const todayConsumptions = consumptions.filter((c) => c.date === today);
  const todayServicesCount = todayCommissions.length;
  const todayCommissionTotal = todayCommissions.reduce(
    (s, c) => s + c.commission_amount,
    0,
  );
  const todayConsumptionsTotal = todayConsumptions
    .filter((c) => c.deduct_from_commission)
    .reduce((s, c) => s + c.total_cost, 0);

  // Totales del mes
  const monthCommission = commissions
    .filter((c) => c.status !== "cancelled")
    .reduce((s, c) => s + c.commission_amount, 0);
  const monthDeductions = consumptions
    .filter((c) => c.deduct_from_commission)
    .reduce((s, c) => s + c.total_cost, 0);
  const monthNet = monthCommission - monthDeductions;

  // Agrupar comisiones por día para el calendario
  const commissionsByDay = new Map<string, number>();
  for (const c of commissions) {
    if (c.status === "cancelled") continue;
    const day = c.created_at?.slice(0, 10);
    if (day) {
      commissionsByDay.set(day, (commissionsByDay.get(day) ?? 0) + 1);
    }
  }
  const consumptionsByDay = new Map<string, boolean>();
  for (const c of consumptions) {
    if (c.deduct_from_commission) {
      consumptionsByDay.set(c.date, true);
    }
  }

  // Días del calendario
  const monthDate = new Date(year, month - 1, 1);
  const calendarStart = startOfWeek(startOfMonth(monthDate), {
    weekStartsOn: 1,
  });
  const calendarEnd = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  // Filtrar comisiones por estado + día seleccionado
  let filtered =
    filterStatus === "all"
      ? commissions
      : commissions.filter((c) => c.status === filterStatus);

  if (selectedDay) {
    filtered = filtered.filter(
      (c) => c.created_at?.slice(0, 10) === selectedDay,
    );
  }

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

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Mis Comisiones</h1>
        <p className="text-sm text-muted-foreground">
          Tu historial personal de comisiones y consumos
        </p>
      </div>

      {/* Resumen de hoy (solo en mes actual) */}
      {isCurrentMonth && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Hoy — {format(now, "EEEE dd 'de' MMMM", { locale: es })}
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Servicios
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="text-xl font-bold">{todayServicesCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                  <PercentCircle className="h-3 w-3" />
                  Comisión
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="text-xl font-bold">
                  ${todayCommissionTotal.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                  <MinusCircle className="h-3 w-3 text-destructive" />
                  Consumos
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="text-xl font-bold text-destructive">
                  -${todayConsumptionsTotal.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

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

      {/* Resumen del mes */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="space-y-3 p-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Comisión bruta</p>
              <p className="text-lg font-bold">${monthCommission.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Consumos</p>
              <p className="text-lg font-bold text-destructive">
                -${monthDeductions.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Neto estimado</p>
              <p className="text-lg font-bold text-emerald-600">
                ${monthNet.toFixed(2)}
              </p>
            </div>
          </div>
          {totalDebtRemaining > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50/50 px-3 py-2 text-sm dark:bg-amber-950/20">
              <div className="flex items-center justify-between">
                <span className="text-amber-700 dark:text-amber-400">
                  Deuda pendiente por compras
                </span>
                <span className="font-semibold text-amber-700 dark:text-amber-400">
                  -${totalDebtRemaining.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Se retiene gradualmente de tus liquidaciones
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deudas pendientes */}
      {outstandingDebts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MinusCircle className="h-4 w-4 text-amber-600" />
              Deudas pendientes ({outstandingDebts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {outstandingDebts.map((debt) => (
              <div
                key={debt.id}
                className="flex items-center justify-between text-sm rounded-md border px-3 py-2"
              >
                <div>
                  <p className="font-medium">{debt.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {debt.created_at
                      ? format(new Date(debt.created_at), "dd MMM yyyy", {
                          locale: es,
                        })
                      : "Sin fecha"}
                    {" · "}
                    Original: ${Number(debt.original_amount).toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-amber-600">
                    ${Number(debt.remaining_amount).toFixed(2)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">pendiente</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Calendario mensual */}
      <Card>
        <CardContent className="p-3">
          {/* Encabezado días de la semana */}
          <div className="grid grid-cols-7 text-center text-[10px] font-medium text-muted-foreground mb-1">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          {/* Grid de días */}
          <div className="grid grid-cols-7 gap-0.5">
            {calendarDays.map((day) => {
              const dayStr = format(day, "yyyy-MM-dd");
              const inMonth = isSameMonth(day, monthDate);
              const today = isToday(day);
              const hasCommissions = commissionsByDay.has(dayStr);
              const hasDeductions = consumptionsByDay.has(dayStr);
              const isSelected = selectedDay === dayStr;

              return (
                <button
                  type="button"
                  key={dayStr}
                  onClick={() => {
                    if (!inMonth) return;
                    setSelectedDay(isSelected ? null : dayStr);
                  }}
                  disabled={!inMonth}
                  className={`relative flex flex-col items-center justify-center rounded-md py-1.5 text-xs transition-colors ${
                    !inMonth
                      ? "text-muted-foreground/30 cursor-default"
                      : isSelected
                        ? "bg-primary text-primary-foreground font-bold"
                        : today
                          ? "bg-muted font-semibold"
                          : "hover:bg-muted/60"
                  }`}
                >
                  <span>{format(day, "d")}</span>
                  {inMonth && (hasCommissions || hasDeductions) && (
                    <div className="flex gap-0.5 mt-0.5">
                      {hasCommissions && (
                        <span className="h-1 w-1 rounded-full bg-emerald-500" />
                      )}
                      {hasDeductions && (
                        <span className="h-1 w-1 rounded-full bg-destructive" />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {/* Leyenda */}
          <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Comisión
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
              Consumo
            </span>
            {selectedDay && (
              <button
                type="button"
                className="ml-auto underline"
                onClick={() => setSelectedDay(null)}
              >
                Limpiar filtro
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filtro de estado */}
      <Select
        value={filterStatus}
        onValueChange={(v) => setFilterStatus(v as CommissionStatus | "all")}
      >
        <SelectTrigger className="w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Lista de comisiones */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">
              No hay comisiones para este período
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Base</TableHead>
                  <TableHead>Comisión</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(c.created_at), "dd MMM yyyy", {
                        locale: es,
                      })}
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.order?.currency_code ?? "USD"}{" "}
                      {c.base_amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {c.commission_amount.toFixed(2)}
                      {c.commission_type === "percentage" &&
                        c.commission_rate !== null && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({c.commission_rate}%)
                          </span>
                        )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={commissionsService.getStatusColor(c.status)}
                      >
                        {commissionsService.getStatusLabel(c.status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Neto estimado del mes */}
      <Card className="border-2 border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Wallet className="h-6 w-6 text-emerald-600" />
            <div>
              <p className="text-sm text-muted-foreground">
                Neto estimado del mes
              </p>
              <p className="text-xs text-muted-foreground">
                Comisión acumulada − consumos a descontar
              </p>
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600">
            ${monthNet.toFixed(2)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
