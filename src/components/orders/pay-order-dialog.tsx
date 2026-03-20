// src/components/orders/pay-order-dialog.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle,
  CreditCard,
  Landmark,
  Loader2,
  Smartphone,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
import { useCashRegistersByBranch } from "@/hooks/supabase/use-cash-registers";
import { type OrderWithItems, ordersService } from "@/lib/services/orders";

const paySchema = z.object({
  cash_register_id: z.string().min(1, "Selecciona una caja registradora"),
  payment_method: z.string().min(1, "Selecciona un método de pago"),
  reference_number: z.string().optional(),
});

type PayForm = z.infer<typeof paySchema>;

const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo", icon: Wallet },
  { value: "card", label: "Tarjeta", icon: CreditCard },
  { value: "transfer", label: "Transferencia", icon: Landmark },
  { value: "mobile_payment", label: "Pago móvil", icon: Smartphone },
];

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
  const { cashRegisters, isLoading: loadingRegisters } =
    useCashRegistersByBranch(order?.branch_id ?? null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PayForm>({ resolver: zodResolver(paySchema) });

  const selectedMethod = watch("payment_method");
  const requiresReference = ["card", "transfer", "mobile_payment"].includes(
    selectedMethod,
  );

  if (!order) return null;

  const items = order.items || [];
  const total = items.reduce((sum, i) => sum + i.subtotal, 0);

  async function onSubmit(values: PayForm) {
    if (!order) return;
    setPaying(true);
    try {
      const { invoice_number } = await ordersService.payOrder(order.id, {
        cash_register_id: values.cash_register_id,
        payment_method: values.payment_method,
        reference_number: values.reference_number || undefined,
      });
      toast.success(`Cobro registrado — Factura ${invoice_number}`);
      reset();
      onPaymentSuccess(invoice_number);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al procesar cobro",
      );
    } finally {
      setPaying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
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
              <Select onValueChange={(v) => setValue("cash_register_id", v)}>
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
            {errors.cash_register_id && (
              <p className="text-xs text-destructive">
                {errors.cash_register_id.message}
              </p>
            )}
          </div>

          {/* Método de pago */}
          <div className="space-y-1.5">
            <Label>Método de pago</Label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue("payment_method", value)}
                  className={`flex items-center gap-2 rounded-md border p-2.5 text-sm transition-colors ${
                    selectedMethod === value
                      ? "border-primary bg-primary/5 text-primary font-medium"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </button>
              ))}
            </div>
            {errors.payment_method && (
              <p className="text-xs text-destructive">
                {errors.payment_method.message}
              </p>
            )}
          </div>

          {/* Número de referencia (para pagos no efectivo) */}
          {requiresReference && (
            <div className="space-y-1.5">
              <Label>
                Número de referencia
                <span className="text-muted-foreground ml-1 font-normal">
                  (opcional)
                </span>
              </Label>
              <Input
                {...register("reference_number")}
                placeholder="Ej: 0001234567"
              />
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
              type="submit"
              disabled={paying || cashRegisters.length === 0}
              className="gap-2"
            >
              {paying && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar cobro
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
