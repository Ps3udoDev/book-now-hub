"use client";

import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
// src/components/currencies/exchange-rate-form.tsx
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
import type { Currency, ExchangeRate } from "@/types";

interface ExchangeRateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Moneda base del sistema (ej: USD) */
  baseCurrency: Currency;
  /** Moneda que se está configurando (ej: VES) */
  currency: Currency;
  /** Tasa vigente base → currency (puede ser null si aún no está configurada) */
  existingRate: ExchangeRate | null;
  tenantId: string;
  onSuccess: () => void;
}

/**
 * Modal para configurar o editar la tasa de cambio entre la moneda base y otra moneda.
 * Guarda AMBAS tasas (base→currency y currency→base) en un solo paso.
 * Incluye paso de confirmación antes de guardar.
 */
export function ExchangeRateForm({
  open,
  onOpenChange,
  baseCurrency,
  currency,
  existingRate,
  tenantId,
  onSuccess,
}: ExchangeRateFormProps) {
  // rateValue: cuántas unidades de `currency` equivale 1 unidad de `baseCurrency`
  // Ej: si base=USD y currency=VES → rateValue = 36500 (1 USD = 36,500 VES)
  const [rateValue, setRateValue] = useState(
    existingRate ? String(existingRate.rate) : "",
  );
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [saving, setSaving] = useState(false);

  const parsedRate = parseFloat(rateValue);
  const isValidRate = !Number.isNaN(parsedRate) && parsedRate > 0;
  const inverseRate = isValidRate ? 1 / parsedRate : null;

  function handleCancel() {
    setStep("form");
    setRateValue(existingRate ? String(existingRate.rate) : "");
    onOpenChange(false);
  }

  async function handleConfirm() {
    if (!isValidRate) return;
    setSaving(true);

    try {
      // Guardar tasa directa: base → currency
      const res1 = await fetch("/api/exchange-rates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          from_currency: baseCurrency.code,
          to_currency: currency.code,
          rate: parsedRate,
        }),
      });

      if (!res1.ok) {
        const err = await res1.json();
        throw new Error(err.error || "Error al guardar tasa directa");
      }

      // Guardar tasa inversa: currency → base (automáticamente como 1/rate)
      const res2 = await fetch("/api/exchange-rates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          from_currency: currency.code,
          to_currency: baseCurrency.code,
          rate: inverseRate,
        }),
      });

      if (!res2.ok) {
        const err = await res2.json();
        throw new Error(err.error || "Error al guardar tasa inversa");
      }

      toast.success(
        `Tasa actualizada: 1 ${baseCurrency.code} = ${parsedRate.toLocaleString("es-VE")} ${currency.symbol}`,
      );
      onSuccess();
      onOpenChange(false);
      setStep("form");
    } catch (error) {
      toast.error((error as Error).message || "Error al guardar la tasa");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>Tasa de cambio — {currency.code}</DialogTitle>
              <DialogDescription>
                Define cuántos{" "}
                <strong>
                  {currency.name} ({currency.symbol})
                </strong>{" "}
                equivalen a <strong>1 {baseCurrency.code}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Visualización de la dirección */}
              <div className="flex items-center justify-center gap-3 rounded-lg bg-muted/60 px-4 py-3">
                <span className="text-lg font-bold">1 {baseCurrency.code}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="text-lg font-bold text-primary">
                  ? {currency.symbol}
                </span>
              </div>

              {/* Input de la tasa */}
              <div className="space-y-1.5">
                <Label htmlFor="rate">
                  1 {baseCurrency.code} equivale a cuántos {currency.code}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {currency.symbol}
                  </span>
                  <Input
                    id="rate"
                    type="number"
                    min="0.00000001"
                    step="any"
                    placeholder="36500"
                    className="pl-8"
                    value={rateValue}
                    onChange={(e) => setRateValue(e.target.value)}
                  />
                </div>
              </div>

              {/* Preview de la tasa inversa */}
              {isValidRate && inverseRate && (
                <p className="text-xs text-muted-foreground">
                  Tasa inversa calculada automáticamente:{" "}
                  <strong>
                    1 {currency.symbol} = {baseCurrency.symbol}
                    {inverseRate.toFixed(8)}
                  </strong>
                </p>
              )}

              {existingRate && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Tasa actual:{" "}
                  <strong>
                    {currency.symbol}
                    {existingRate.rate.toLocaleString("es-VE")}
                  </strong>
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button
                onClick={() => setStep("confirm")}
                disabled={!isValidRate}
              >
                Continuar
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Confirmar cambio de tasa</DialogTitle>
              <DialogDescription>
                Esta acción actualizará la tasa de cambio para todos los cobros
                futuros. Los cobros anteriores no se verán afectados.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              {/* Resumen del cambio */}
              <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nueva tasa</span>
                  <span className="font-medium">
                    1 {baseCurrency.code} = {currency.symbol}
                    {parsedRate.toLocaleString("es-VE")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tasa inversa</span>
                  <span className="font-medium">
                    1 {currency.symbol} = {baseCurrency.symbol}
                    {inverseRate?.toFixed(8)}
                  </span>
                </div>
                {existingRate && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tasa anterior</span>
                    <span>
                      {currency.symbol}
                      {existingRate.rate.toLocaleString("es-VE")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setStep("form")}
                disabled={saving}
              >
                Volver
              </Button>
              <Button onClick={handleConfirm} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar y guardar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
