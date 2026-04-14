// src/app/t/[tenant]/specialists/[id]/consumos/page.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, Loader2, MinusCircle, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { useConsumptions } from "@/hooks/supabase/use-consumptions";
import { useActiveServices } from "@/hooks/supabase/use-services";
import { useSpecialist } from "@/hooks/supabase/use-specialists";
import { consumptionsService } from "@/lib/services/consumptions";
import { useAuthStore } from "@/lib/stores/auth-store";

const consumptionSchema = z.object({
  description: z.string().min(1, "Descripción requerida"),
  service_id: z.string().optional(),
  quantity: z.coerce.number().min(0.001, "Debe ser mayor a 0"),
  unit_cost: z.coerce.number().min(0, "No puede ser negativo"),
  currency_code: z.string().min(1),
  deduct_from_commission: z.boolean(),
  date: z.string().min(1, "Fecha requerida"),
  notes: z.string().optional(),
});

type ConsumptionForm = z.infer<typeof consumptionSchema>;

const CURRENCIES = ["USD", "VES", "COP"];

export default function ConsumosPage() {
  const { tenant, tenantUser } = useAuthStore();
  const { id: specialistId, tenant: tenantSlug } = useParams<{
    id: string;
    tenant: string;
  }>();

  const tenantId = tenant?.id ?? null;
  const isManager = ["owner", "admin", "manager"].includes(
    tenantUser?.role ?? "",
  );

  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = `${today.slice(0, 7)}-01`;

  const { specialist } = useSpecialist(specialistId);
  const { services } = useActiveServices(tenantId);
  const { consumptions, isLoading, mutate } = useConsumptions(
    tenantId,
    specialistId,
    { from: firstOfMonth },
  );

  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ConsumptionForm>({
    resolver: zodResolver(consumptionSchema) as Resolver<ConsumptionForm>,
    defaultValues: {
      currency_code: "USD",
      deduct_from_commission: true,
      date: today,
      quantity: 1,
      unit_cost: 0,
    },
  });

  const quantity = watch("quantity") || 0;
  const unitCost = watch("unit_cost") || 0;
  const deduct = watch("deduct_from_commission");
  const subtotal = quantity * unitCost;

  // Totales del mes
  const totalCost = consumptions.reduce((s, c) => s + c.total_cost, 0);
  const totalDeductions = consumptions
    .filter((c) => c.deduct_from_commission)
    .reduce((s, c) => s + c.total_cost, 0);

  async function onSubmit(values: ConsumptionForm) {
    if (!tenantId) return;
    try {
      await consumptionsService.create({
        tenant_id: tenantId,
        specialist_id: specialistId,
        description: values.description,
        service_id: values.service_id || null,
        quantity: values.quantity,
        unit_cost: values.unit_cost,
        currency_code: values.currency_code,
        deduct_from_commission: values.deduct_from_commission,
        date: values.date,
        notes: values.notes || null,
      });
      toast.success("Consumo registrado");
      reset({
        currency_code: "USD",
        deduct_from_commission: true,
        date: today,
        quantity: 1,
        unit_cost: 0,
      });
      setShowForm(false);
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar");
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await consumptionsService.delete(id);
      toast.success("Consumo eliminado");
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/t/${tenantSlug}/specialists/${specialistId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Consumos del mes</h1>
          <p className="text-sm text-muted-foreground">
            {specialist?.full_name ?? "Especialista"} ·{" "}
            {format(new Date(firstOfMonth), "MMMM yyyy", { locale: es })}
          </p>
        </div>
      </div>

      {/* KPIs del mes */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-muted-foreground">
              Total consumos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totalCost.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">
              {consumptions.length} registros
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <MinusCircle className="h-3.5 w-3.5 text-destructive" />A
              descontar de comisión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">
              -${totalDeductions.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">
              {consumptions.filter((c) => c.deduct_from_commission).length}{" "}
              conceptos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Formulario agregar consumo */}
      {isManager && (
        <div>
          {showForm ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Nuevo consumo</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Descripción */}
                    <div className="col-span-2 space-y-1">
                      <Label>Material / Producto</Label>
                      <Input
                        {...register("description")}
                        placeholder="Ej: Tinte 100ml, Shampoo keratina..."
                      />
                      {errors.description && (
                        <p className="text-xs text-destructive">
                          {errors.description.message}
                        </p>
                      )}
                    </div>

                    {/* Servicio asociado */}
                    <div className="col-span-2 space-y-1">
                      <Label>Servicio asociado (opcional)</Label>
                      <Select onValueChange={(v) => setValue("service_id", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sin servicio específico" />
                        </SelectTrigger>
                        <SelectContent>
                          {services.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Cantidad */}
                    <div className="space-y-1">
                      <Label>Cantidad</Label>
                      <Input
                        type="number"
                        min="0.001"
                        step="0.001"
                        {...register("quantity")}
                      />
                      {errors.quantity && (
                        <p className="text-xs text-destructive">
                          {errors.quantity.message}
                        </p>
                      )}
                    </div>

                    {/* Costo unitario */}
                    <div className="space-y-1">
                      <Label>Costo unitario</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          {...register("unit_cost")}
                          className="flex-1"
                        />
                        <Select
                          defaultValue="USD"
                          onValueChange={(v) => setValue("currency_code", v)}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCIES.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Fecha */}
                    <div className="space-y-1">
                      <Label>Fecha</Label>
                      <Input type="date" {...register("date")} />
                    </div>

                    {/* Subtotal */}
                    <div className="flex items-end pb-1">
                      <p className="text-sm text-muted-foreground">
                        Subtotal:{" "}
                        <span className="font-semibold text-foreground">
                          ${subtotal.toFixed(2)}
                        </span>
                      </p>
                    </div>

                    {/* Descontar de comisión */}
                    <div className="col-span-2 flex items-center gap-2">
                      <Checkbox
                        id="deduct"
                        checked={deduct}
                        onCheckedChange={(v) =>
                          setValue("deduct_from_commission", Boolean(v))
                        }
                      />
                      <Label
                        htmlFor="deduct"
                        className="cursor-pointer font-normal"
                      >
                        Descontar del neto de comisión
                      </Label>
                    </div>

                    {/* Notas */}
                    <div className="col-span-2 space-y-1">
                      <Label>Notas (opcional)</Label>
                      <Textarea
                        {...register("notes")}
                        rows={2}
                        placeholder="Observaciones..."
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      {isSubmitting && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Registrar consumo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForm(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Button
              onClick={() => setShowForm(true)}
              variant="outline"
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Registrar consumo
            </Button>
          )}
        </div>
      )}

      {/* Lista de consumos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Consumos del mes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : consumptions.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Sin consumos registrados este mes
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Descuento</TableHead>
                  {isManager && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {consumptions.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(c.date), "dd MMM", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{c.description}</p>
                      {c.service && (
                        <p className="text-xs text-muted-foreground">
                          {c.service.name}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.quantity} × {c.currency_code} {c.unit_cost.toFixed(2)}
                    </TableCell>
                    <TableCell className="font-semibold text-sm">
                      {c.currency_code} {c.total_cost.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {c.deduct_from_commission ? (
                        <Badge variant="destructive" className="text-xs">
                          Descuenta
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          No descuenta
                        </Badge>
                      )}
                    </TableCell>
                    {isManager && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDelete(c.id)}
                          disabled={deletingId === c.id}
                        >
                          {deletingId === c.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
