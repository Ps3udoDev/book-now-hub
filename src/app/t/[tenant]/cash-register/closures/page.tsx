// src/app/t/[tenant]/cash-register/closures/page.tsx
"use client";

import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle,
  History,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useActiveBranches } from "@/hooks/supabase/use-branches";
import { useClosedSessions } from "@/hooks/supabase/use-cash-sessions";
import type { EnrichedSession } from "@/lib/services/cash-sessions";
import { useAuthStore } from "@/lib/stores/auth-store";

const DIFFERENCE_ALERT_THRESHOLD = 1; // unidades de moneda

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DiffBadge({ diff }: { diff: number | null }) {
  if (diff === null)
    return <span className="text-muted-foreground text-xs">—</span>;
  if (Math.abs(diff) <= 0.01)
    return (
      <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
        <CheckCircle className="h-3 w-3" /> Cuadrado
      </Badge>
    );
  return (
    <Badge
      className={
        diff > 0
          ? "bg-blue-100 text-blue-700 border-blue-200 gap-1"
          : "bg-red-100 text-red-700 border-red-200 gap-1"
      }
    >
      {diff > 0 ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {diff > 0 ? "+" : ""}
      {diff.toFixed(2)}
    </Badge>
  );
}

export default function CierresHistorialPage() {
  const { tenant } = useAuthStore();
  const { branches, isLoading: loadingBranches } = useActiveBranches(
    tenant?.id ?? null,
  );

  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<{
    from?: string;
    to?: string;
  }>({});

  const { sessions, isLoading } = useClosedSessions(
    selectedBranchId || null,
    appliedFilters,
  );

  // Pre-seleccionar primera sucursal
  useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  function applyFilters() {
    setAppliedFilters({
      from: fromDate || undefined,
      to: toDate || undefined,
    });
  }

  function clearFilters() {
    setFromDate("");
    setToDate("");
    setAppliedFilters({});
  }

  const slug = tenant?.slug ?? "";

  // ── KPIs ──────────────────────────────────────────────────────────
  const totalCierres = sessions.length;
  const totalCobrado = sessions.reduce((s, r) => s + r.total_collected, 0);
  const conDiferencia = sessions.filter(
    (r) =>
      r.difference !== null &&
      Math.abs(r.difference) > DIFFERENCE_ALERT_THRESHOLD,
  ).length;
  const mayorDiferencia = sessions.reduce(
    (max, r) =>
      r.difference !== null && Math.abs(r.difference) > Math.abs(max)
        ? r.difference
        : max,
    0,
  );

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6" />
            Historial de Cierres
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Consulta y exporta los cierres de caja registrados.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/t/${slug}/cash-register/close`}>Nuevo cierre</Link>
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Sucursal */}
            <div className="space-y-1.5 min-w-[180px]">
              <Label>Sucursal</Label>
              {loadingBranches ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select
                  value={selectedBranchId}
                  onValueChange={setSelectedBranchId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Desde */}
            <div className="space-y-1.5">
              <Label>Desde</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-40"
              />
            </div>

            {/* Hasta */}
            <div className="space-y-1.5">
              <Label>Hasta</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-40"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={applyFilters} size="sm">
                Filtrar
              </Button>
              {(appliedFilters.from || appliedFilters.to) && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      {!isLoading && sessions.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-3 w-3" /> Cierres
              </p>
              <p className="text-2xl font-bold mt-1">{totalCierres}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <BarChart3 className="h-3 w-3" /> Total cobrado
              </p>
              <p className="text-2xl font-bold mt-1">
                {totalCobrado.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">multi-moneda</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Con diferencia
              </p>
              <p
                className={`text-2xl font-bold mt-1 ${conDiferencia > 0 ? "text-destructive" : "text-green-600"}`}
              >
                {conDiferencia}
              </p>
              <p className="text-xs text-muted-foreground">
                de {totalCierres} cierres
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Mayor diferencia</p>
              <p
                className={`text-2xl font-bold mt-1 ${Math.abs(mayorDiferencia) > DIFFERENCE_ALERT_THRESHOLD ? "text-destructive" : "text-green-600"}`}
              >
                {mayorDiferencia >= 0 ? "+" : ""}
                {mayorDiferencia.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerta diferencia alta */}
      {!isLoading && conDiferencia > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {conDiferencia} cierre(s) con diferencia de efectivo superior a{" "}
            {DIFFERENCE_ALERT_THRESHOLD} unidad(es). Revisa los reportes
            individuales.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabla */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cierres registrados</CardTitle>
          {(appliedFilters.from || appliedFilters.to) && (
            <CardDescription>
              {appliedFilters.from && `Desde ${appliedFilters.from}`}
              {appliedFilters.from && appliedFilters.to && " — "}
              {appliedFilters.to && `Hasta ${appliedFilters.to}`}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {["a", "b", "c"].map((k) => (
                <Skeleton key={k} className="h-10 w-full" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No hay cierres registrados para los filtros seleccionados.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Apertura</TableHead>
                  <TableHead>Cierre</TableHead>
                  <TableHead>Caja</TableHead>
                  <TableHead>Operador</TableHead>
                  <TableHead className="text-right">Total cobrado</TableHead>
                  <TableHead className="text-center">Diferencia</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => (
                  <SessionRow
                    key={s.id}
                    session={s}
                    slug={slug}
                    threshold={DIFFERENCE_ALERT_THRESHOLD}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SessionRow({
  session: s,
  slug,
  threshold,
}: {
  session: EnrichedSession;
  slug: string;
  threshold: number;
}) {
  const hasDiffAlert =
    s.difference !== null && Math.abs(s.difference) > threshold;

  return (
    <TableRow className={hasDiffAlert ? "bg-red-50/50" : undefined}>
      <TableCell className="text-sm">
        {s.opened_at ? fmtDate(s.opened_at) : "—"}
      </TableCell>
      <TableCell className="text-sm">
        {s.closed_at ? fmtDate(s.closed_at) : "—"}
      </TableCell>
      <TableCell className="text-sm">
        <span className="font-medium">{s.register_name}</span>
        <span className="text-muted-foreground ml-1 text-xs">
          ({s.register_currency})
        </span>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {s.opened_by_name}
        {s.closed_by_name && s.closed_by_name !== s.opened_by_name && (
          <span className="block text-xs">Cerrado: {s.closed_by_name}</span>
        )}
      </TableCell>
      <TableCell className="text-right font-medium tabular-nums">
        {s.total_collected > 0 ? (
          <>
            {s.total_collected.toFixed(2)}
            {s.currencies.length > 0 && (
              <span className="text-xs text-muted-foreground ml-1">
                ({s.currencies.join("/")})
              </span>
            )}
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-center">
        <DiffBadge diff={s.difference} />
      </TableCell>
      <TableCell>
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link href={`/t/${slug}/cash-register/closures/${s.id}`}>
            Ver <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}
