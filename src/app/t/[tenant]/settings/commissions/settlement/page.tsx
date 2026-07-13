// src/app/t/[tenant]/settings/commissions/settlement/page.tsx
"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { useSpecialistsBalance } from "@/hooks/supabase/use-commissions";
import { useDebtBalances } from "@/hooks/supabase/use-debts";
import { commissionsService } from "@/lib/services/commissions";
import { debtsService } from "@/lib/services/debts";
import { useAuthStore } from "@/lib/stores/auth-store";

type Fortnight = "full" | "1" | "2";

export default function LiquidacionPage() {
  const { tenant, tenantUser } = useAuthStore();
  const tenantId = tenant?.id ?? null;
  const isAdminOrOwner = ["owner", "admin"].includes(tenantUser?.role ?? "");

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [fortnight, setFortnight] = useState<Fortnight>("full");
  const [payingId, setPayingId] = useState<string | null>(null);

  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1;

  const fortnightArg =
    fortnight === "1" ? 1 : fortnight === "2" ? 2 : undefined;

  const { balance, isLoading, mutate } = useSpecialistsBalance(
    tenantId,
    year,
    month,
    fortnightArg,
  );
  const { balances: debtBalances, mutate: mutateDebts } =
    useDebtBalances(tenantId);

  // Mapa de deuda pendiente por especialista
  const debtBySpecialist = new Map<string, number>();
  for (const db of debtBalances) {
    const current = debtBySpecialist.get(db.specialist_id) ?? 0;
    debtBySpecialist.set(db.specialist_id, current + db.total_remaining);
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

  async function handlePaySpecialist(
    specialistId: string,
    commissionIds: string[],
    name: string,
    netPayable: number,
  ) {
    setPayingId(specialistId);
    try {
      // 1. Si hay deudas pendientes, retener de las comisiones
      const debtAmount = debtBySpecialist.get(specialistId) ?? 0;
      if (debtAmount > 0 && netPayable > 0 && tenantId) {
        const maxRetention = Math.min(debtAmount, netPayable);
        await debtsService.bulkPayDebts(specialistId, tenantId, maxRetention);
      }
      // 2. Liquidar las comisiones
      await commissionsService.bulkPayCommissions(commissionIds);
      toast.success(`Comisiones de ${name} liquidadas`);
      mutate();
      mutateDebts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al liquidar");
    } finally {
      setPayingId(null);
    }
  }

  function handleExportPDF() {
    const periodLabel = format(new Date(year, month - 1, 1), "MMMM yyyy", {
      locale: es,
    });
    const periodTitle =
      fortnight === "full"
        ? periodLabel
        : fortnight === "1"
          ? `1ra quincena ${periodLabel}`
          : `2da quincena ${periodLabel}`;
    const totalNet = balance.reduce((s, b) => {
      const debt = debtBySpecialist.get(b.specialist_id) ?? 0;
      const retention = Math.min(debt, b.net_payable);
      return s + (b.net_payable - retention);
    }, 0);
    const mainCurrency = balance[0]?.currency_code ?? "USD";

    const rows = balance
      .map((b) => {
        const debt = debtBySpecialist.get(b.specialist_id) ?? 0;
        const retention = Math.min(debt, b.net_payable);
        const finalNet = b.net_payable - retention;
        return `<tr>
      <td>${b.full_name}</td>
      <td style="text-align:center">${b.pending_count}</td>
      <td>${b.currency_code} ${b.gross_commissions.toFixed(2)}</td>
      <td style="color:#dc2626">-${b.currency_code} ${b.total_deductions.toFixed(2)}</td>
      <td style="color:#d97706">${retention > 0 ? `-${b.currency_code} ${retention.toFixed(2)}` : "—"}</td>
      <td style="font-weight:bold;color:#16a34a">${b.currency_code} ${finalNet.toFixed(2)}</td>
    </tr>`;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Liquidación – ${periodTitle}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; font-size: 13px; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .subtitle { color: #666; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
    .total-row { margin-top: 8px; font-size: 16px; font-weight: bold; }
    @media print { @page { margin: 20px; } }
  </style>
</head>
<body>
  <h1>Comprobante de liquidación de comisiones</h1>
  <p class="subtitle">${periodTitle} · Generado el ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>

  <table>
    <thead>
      <tr>
        <th>Especialista</th>
        <th>Servicios</th>
        <th>Comisión bruta</th>
        <th>Consumos</th>
        <th>Retención deuda</th>
        <th>Neto a pagar</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <p class="total-row">Total a liquidar: ${mainCurrency} ${totalNet.toFixed(2)}</p>
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

  if (!isAdminOrOwner) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          No tienes permisos para acceder a esta pantalla.
        </p>
      </div>
    );
  }

  const periodLabel = format(new Date(year, month - 1, 1), "MMMM yyyy", {
    locale: es,
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Liquidación de comisiones</h1>
          <p className="text-sm text-muted-foreground">
            Marca las comisiones como pagadas y exporta comprobantes
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleExportPDF}
          disabled={balance.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      {/* Controles de período */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-base capitalize w-36 text-center">
            {periodLabel}
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

        <Select
          value={fortnight}
          onValueChange={(v) => setFortnight(v as Fortnight)}
        >
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="full">Mes completo</SelectItem>
            <SelectItem value="1">1ra quincena (1–15)</SelectItem>
            <SelectItem value="2">2da quincena (16–fin)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Contenido */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      ) : balance.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Wallet className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No hay comisiones pendientes de liquidar en este período
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI total */}
          <Card className="border-2 border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Total a liquidar
                </p>
                <p className="text-xs text-muted-foreground">
                  {balance.length} especialistas ·{" "}
                  {balance.reduce((s, b) => s + b.pending_count, 0)} comisiones
                </p>
              </div>
              <p className="text-2xl font-bold text-emerald-600">
                {balance[0]?.currency_code ?? "USD"}{" "}
                {balance.reduce((s, b) => s + b.net_payable, 0).toFixed(2)}
              </p>
            </CardContent>
          </Card>

          {/* Tabla de especialistas */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Especialista</TableHead>
                    <TableHead>Servicios</TableHead>
                    <TableHead>Bruto</TableHead>
                    <TableHead>Consumos</TableHead>
                    <TableHead>Retención deuda</TableHead>
                    <TableHead>Neto a pagar</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balance.map((b) => {
                    const debt = debtBySpecialist.get(b.specialist_id) ?? 0;
                    const retention = Math.min(debt, b.net_payable);
                    const finalNet = b.net_payable - retention;
                    return (
                      <TableRow key={b.specialist_id}>
                        <TableCell className="font-medium">
                          {b.full_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{b.pending_count}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {b.currency_code} {b.gross_commissions.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm text-destructive">
                          -{b.currency_code} {b.total_deductions.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {retention > 0 ? (
                            <span className="text-amber-600">
                              -{b.currency_code} {retention.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-bold text-emerald-600">
                          {b.currency_code} {finalNet.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() =>
                              handlePaySpecialist(
                                b.specialist_id,
                                b.pending_ids,
                                b.full_name,
                                b.net_payable,
                              )
                            }
                            disabled={
                              payingId === b.specialist_id ||
                              b.pending_ids.length === 0
                            }
                          >
                            {payingId === b.specialist_id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            )}
                            Liquidar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
