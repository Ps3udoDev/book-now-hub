// src/app/t/[tenant]/caja/cierres/[sessionId]/page.tsx
"use client";

import {
  ArrowLeft,
  CheckCircle,
  CreditCard,
  Landmark,
  Printer,
  Smartphone,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSessionWithDetails } from "@/hooks/supabase/use-cash-sessions";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { CashRegisterSummary } from "@/types";

const AREA_LABELS: Record<string, string> = {
  service: "Servicios",
  product: "Productos",
  cafeteria: "Cafetería",
  total: "TOTAL",
};

const METHOD_COLS = [
  { key: "total_cash" as const, label: "Efectivo", Icon: Wallet },
  { key: "total_card" as const, label: "Tarjeta", Icon: CreditCard },
  { key: "total_transfer" as const, label: "Transfer.", Icon: Landmark },
  { key: "total_mobile_payment" as const, label: "Móvil", Icon: Smartphone },
];

function fmt(n: number) {
  return n.toFixed(2);
}

function fmtDateLong(iso: string) {
  return new Date(iso).toLocaleString("es-VE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SummarySection({
  summaries,
  currency,
}: {
  summaries: CashRegisterSummary[];
  currency: string;
}) {
  const rows = summaries
    .filter((r) => r.currency_code === currency)
    .sort((a, b) => {
      const order = { service: 0, product: 1, cafeteria: 2, total: 3 };
      return (
        (order[a.area as keyof typeof order] ?? 99) -
        (order[b.area as keyof typeof order] ?? 99)
      );
    });

  const activeMethods = METHOD_COLS.filter((m) =>
    rows.some((r) => r[m.key] > 0),
  );

  if (rows.length === 0) return null;

  return (
    <div className="space-y-2">
      {currency && (
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Moneda: {currency}
        </p>
      )}
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Área</th>
              {activeMethods.map(({ key, label, Icon }) => (
                <th key={key} className="px-3 py-2 text-right font-medium">
                  <span className="flex items-center justify-end gap-1">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </span>
                </th>
              ))}
              {rows.some((r) => r.total_gateway > 0) && (
                <th className="px-3 py-2 text-right font-medium">Pasarela</th>
              )}
              <th className="px-3 py-2 text-right font-medium">Total</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                Tx
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.area}
                className={`border-t ${row.area === "total" ? "bg-primary/5 font-semibold" : ""}`}
              >
                <td className="px-3 py-2">
                  {AREA_LABELS[row.area] ?? row.area}
                </td>
                {activeMethods.map(({ key }) => (
                  <td key={key} className="px-3 py-2 text-right tabular-nums">
                    {row[key] > 0 ? fmt(row[key]) : "—"}
                  </td>
                ))}
                {rows.some((r) => r.total_gateway > 0) && (
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.total_gateway > 0 ? fmt(row.total_gateway) : "—"}
                  </td>
                )}
                <td className="px-3 py-2 text-right tabular-nums font-medium">
                  {currency} {fmt(row.total_amount)}
                </td>
                <td className="px-3 py-2 text-right text-muted-foreground">
                  {row.area === "total" ? row.transaction_count : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SessionReportPage({
  params,
}: {
  params: Promise<{ tenant: string; sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const { tenant } = useAuthStore();
  const { sessionDetail, isLoading } = useSessionWithDetails(sessionId);
  const slug = tenant?.slug ?? "";

  function handlePrint() {
    if (!sessionDetail) return;
    const html = buildReportHtml(sessionDetail, tenant?.name ?? "");
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
      // Fallback: descargar HTML
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cierre-caja-${sessionId.slice(0, 8)}.html`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    win.document.write(html);
    win.document.close();
  }

  if (isLoading) {
    return (
      <div className="container max-w-3xl py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!sessionDetail) {
    return (
      <div className="container max-w-3xl py-8">
        <p className="text-destructive">Sesión no encontrada.</p>
        <Button asChild variant="link" className="mt-2 p-0">
          <Link href={`/t/${slug}/caja/cierres`}>← Volver al historial</Link>
        </Button>
      </div>
    );
  }

  const currencies = [
    ...new Set(sessionDetail.summaries.map((r) => r.currency_code)),
  ].sort();

  const diff = sessionDetail.difference;
  const hasDiff = diff !== null && Math.abs(diff) > 0.01;

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/t/${slug}/caja/cierres`}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Historial
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">Reporte de Cierre</h1>
            <p className="text-sm text-muted-foreground">
              {sessionDetail.branch_name} — {sessionDetail.register_name}
            </p>
          </div>
        </div>
        <Button className="gap-2" onClick={handlePrint}>
          <Printer className="h-4 w-4" />
          Imprimir / PDF
        </Button>
      </div>

      {/* Info de la sesión */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Información de la sesión</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Apertura</span>
            <span>{fmtDateLong(sessionDetail.opened_at)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Aperturado por</span>
            <span>{sessionDetail.opened_by_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cierre</span>
            <span>
              {sessionDetail.closed_at
                ? fmtDateLong(sessionDetail.closed_at)
                : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cerrado por</span>
            <span>{sessionDetail.closed_by_name ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fondo inicial</span>
            <span className="font-medium">
              {sessionDetail.register_currency}{" "}
              {fmt(Number(sessionDetail.opening_amount))}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Caja</span>
            <span>
              {sessionDetail.register_name} ({sessionDetail.register_currency})
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Resumen de cobros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resumen de cobros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {sessionDetail.summaries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin cobros registrados en esta sesión.
            </p>
          ) : (
            currencies.map((cur) => (
              <SummarySection
                key={cur}
                summaries={sessionDetail.summaries}
                currency={cur}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Conciliación */}
      {(sessionDetail.closing_amount !== null ||
        sessionDetail.difference !== null) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Conciliación de efectivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {sessionDetail.closing_amount !== null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Efectivo contado</span>
                <span className="font-medium">
                  {sessionDetail.register_currency}{" "}
                  {fmt(Number(sessionDetail.closing_amount))}
                </span>
              </div>
            )}
            {diff !== null && (
              <div
                className={`flex items-center justify-between rounded-md px-3 py-2 font-medium ${
                  !hasDiff
                    ? "bg-green-50 text-green-700"
                    : diff > 0
                      ? "bg-blue-50 text-blue-700"
                      : "bg-red-50 text-red-700"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {!hasDiff ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : diff > 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {!hasDiff
                    ? "Cuadre perfecto"
                    : diff > 0
                      ? "Sobrante"
                      : "Faltante"}
                </span>
                {hasDiff && (
                  <span>
                    {sessionDetail.register_currency} {fmt(Math.abs(diff))}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notas */}
      {sessionDetail.notes && (
        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Notas: </span>
            {sessionDetail.notes}
          </CardContent>
        </Card>
      )}

      {/* Estado */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Badge
          className={
            sessionDetail.status === "closed"
              ? "bg-slate-100 text-slate-700"
              : "bg-green-100 text-green-700"
          }
        >
          {sessionDetail.status === "closed" ? "Cerrada" : "Abierta"}
        </Badge>
        <span>ID: {sessionDetail.id.slice(0, 8)}...</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Generador de HTML para impresión / PDF
// ─────────────────────────────────────────────────────────────────────

import type { SessionWithDetails } from "@/lib/services/cash-sessions";

function buildReportHtml(s: SessionWithDetails, tenantName: string): string {
  const currencies = [
    ...new Set(s.summaries.map((r) => r.currency_code)),
  ].sort();

  const activeMethods = METHOD_COLS.filter((m) =>
    s.summaries.some((r) => r[m.key] > 0),
  );
  const hasGateway = s.summaries.some((r) => r.total_gateway > 0);

  function summaryTable(currency: string) {
    const rows = s.summaries
      .filter((r) => r.currency_code === currency)
      .sort((a, b) => {
        const order: Record<string, number> = {
          service: 0,
          product: 1,
          cafeteria: 2,
          total: 3,
        };
        return (order[a.area] ?? 99) - (order[b.area] ?? 99);
      });

    const headers = [
      "Área",
      ...activeMethods.map((m) => m.label),
      ...(hasGateway ? ["Pasarela"] : []),
      `Total (${currency})`,
      "Tx",
    ]
      .map((h) => `<th>${escHtml(h)}</th>`)
      .join("");

    const bodyRows = rows
      .map(
        (r) => `
      <tr class="${r.area === "total" ? "total-row" : ""}">
        <td>${escHtml(AREA_LABELS[r.area] ?? r.area)}</td>
        ${activeMethods.map((m) => `<td class="right">${r[m.key] > 0 ? fmt(r[m.key]) : "—"}</td>`).join("")}
        ${hasGateway ? `<td class="right">${r.total_gateway > 0 ? fmt(r.total_gateway) : "—"}</td>` : ""}
        <td class="right bold">${currency} ${fmt(r.total_amount)}</td>
        <td class="right muted">${r.area === "total" ? r.transaction_count : ""}</td>
      </tr>`,
      )
      .join("");

    return `
      ${currencies.length > 1 ? `<p class="currency-label">Moneda: ${currency}</p>` : ""}
      <table><thead><tr>${headers}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  }

  const conciliation =
    s.closing_amount !== null
      ? `
    <div class="section">
      <h3>Conciliación de efectivo</h3>
      <div class="row"><span>Efectivo contado</span><span>${s.register_currency} ${fmt(Number(s.closing_amount))}</span></div>
      ${
        s.difference !== null
          ? `<div class="row bold ${Math.abs(s.difference) > 0.01 ? "diff-warn" : "diff-ok"}">
          <span>${Math.abs(s.difference) <= 0.01 ? "✓ Cuadre perfecto" : s.difference > 0 ? "Sobrante" : "Faltante"}</span>
          ${Math.abs(s.difference) > 0.01 ? `<span>${s.register_currency} ${fmt(Math.abs(s.difference))}</span>` : ""}
        </div>`
          : ""
      }
    </div>`
      : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Reporte de Cierre — ${escHtml(tenantName)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; max-width: 900px; margin: 0 auto; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    h2 { font-size: 14px; margin: 16px 0 6px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    h3 { font-size: 12px; margin: 12px 0 4px; color: #444; }
    .subtitle { color: #666; font-size: 11px; margin-bottom: 16px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 32px; margin-bottom: 16px; }
    .meta-grid .item { display: flex; justify-content: space-between; padding: 2px 0; }
    .meta-grid .label { color: #666; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th { background: #f4f4f4; text-align: left; padding: 5px 8px; font-size: 11px; }
    td { padding: 4px 8px; border-bottom: 1px solid #eee; font-size: 11px; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .muted { color: #888; }
    .total-row td { font-weight: bold; background: #f9f9f9; border-top: 1px solid #ccc; }
    .section { margin-top: 12px; }
    .row { display: flex; justify-content: space-between; padding: 3px 0; }
    .diff-ok { color: #166534; background: #f0fdf4; padding: 4px 8px; border-radius: 4px; }
    .diff-warn { color: #991b1b; background: #fef2f2; padding: 4px 8px; border-radius: 4px; }
    .currency-label { font-size: 10px; font-weight: 600; text-transform: uppercase; color: #666; margin-bottom: 4px; letter-spacing: 0.05em; }
    .footer { margin-top: 24px; text-align: center; font-size: 10px; color: #999; }
    @media print { @page { margin: 10mm; } body { padding: 0; } }
  </style>
</head>
<body>
  <h1>Reporte de Cierre de Caja</h1>
  <p class="subtitle">${escHtml(tenantName)} — ${escHtml(s.branch_name)} — ${escHtml(s.register_name)}</p>

  <h2>Información de la sesión</h2>
  <div class="meta-grid">
    <div class="item"><span class="label">Apertura</span><span>${escHtml(fmtDateLong(s.opened_at))}</span></div>
    <div class="item"><span class="label">Aperturado por</span><span>${escHtml(s.opened_by_name)}</span></div>
    <div class="item"><span class="label">Cierre</span><span>${s.closed_at ? escHtml(fmtDateLong(s.closed_at)) : "—"}</span></div>
    <div class="item"><span class="label">Cerrado por</span><span>${escHtml(s.closed_by_name ?? "—")}</span></div>
    <div class="item"><span class="label">Fondo inicial</span><span>${escHtml(s.register_currency)} ${fmt(Number(s.opening_amount))}</span></div>
    <div class="item"><span class="label">ID sesión</span><span>${s.id.slice(0, 8)}...</span></div>
  </div>

  <h2>Resumen de cobros</h2>
  ${s.summaries.length === 0 ? "<p>Sin cobros registrados.</p>" : currencies.map(summaryTable).join("")}

  ${conciliation}

  ${s.notes ? `<div class="section"><h3>Notas</h3><p>${escHtml(s.notes)}</p></div>` : ""}

  <div class="footer">Generado el ${new Date().toLocaleString("es-VE")} — book-now-hub</div>

  <script>
    window.addEventListener('load', function() { window.print(); });
  </script>
</body>
</html>`;
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
