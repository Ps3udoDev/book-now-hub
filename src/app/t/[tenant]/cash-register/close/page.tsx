// src/app/t/[tenant]/cash-register/close/page.tsx
"use client";

import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  CreditCard,
  DollarSign,
  Landmark,
  Loader2,
  MinusCircle,
  PlusCircle,
  Smartphone,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useActiveBranches } from "@/hooks/supabase/use-branches";
import {
  useActiveSession,
  useSessionMovements,
  useSessionSummary,
} from "@/hooks/supabase/use-cash-sessions";
import type {
  CashMovementData,
  SummaryRow,
} from "@/lib/services/cash-sessions";
import { cashSessionsService } from "@/lib/services/cash-sessions";
import { useAuthStore } from "@/lib/stores/auth-store";

const AREA_LABELS: Record<string, string> = {
  service: "Servicios",
  product: "Productos",
  cafeteria: "Cafetería",
  total: "TOTAL",
};

const METHOD_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  total_cash: Wallet,
  total_card: CreditCard,
  total_transfer: Landmark,
  total_mobile_payment: Smartphone,
};

const METHOD_LABELS: Record<string, string> = {
  total_cash: "Efectivo",
  total_card: "Tarjeta",
  total_transfer: "Transferencia",
  total_mobile_payment: "Pago móvil",
  total_gateway: "Pasarela",
};

function fmt(n: number, currency?: string) {
  const str = n.toFixed(2);
  return currency ? `${currency} ${str}` : str;
}

// ─────────────────────────────────────────────────────────────────────
// Subcomponente: tabla de resumen por área
// ─────────────────────────────────────────────────────────────────────
function SummaryTable({
  rows,
  currency,
}: {
  rows: SummaryRow[];
  currency: string;
}) {
  const [openAreas, setOpenAreas] = useState<Record<string, boolean>>({
    service: true,
  });
  const filtered = rows.filter((r) => r.currency_code === currency);
  const totalRow = filtered.find((r) => r.area === "total");
  const areaRows = filtered.filter((r) => r.area !== "total");

  const methodKeys = (
    [
      "total_cash",
      "total_card",
      "total_transfer",
      "total_mobile_payment",
      "total_gateway",
    ] as const
  ).filter((k) => filtered.some((r) => r[k] > 0));

  if (filtered.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        Sin cobros en esta moneda.
      </p>
    );

  return (
    <div className="space-y-2">
      {areaRows.map((row) => (
        <Collapsible
          key={row.area}
          open={openAreas[row.area]}
          onOpenChange={(v) => setOpenAreas((p) => ({ ...p, [row.area]: v }))}
        >
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              <span>{AREA_LABELS[row.area] ?? row.area}</span>
              <div className="flex items-center gap-3">
                <span className="font-semibold tabular-nums">
                  {fmt(row.total_amount)}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {row.transaction_count} tx
                </Badge>
                {openAreas[row.area] ? (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-1 rounded-md border bg-muted/20 px-3 py-2 space-y-1">
              {methodKeys.map((k) => {
                const val = row[k];
                if (val <= 0) return null;
                const Icon = METHOD_ICONS[k] ?? DollarSign;
                return (
                  <div
                    key={k}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" />
                      {METHOD_LABELS[k]}
                    </span>
                    <span className="tabular-nums">{fmt(val)}</span>
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}

      {totalRow && (
        <>
          <Separator />
          <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2.5">
            <div className="flex justify-between font-bold text-sm mb-1.5">
              <span>TOTAL</span>
              <span className="tabular-nums text-base">
                {currency} {fmt(totalRow.total_amount)}
              </span>
            </div>
            <div className="space-y-1">
              {methodKeys.map((k) => {
                const val = totalRow[k];
                if (val <= 0) return null;
                const Icon = METHOD_ICONS[k] ?? DollarSign;
                return (
                  <div
                    key={k}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Icon className="h-3 w-3" />
                      {METHOD_LABELS[k]}
                    </span>
                    <span className="font-medium tabular-nums">{fmt(val)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────────────
export default function CierreCajaPage() {
  const router = useRouter();
  const { tenant } = useAuthStore();
  const { branches, isLoading: loadingBranches } = useActiveBranches(
    tenant?.id ?? null,
  );

  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closedSessionId, setClosedSessionId] = useState<string | null>(null);

  // Estado del formulario de egreso/ingreso
  const [movementFormOpen, setMovementFormOpen] = useState(false);
  const [movType, setMovType] = useState<"expense" | "income">("expense");
  const [movAmount, setMovAmount] = useState("");
  const [movDescription, setMovDescription] = useState("");
  const [savingMov, setSavingMov] = useState(false);

  const {
    activeSession,
    isLoading: loadingSession,
    mutate: mutateSession,
  } = useActiveSession(selectedBranchId || null);

  const {
    summary,
    isLoading: loadingSummary,
    mutate: mutateSummary,
  } = useSessionSummary(activeSession?.id ?? null);

  const { movements, mutate: mutateMovements } = useSessionMovements(
    activeSession?.id ?? null,
  );

  // Refrescar resumen cada 30 s
  useEffect(() => {
    if (!activeSession) return;
    const id = setInterval(() => {
      mutateSummary();
      mutateMovements();
    }, 30000);
    return () => clearInterval(id);
  }, [activeSession, mutateSummary, mutateMovements]);

  // Pre-seleccionar primera sucursal
  useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  // Monedas presentes en el resumen
  const currencies = [...new Set(summary.map((r) => r.currency_code))].sort();

  const closingAmountNum = Number(closingAmount) || null;
  const totalEgresos = movements
    .filter((m) => m.movement_type === "expense")
    .reduce((sum, m) => sum + Number(m.amount), 0);

  async function handleSaveMovement() {
    if (!activeSession) return;
    if (!movAmount || Number(movAmount) <= 0) {
      toast.error("Ingresa un monto mayor a 0");
      return;
    }
    if (!movDescription.trim()) {
      toast.error("La descripción es obligatoria");
      return;
    }
    setSavingMov(true);
    try {
      const data: CashMovementData = {
        movement_type: movType,
        amount: Number(movAmount),
        description: movDescription.trim(),
      };
      await cashSessionsService.createSessionMovement(activeSession.id, data);
      await Promise.all([mutateSummary(), mutateMovements()]);
      setMovAmount("");
      setMovDescription("");
      setMovementFormOpen(false);
      toast.success(
        movType === "expense" ? "Egreso registrado" : "Ingreso registrado",
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al registrar movimiento",
      );
    } finally {
      setSavingMov(false);
    }
  }

  async function handleClose() {
    if (!activeSession) return;
    setClosing(true);
    try {
      const result = await cashSessionsService.closeSession(activeSession.id, {
        closing_amount: closingAmountNum,
        notes: notes || null,
      });
      await mutateSession();
      setConfirmOpen(false);
      toast.success("Caja cerrada exitosamente");
      // Redirigir al reporte de cierre donde se muestra la auditoría completa
      const sid = result?.session?.id ?? activeSession.id;
      setClosedSessionId(sid);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al cerrar la caja",
      );
    } finally {
      setClosing(false);
    }
  }

  const slug = tenant?.slug ?? "";

  if (closedSessionId) {
    return (
      <div className="container max-w-lg py-10">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Caja cerrada
            </CardTitle>
            <CardDescription>
              El cierre se registró correctamente. Revisa el reporte completo
              con la auditoría de efectivo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              className="w-full"
              onClick={() =>
                router.push(
                  `/t/${slug}/cash-register/closures/${closedSessionId}`,
                )
              }
            >
              Ver reporte de cierre
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push(`/t/${slug}/cash-register`)}
            >
              Volver a Caja
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cierre de Caja</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Revisa el resumen del turno y registra el efectivo contado.
        </p>
      </div>

      {/* Selector de sucursal */}
      <div className="space-y-1.5">
        <Label>Sucursal</Label>
        {loadingBranches ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder="Selecciona sucursal" />
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

      {/* Sin sesión activa */}
      {!loadingSession && selectedBranchId && !activeSession && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No hay una sesión de caja abierta para esta sucursal.{" "}
            <button
              type="button"
              className="underline font-medium"
              onClick={() => router.push(`/t/${slug}/cash-register/open`)}
            >
              Abrir caja
            </button>
          </AlertDescription>
        </Alert>
      )}

      {activeSession && (
        <>
          {/* Info de la sesión */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Sesión activa</CardTitle>
                <Badge className="bg-green-100 text-green-700 border-green-200">
                  Abierta
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Abierta el</span>
                <span>
                  {new Date(activeSession.opened_at).toLocaleString("es-VE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fondo inicial</span>
                <span>{Number(activeSession.opening_amount).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Resumen de cobros */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resumen de cobros</CardTitle>
              <CardDescription>
                Totales de la sesión por área y método de pago.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingSummary ? (
                <div className="space-y-2">
                  {["a", "b", "c"].map((k) => (
                    <Skeleton key={k} className="h-10 w-full" />
                  ))}
                </div>
              ) : summary.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin cobros registrados en esta sesión.
                </p>
              ) : (
                currencies.map((cur) => (
                  <div key={cur}>
                    {currencies.length > 1 && (
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Moneda: {cur}
                      </p>
                    )}
                    <SummaryTable rows={summary} currency={cur} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Movimientos de caja (egresos/ingresos) */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    Movimientos de caja
                  </CardTitle>
                  <CardDescription>
                    Egresos e ingresos manuales durante la sesión.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setMovementFormOpen((v) => !v)}
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Registrar egreso
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Formulario de movimiento */}
              {movementFormOpen && (
                <div className="rounded-md border bg-muted/20 p-3 space-y-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMovType("expense")}
                      className={`flex-1 flex items-center justify-center gap-1.5 rounded-md border py-1.5 text-sm font-medium transition-colors ${
                        movType === "expense"
                          ? "border-destructive bg-destructive/10 text-destructive"
                          : "hover:bg-muted"
                      }`}
                    >
                      <MinusCircle className="h-3.5 w-3.5" />
                      Egreso
                    </button>
                    <button
                      type="button"
                      onClick={() => setMovType("income")}
                      className={`flex-1 flex items-center justify-center gap-1.5 rounded-md border py-1.5 text-sm font-medium transition-colors ${
                        movType === "income"
                          ? "border-green-600 bg-green-50 text-green-700"
                          : "hover:bg-muted"
                      }`}
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      Ingreso
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Monto</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={movAmount}
                        onChange={(e) => setMovAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Descripción</Label>
                      <Input
                        placeholder="Ej: Compra de papel"
                        value={movDescription}
                        onChange={(e) => setMovDescription(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setMovementFormOpen(false);
                        setMovAmount("");
                        setMovDescription("");
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveMovement}
                      disabled={savingMov}
                      className="gap-1.5"
                    >
                      {savingMov && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      )}
                      Guardar
                    </Button>
                  </div>
                </div>
              )}

              {/* Lista de movimientos */}
              {movements.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin movimientos registrados.
                </p>
              ) : (
                <div className="space-y-1">
                  {movements.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between text-sm py-1"
                    >
                      <div className="flex items-center gap-2">
                        {m.movement_type === "expense" ? (
                          <MinusCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                        ) : (
                          <PlusCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
                        )}
                        <span className="text-muted-foreground">
                          {m.description}
                        </span>
                      </div>
                      <span
                        className={`font-medium tabular-nums ${
                          m.movement_type === "expense"
                            ? "text-destructive"
                            : "text-green-600"
                        }`}
                      >
                        {m.movement_type === "expense" ? "-" : "+"}
                        {Number(m.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <Separator className="mt-1" />
                  <div className="flex justify-between text-sm font-medium pt-1">
                    <span className="text-muted-foreground">Total egresos</span>
                    <span className="text-destructive tabular-nums">
                      -{totalEgresos.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conteo de efectivo (sin mostrar el monto esperado por auditoría) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Conteo de efectivo</CardTitle>
              <CardDescription>
                Cuenta el efectivo físico en caja e ingresa el monto total. El
                resultado de la conciliación se mostrará en el reporte de
                cierre.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Efectivo contado</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-9"
                    value={closingAmount}
                    onChange={(e) => setClosingAmount(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label>
              Observaciones{" "}
              <span className="text-muted-foreground font-normal">
                (opcional)
              </span>
            </Label>
            <Textarea
              placeholder="Notas del cierre..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button
            className="w-full gap-2"
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
          >
            Cerrar caja
          </Button>
        </>
      )}

      {/* Diálogo de confirmación */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Confirmar cierre de caja?</DialogTitle>
            <DialogDescription>
              Esta acción cerrará la sesión activa. No podrás registrar cobros
              hasta abrir una nueva sesión. El resultado de la conciliación se
              mostrará en el reporte de cierre.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={closing}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleClose}
              disabled={closing}
              className="gap-2"
            >
              {closing && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar cierre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
