// src/app/t/[tenant]/orders/nueva/page.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { OrderItemsEditor } from "@/components/orders";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useActiveBranches } from "@/hooks/supabase/use-branches";
import { type Order, ordersService } from "@/lib/services/orders";
import { useAuthStore } from "@/lib/stores/auth-store";

const formSchema = z.object({
  branch_id: z.string().min(1, "Selecciona una sucursal"),
  currency_code: z.string().min(1, "Selecciona una moneda"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const CURRENCIES = [
  { code: "USD", label: "Dólar (USD)" },
  { code: "VES", label: "Bolívar (VES)" },
  { code: "COP", label: "Peso colombiano (COP)" },
];

export default function NuevaComandaPage() {
  const router = useRouter();
  const { tenant: tenantSlug } = useParams<{ tenant: string }>();
  const { tenant, tenantUser } = useAuthStore();
  const { branches, isLoading: loadingBranches } = useActiveBranches(
    tenant?.id ?? null,
  );

  const [order, setOrder] = useState<Order | null>(null);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { currency_code: "USD" },
  });

  const selectedCurrency = watch("currency_code") || "USD";

  async function onCreateOrder(values: FormValues) {
    if (!tenant?.id || !tenantUser?.auth_user_id) return;
    setCreating(true);
    try {
      const created = await ordersService.createOrder({
        tenant_id: tenant.id,
        branch_id: values.branch_id,
        specialist_id: tenantUser.auth_user_id,
        currency_code: values.currency_code,
        notes: values.notes || null,
      });
      setOrder(created);
      toast.success("Comanda creada — ahora agrega los ítems");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al crear comanda",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleSend() {
    if (!order) return;
    setSending(true);
    try {
      await ordersService.sendOrder(order.id);
      toast.success("¡Comanda enviada a caja!");
      router.push(`/t/${tenantSlug}/orders`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al enviar comanda",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/t/${tenantSlug}/orders`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Nueva comanda</h1>
          <p className="text-sm text-muted-foreground">
            {order
              ? `ID: ${order.id.slice(0, 8)}...`
              : "Configura la comanda antes de agregar ítems"}
          </p>
        </div>
      </div>

      {/* Paso 1: configuración inicial */}
      {!order ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuración inicial</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onCreateOrder)} className="space-y-4">
              {/* Sucursal */}
              <div className="space-y-1.5">
                <Label>Sucursal</Label>
                <Select
                  onValueChange={(v) => setValue("branch_id", v)}
                  disabled={loadingBranches}
                >
                  <SelectTrigger>
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
                {errors.branch_id && (
                  <p className="text-xs text-destructive">
                    {errors.branch_id.message}
                  </p>
                )}
              </div>

              {/* Moneda */}
              <div className="space-y-1.5">
                <Label>Moneda de cobro</Label>
                <Select
                  defaultValue="USD"
                  onValueChange={(v) => setValue("currency_code", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Notas */}
              <div className="space-y-1.5">
                <Label>Notas (opcional)</Label>
                <Textarea
                  {...register("notes")}
                  placeholder="Observaciones generales de la comanda"
                  rows={2}
                />
              </div>

              <Button type="submit" className="w-full" disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Crear comanda
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        /* Paso 2: agregar ítems */
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ítems de la comanda</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderItemsEditor
              orderId={order.id}
              currencyCode={selectedCurrency}
              items={[]}
              onItemAdded={() => {}}
              onItemRemoved={() => {}}
            />
          </CardContent>
        </Card>
      )}

      {/* Botón enviar a caja (solo cuando hay orden creada) */}
      {order && (
        <Button
          className="w-full"
          size="lg"
          onClick={handleSend}
          disabled={sending}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Enviar a caja
        </Button>
      )}
    </div>
  );
}
