// src/components/orders/pay-order-dialog.tsx
"use client";

import {
  CheckCircle,
  CreditCard,
  Landmark,
  Loader2,
  Minus,
  Plus,
  Printer,
  Smartphone,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { useCashRegistersByBranch } from "@/hooks/supabase/use-cash-registers";
import { type OrderWithItems, ordersService } from "@/lib/services/orders";
import { ReceiptDialog } from "./receipt-dialog";

const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo", icon: Wallet },
  { value: "card", label: "Tarjeta", icon: CreditCard },
  { value: "transfer", label: "Transferencia", icon: Landmark },
  { value: "mobile_payment", label: "Pago móvil", icon: Smartphone },
] as const;

type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

interface SplitEntry {
  id: number;
  payment_method: PaymentMethod | "";
  amount: string;
  reference_number: string;
}

interface PayOrderDialogProps {
  order: OrderWithItems | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentSuccess: (invoiceNumber: string) => void;
}

export function PayOrderDialog({
  order,
  open,
  onOpenChange,
  onPaymentSuccess,
}: PayOrderDialogProps) {
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState<{
    invoiceNumber: string;
    primaryPaymentMethod: string;
  } | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  // Modo split
  const [splitMode, setSplitMode] = useState(false);

  // Modo simple
  const [simpleMethod, setSimpleMethod] = useState<PaymentMethod | "">("");
  const [simpleReference, setSimpleReference] = useState("");
  const [cashReceived, setCashReceived] = useState("");

  // Modo split
  const [splitEntries, setSplitEntries] = useState<SplitEntry[]>([
    { id: 1, payment_method: "", amount: "", reference_number: "" },
    { id: 2, payment_method: "", amount: "", reference_number: "" },
  ]);
  const [cashRegisterId, setCashRegisterId] = useState("");

  const { cashRegisters, isLoading: loadingRegisters } =
    useCashRegistersByBranch(order?.branch_id ?? null);

  if (!order) return null;

  const items = order.items || [];
  const total = items.reduce((sum, i) => sum + i.subtotal, 0);

  // --- Cálculos modo simple ---
  const cashReceivedNum = Number(cashReceived) || 0;
  const vuelto =
    simpleMethod === "cash" && cashReceivedNum > 0
      ? cashReceivedNum - total
      : null;

  // --- Cálculos modo split ---
  const splitTotal = splitEntries.reduce(
    (sum, e) => sum + (Number(e.amount) || 0),
    0,
  );
  const splitRemaining = total - splitTotal;

  function resetState() {
    setSplitMode(false);
    setSimpleMethod("");
    setSimpleReference("");
    setCashReceived("");
    setSplitEntries([
      { id: 1, payment_method: "", amount: "", reference_number: "" },
      { id: 2, payment_method: "", amount: "", reference_number: "" },
    ]);
    setCashRegisterId("");
  }

  function handleClose() {
    if (paid) {
      onPaymentSuccess(paid.invoiceNumber);
    }
    setPaid(null);
    resetState();
    onOpenChange(false);
  }

  // Actualizar una entrada de split
  function updateSplitEntry(
    id: number,
    field: keyof Omit<SplitEntry, "id">,
    value: string,
  ) {
    setSplitEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    );
  }

  function addSplitEntry() {
    setSplitEntries((prev) => [
      ...prev,
      { id: Date.now(), payment_method: "", amount: "", reference_number: "" },
    ]);
  }

  function removeSplitEntry(id: number) {
    if (splitEntries.length <= 2) return;
    setSplitEntries((prev) => prev.filter((e) => e.id !== id));
  }

  async function handlePay() {
    if (!cashRegisterId) {
      toast.error("Selecciona una caja registradora");
      return;
    }

    let payments: Array<{
      payment_method: string;
      amount: number;
      reference_number?: string | null;
    }>;

    if (splitMode) {
      // Validar entradas split
      const active = splitEntries.filter(
        (e) => e.payment_method && Number(e.amount) > 0,
      );
      if (active.length < 2) {
        toast.error("Agrega al menos 2 métodos de pago con montos válidos");
        return;
      }
      if (Math.abs(splitTotal - total) > 0.01) {
        toast.error(
          `La suma (${splitTotal.toFixed(2)}) debe ser igual al total (${total.toFixed(2)})`,
        );
        return;
      }
      payments = active.map((e) => ({
        payment_method: e.payment_method,
        amount: Number(e.amount),
        reference_number: e.reference_number || null,
      }));
    } else {
      if (!simpleMethod) {
        toast.error("Selecciona un método de pago");
        return;
      }
      if (
        simpleMethod === "cash" &&
        cashReceivedNum > 0 &&
        cashReceivedNum < total
      ) {
        toast.error("El monto recibido no cubre el total");
        return;
      }
      payments = [
        {
          payment_method: simpleMethod,
          amount: total,
          reference_number: simpleReference || null,
        },
      ];
    }

    setPaying(true);
    try {
      const { invoice_number } = await ordersService.payOrder(order.id, {
        cash_register_id: cashRegisterId,
        payments,
      });
      toast.success(`Cobro registrado — Factura ${invoice_number}`);
      setPaid({
        invoiceNumber: invoice_number,
        primaryPaymentMethod: payments[0].payment_method,
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al procesar cobro",
      );
    } finally {
      setPaying(false);
    }
  }

  const requiresReference = (method: string) =>
    ["card", "transfer", "mobile_payment"].includes(method);

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          {/* Estado de éxito — después del cobro */}
          {paid ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  Cobro registrado
                </DialogTitle>
                <DialogDescription>
                  Factura{" "}
                  <span className="font-semibold text-foreground">
                    {paid.invoiceNumber}
                  </span>{" "}
                  generada exitosamente.
                </DialogDescription>
              </DialogHeader>

              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1 gap-2"
                  onClick={() => setReceiptOpen(true)}
                >
                  <Printer className="h-4 w-4" />
                  Ver comprobante
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleClose}
                >
                  Cerrar
                </Button>
              </div>
            </>
          ) : (
            /* Estado normal — formulario de cobro */
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Proceder al cobro
                </DialogTitle>
                <DialogDescription>
                  Confirma el método de pago y la caja registradora.
                </DialogDescription>
              </DialogHeader>

              {/* Resumen de la comanda */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Resumen</p>
                <ul className="space-y-1 text-sm">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="flex justify-between text-muted-foreground"
                    >
                      <span className="truncate">
                        {item.quantity}× {item.description}
                      </span>
                      <span className="ml-2 shrink-0">
                        {order.currency_code} {item.subtotal.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-lg">
                    {order.currency_code} {total.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                {/* Caja registradora */}
                <div className="space-y-1.5">
                  <Label>Caja registradora</Label>
                  {loadingRegisters ? (
                    <div className="h-9 rounded-md border bg-muted animate-pulse" />
                  ) : cashRegisters.length === 0 ? (
                    <p className="text-sm text-destructive">
                      No hay cajas activas para esta sucursal.
                    </p>
                  ) : (
                    <Select onValueChange={setCashRegisterId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una caja" />
                      </SelectTrigger>
                      <SelectContent>
                        {cashRegisters.map((cr) => (
                          <SelectItem key={cr.id} value={cr.id}>
                            {cr.name} ({cr.currency_iso})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Toggle modo dividido */}
                <div className="flex items-center justify-between">
                  <Label className="cursor-pointer" htmlFor="split-toggle">
                    Dividir entre varios métodos
                  </Label>
                  <Switch
                    id="split-toggle"
                    checked={splitMode}
                    onCheckedChange={(v) => {
                      setSplitMode(v);
                      setSimpleMethod("");
                      setSimpleReference("");
                      setCashReceived("");
                    }}
                  />
                </div>

                <Separator />

                {splitMode ? (
                  /* ── Modo SPLIT ── */
                  <div className="space-y-3">
                    {splitEntries.map((entry, idx) => (
                      <div
                        key={entry.id}
                        className="space-y-2 rounded-md border p-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">
                            Pago {idx + 1}
                          </span>
                          {splitEntries.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeSplitEntry(entry.id)}
                              className="text-destructive hover:text-destructive/80"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        {/* Método */}
                        <div className="grid grid-cols-2 gap-1.5">
                          {PAYMENT_METHODS.map(
                            ({ value, label, icon: Icon }) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() =>
                                  updateSplitEntry(
                                    entry.id,
                                    "payment_method",
                                    value,
                                  )
                                }
                                className={`flex items-center gap-2 rounded-md border p-2 text-xs transition-colors ${
                                  entry.payment_method === value
                                    ? "border-primary bg-primary/5 text-primary font-medium"
                                    : "border-border hover:bg-muted"
                                }`}
                              >
                                <Icon className="h-3.5 w-3.5 shrink-0" />
                                {label}
                              </button>
                            ),
                          )}
                        </div>

                        {/* Monto */}
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Monto"
                            value={entry.amount}
                            onChange={(e) =>
                              updateSplitEntry(
                                entry.id,
                                "amount",
                                e.target.value,
                              )
                            }
                            className="flex-1"
                          />
                          {requiresReference(entry.payment_method) && (
                            <Input
                              placeholder="Referencia (opc.)"
                              value={entry.reference_number}
                              onChange={(e) =>
                                updateSplitEntry(
                                  entry.id,
                                  "reference_number",
                                  e.target.value,
                                )
                              }
                              className="flex-1"
                            />
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Agregar método */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      onClick={addSplitEntry}
                    >
                      <Plus className="h-4 w-4" />
                      Agregar método de pago
                    </Button>

                    {/* Resumen del split */}
                    <div
                      className={`rounded-md border p-3 text-sm ${
                        Math.abs(splitRemaining) <= 0.01
                          ? "border-green-200 bg-green-50 text-green-700"
                          : "border-border"
                      }`}
                    >
                      <div className="flex justify-between">
                        <span>Suma ingresada</span>
                        <span className="font-medium">
                          {order.currency_code} {splitTotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>
                          {splitRemaining > 0.01
                            ? "Falta"
                            : splitRemaining < -0.01
                              ? "Excede"
                              : "✓ Cubierto"}
                        </span>
                        <span>
                          {Math.abs(splitRemaining) > 0.01
                            ? `${order.currency_code} ${Math.abs(splitRemaining).toFixed(2)}`
                            : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── Modo SIMPLE ── */
                  <div className="space-y-4">
                    {/* Selector de método */}
                    <div className="space-y-1.5">
                      <Label>Método de pago</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => {
                              setSimpleMethod(value);
                              setCashReceived("");
                              setSimpleReference("");
                            }}
                            className={`flex items-center gap-2 rounded-md border p-2.5 text-sm transition-colors ${
                              simpleMethod === value
                                ? "border-primary bg-primary/5 text-primary font-medium"
                                : "border-border hover:bg-muted"
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Monto recibido (efectivo) + vuelto */}
                    {simpleMethod === "cash" && (
                      <div className="space-y-1.5">
                        <Label>Monto recibido</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder={`${order.currency_code} ${total.toFixed(2)}`}
                          value={cashReceived}
                          onChange={(e) => setCashReceived(e.target.value)}
                        />
                        {vuelto !== null && cashReceivedNum > 0 && (
                          <div
                            className={`flex justify-between rounded-md px-3 py-2 text-sm font-medium ${
                              vuelto >= 0
                                ? "bg-green-50 text-green-700"
                                : "bg-destructive/10 text-destructive"
                            }`}
                          >
                            <span>{vuelto >= 0 ? "Vuelto" : "Faltan"}</span>
                            <span>
                              {order.currency_code}{" "}
                              {Math.abs(vuelto).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Número de referencia */}
                    {requiresReference(simpleMethod) && (
                      <div className="space-y-1.5">
                        <Label>
                          Número de referencia
                          <span className="text-muted-foreground ml-1 font-normal">
                            (opcional)
                          </span>
                        </Label>
                        <Input
                          placeholder="Ej: 0001234567"
                          value={simpleReference}
                          onChange={(e) => setSimpleReference(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                )}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={paying}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    disabled={
                      paying ||
                      cashRegisters.length === 0 ||
                      !cashRegisterId ||
                      (splitMode
                        ? Math.abs(splitRemaining) > 0.01
                        : !simpleMethod) ||
                      (simpleMethod === "cash" &&
                        !splitMode &&
                        cashReceivedNum > 0 &&
                        cashReceivedNum < total)
                    }
                    className="gap-2"
                    onClick={handlePay}
                  >
                    {paying && <Loader2 className="h-4 w-4 animate-spin" />}
                    Confirmar cobro
                  </Button>
                </DialogFooter>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Comprobante de pago */}
      {paid && order && (
        <ReceiptDialog
          open={receiptOpen}
          onOpenChange={setReceiptOpen}
          order={order}
          invoiceNumber={paid.invoiceNumber}
          paymentMethod={paid.primaryPaymentMethod}
          paidAt={new Date().toISOString()}
        />
      )}
    </>
  );
}
