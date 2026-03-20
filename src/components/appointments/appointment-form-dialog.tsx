// src/components/appointments/appointment-form-dialog.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CreditCard,
  Landmark,
  Loader2,
  Smartphone,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCashRegistersByBranch } from "@/hooks/supabase/use-cash-registers";
import { useActiveServices } from "@/hooks/supabase/use-services";
import {
  APPOINTMENT_STATUS,
  type AppointmentWithRelations,
  appointmentsService,
  type CreateAppointmentData,
} from "@/lib/services/appointments";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { Tables } from "@/types";

type Customer = Tables["customers"]["Row"];

// Métodos de pago disponibles para el anticipo
const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo", icon: Wallet },
  { value: "card", label: "Tarjeta", icon: CreditCard },
  { value: "transfer", label: "Transferencia", icon: Landmark },
  { value: "mobile_payment", label: "Pago móvil", icon: Smartphone },
] as const;

interface Specialist {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  email?: string | null;
}

interface AppointmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Datos prellenados al clickear un slot */
  prefill?: {
    specialistId?: string;
    date?: string;
    hour?: number;
    minute?: number;
  };
  /** Cita existente para editar */
  appointment?: AppointmentWithRelations | null;
  /** Especialistas activos de la sucursal */
  specialists: Specialist[];
  /** Clientes disponibles */
  customers: Customer[];
  /** Branch activo */
  branchId: string;
  /** Callback al guardar */
  onSaved?: () => void;
}

const appointmentSchema = z.object({
  customer_id: z.string().min(1, "Selecciona un cliente"),
  specialist_id: z.string().min(1, "Selecciona un especialista"),
  service_id: z.string().min(1, "Selecciona un servicio"),
  date: z.string().min(1, "Selecciona una fecha"),
  start_time: z.string().min(1, "Selecciona la hora de inicio"),
  notes: z.string().optional().nullable(),
  status: z.string(),
});

type FormData = z.infer<typeof appointmentSchema>;

export function AppointmentFormDialog({
  open,
  onOpenChange,
  prefill,
  appointment,
  specialists,
  customers,
  branchId,
  onSaved,
}: AppointmentFormDialogProps) {
  const { tenant } = useAuthStore();
  const tenantId = tenant?.id || "";
  const { services } = useActiveServices(tenantId || null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado de la sección de anticipo (solo para nuevas citas)
  const [advanceEnabled, setAdvanceEnabled] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [advanceCashRegisterId, setAdvanceCashRegisterId] = useState("");
  const [advancePaymentMethod, setAdvancePaymentMethod] = useState("");

  // Cajas registradoras de la sucursal activa
  const { cashRegisters, isLoading: loadingCashRegisters } =
    useCashRegistersByBranch(branchId || null);

  const isEditing = !!appointment;

  // Extraer fecha directamente del string ISO para evitar desplazamiento por zona horaria
  const defaultDate =
    prefill?.date ||
    (appointment?.scheduled_at
      ? appointment.scheduled_at.slice(0, 10)
      : new Date().toISOString().slice(0, 10));

  // Helper para obtener formato HH:MM (usa UTC porque la hora se almacena como reloj en UTC)
  const getHourString = (dateStr?: string | null) => {
    if (!dateStr)
      return `${String(new Date().getHours() + 1).padStart(2, "0")}:00`;
    const d = new Date(dateStr);
    return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  };

  const defaultTime =
    prefill?.hour !== undefined
      ? `${String(prefill.hour).padStart(2, "0")}:${String(prefill.minute || 0).padStart(2, "0")}`
      : getHourString(appointment?.scheduled_at);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      customer_id: appointment?.customer_id || "",
      specialist_id: prefill?.specialistId || appointment?.specialist_id || "",
      service_id: appointment?.service_id || "",
      date: defaultDate,
      start_time: defaultTime,
      notes: appointment?.customer_notes || appointment?.internal_notes || "",
      status: (appointment?.status as string) || "confirmed",
    },
  });

  // Reset form cuando cambia la cita o el prefill
  useEffect(() => {
    if (open) {
      reset({
        customer_id: appointment?.customer_id || "",
        specialist_id:
          prefill?.specialistId || appointment?.specialist_id || "",
        service_id: appointment?.service_id || "",
        date: defaultDate,
        start_time: defaultTime,
        notes: appointment?.customer_notes || appointment?.internal_notes || "",
        status: (appointment?.status as string) || "confirmed",
      });
      // Resetear estado de anticipo al abrir
      setAdvanceEnabled(false);
      setAdvanceAmount(0);
      setAdvanceCashRegisterId("");
      setAdvancePaymentMethod("");
    }
  }, [open, appointment, prefill, reset, defaultDate, defaultTime]);

  const watchServiceId = watch("service_id");
  const _watchCustomerId = watch("customer_id");

  // Obtener servicio seleccionado para calcular duración y precio
  const selectedService = services.find((s) => s.id === watchServiceId);

  // Pre-rellenar monto de anticipo cuando cambia el servicio
  useEffect(() => {
    if (selectedService?.base_price && !advanceEnabled) {
      setAdvanceAmount(Number(selectedService.base_price));
    }
  }, [selectedService, advanceEnabled]);

  const onSubmit = async (data: FormData) => {
    if (!tenantId) return;

    // Validar anticipo si está habilitado
    if (advanceEnabled) {
      if (!advanceCashRegisterId) {
        toast.error("Selecciona una caja registradora para el anticipo");
        return;
      }
      if (!advancePaymentMethod) {
        toast.error("Selecciona un método de pago para el anticipo");
        return;
      }
      if (!advanceAmount || advanceAmount <= 0) {
        toast.error("El monto del anticipo debe ser mayor a 0");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const service = services.find((s) => s.id === data.service_id);
      const duration = service?.duration_minutes || 60;

      // Enviar como UTC para mantener consistencia con el almacenamiento
      const startDateTime = `${data.date}T${data.start_time}:00Z`;
      const endTime = appointmentsService.calculateEndTime(
        startDateTime,
        duration,
      );

      // Verificar disponibilidad
      const isAvailable = await appointmentsService.isSpecialistAvailable(
        data.specialist_id,
        startDateTime,
        endTime,
        appointment?.id,
      );

      if (!isAvailable) {
        toast.error("El especialista ya tiene una cita en ese horario");
        setIsSubmitting(false);
        return;
      }

      if (isEditing && appointment) {
        await appointmentsService.updateAppointment(appointment.id, {
          specialist_id: data.specialist_id,
          service_id: data.service_id,
          scheduled_at: startDateTime,
          ends_at: endTime,
          status: data.status,
          customer_notes: data.notes || null,
          estimated_price: service?.base_price || null,
        });
        toast.success("Cita actualizada");
      } else {
        const payload: CreateAppointmentData = {
          tenant_id: tenantId,
          branch_id: branchId,
          customer_id: data.customer_id,
          specialist_id: data.specialist_id,
          service_id: data.service_id,
          scheduled_at: startDateTime,
          ends_at: endTime,
          duration_minutes: duration,
          status: data.status,
          customer_notes: data.notes || null,
          estimated_price: service?.base_price || null,
        };
        const created = await appointmentsService.createAppointment(payload);
        toast.success("Cita creada exitosamente");

        // Registrar anticipo si está habilitado
        if (
          advanceEnabled &&
          advanceCashRegisterId &&
          advancePaymentMethod &&
          advanceAmount > 0
        ) {
          const res = await fetch(`/api/appointments/${created.id}/advance`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cash_register_id: advanceCashRegisterId,
              payment_method: advancePaymentMethod,
              amount: advanceAmount,
            }),
          });
          if (res.ok) {
            const { invoice_number } = await res.json();
            toast.success(`Anticipo registrado — Factura ${invoice_number}`);
          } else {
            const { error } = await res.json();
            toast.error(`Cita creada, pero error en anticipo: ${error}`);
          }
        }

        // Enviar notificaciones (fire-and-forget)
        fetch("/api/appointments/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appointmentId: created.id }),
        }).catch(() => {});
      }

      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Error inesperado";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ¿Mostrar sección de anticipo? Solo en nuevas citas con servicio y precio
  const showAdvanceSection =
    !isEditing && !!selectedService && Number(selectedService.base_price) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar cita" : "Nueva cita"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos de la cita"
              : "Completa los datos para agendar una nueva cita"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Cliente */}
          <div className="space-y-2">
            <Label>
              Cliente <span className="text-destructive">*</span>
            </Label>
            <Select
              value={watch("customer_id")}
              onValueChange={(val) => setValue("customer_id", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.customer_id && (
              <p className="text-xs text-destructive">
                {errors.customer_id.message}
              </p>
            )}
          </div>

          {/* Especialista */}
          <div className="space-y-2">
            <Label>
              Especialista <span className="text-destructive">*</span>
            </Label>
            <Select
              value={watch("specialist_id")}
              onValueChange={(val) => setValue("specialist_id", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar especialista" />
              </SelectTrigger>
              <SelectContent>
                {specialists.map((spec) => (
                  <SelectItem key={spec.id} value={spec.id}>
                    {spec.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.specialist_id && (
              <p className="text-xs text-destructive">
                {errors.specialist_id.message}
              </p>
            )}
          </div>

          {/* Servicio */}
          <div className="space-y-2">
            <Label>
              Servicio <span className="text-destructive">*</span>
            </Label>
            <Select
              value={watchServiceId}
              onValueChange={(val) => setValue("service_id", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar servicio" />
              </SelectTrigger>
              <SelectContent>
                {services.map((svc) => (
                  <SelectItem key={svc.id} value={svc.id}>
                    <div className="flex items-center justify-between gap-3 w-full">
                      <span>{svc.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {svc.duration_minutes}min
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedService && (
              <p className="text-xs text-muted-foreground">
                Duración: {selectedService.duration_minutes} min
                {" · "}
                Precio: ${Number(selectedService.base_price).toFixed(2)}
              </p>
            )}
            {errors.service_id && (
              <p className="text-xs text-destructive">
                {errors.service_id.message}
              </p>
            )}
          </div>

          {/* Fecha y hora */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Fecha <span className="text-destructive">*</span>
              </Label>
              <Input type="date" {...register("date")} />
              {errors.date && (
                <p className="text-xs text-destructive">
                  {errors.date.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>
                Hora inicio <span className="text-destructive">*</span>
              </Label>
              <Input type="time" step="900" {...register("start_time")} />
              {errors.start_time && (
                <p className="text-xs text-destructive">
                  {errors.start_time.message}
                </p>
              )}
            </div>
          </div>

          {/* Estado (solo al editar) */}
          {isEditing && (
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={watch("status")}
                onValueChange={(val) => setValue("status", val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_STATUS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor: s.color,
                          }}
                        />
                        {s.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notas */}
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              placeholder="Notas opcionales sobre la cita..."
              rows={2}
              {...register("notes")}
            />
          </div>

          {/* ──────────────────────────────────────────────────── */}
          {/* Sección de anticipo (solo en nuevas citas con precio) */}
          {/* ──────────────────────────────────────────────────── */}
          {showAdvanceSection && (
            <>
              <Separator />
              <div className="space-y-3">
                {/* Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Registrar anticipo</p>
                    <p className="text-xs text-muted-foreground">
                      Cobra un pago parcial ahora al confirmar la cita
                    </p>
                  </div>
                  <Switch
                    checked={advanceEnabled}
                    onCheckedChange={setAdvanceEnabled}
                  />
                </div>

                {advanceEnabled && (
                  <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                    {/* Monto */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Monto del anticipo</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          $
                        </span>
                        <Input
                          type="number"
                          min={0.01}
                          step={0.01}
                          max={Number(selectedService?.base_price)}
                          value={advanceAmount}
                          onChange={(e) =>
                            setAdvanceAmount(Number(e.target.value))
                          }
                          className="pl-7"
                          placeholder="0.00"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Precio del servicio: $
                        {Number(selectedService?.base_price).toFixed(2)}
                      </p>
                    </div>

                    {/* Caja registradora */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Caja registradora</Label>
                      {loadingCashRegisters ? (
                        <Skeleton className="h-9 w-full" />
                      ) : cashRegisters.length === 0 ? (
                        <p className="text-xs text-destructive">
                          No hay cajas activas para esta sucursal.
                        </p>
                      ) : (
                        <Select
                          value={advanceCashRegisterId}
                          onValueChange={setAdvanceCashRegisterId}
                        >
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

                    {/* Método de pago */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Método de pago</Label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setAdvancePaymentMethod(value)}
                            className={`flex items-center gap-2 rounded-md border p-2 text-xs transition-colors ${
                              advancePaymentMethod === value
                                ? "border-primary bg-primary/5 text-primary font-medium"
                                : "border-border hover:bg-muted"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEditing ? "Guardar cambios" : "Agendar cita"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
