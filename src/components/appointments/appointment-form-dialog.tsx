// src/components/appointments/appointment-form-dialog.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    Loader2,
    Calendar,
    Clock,
    User,
    Scissors,
    Search,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Removing Command and Popover imports as they are missing in the project
// import { Command, ... } from "@/components/ui/command";
// import { Popover, ... } from "@/components/ui/popover";

import {
    appointmentsService,
    APPOINTMENT_STATUS,
    type AppointmentWithRelations,
    type CreateAppointmentData,
} from "@/lib/services/appointments";
import { useActiveServices } from "@/hooks/supabase/use-services";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { Tables } from "@/types";

type Customer = Tables["customers"]["Row"];

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
    const [customerSearch, setCustomerSearch] = useState("");
    const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);

    const isEditing = !!appointment;

    // Hora default: la del prefill o la hora siguiente
    // Extraer fecha directamente del string ISO para evitar desplazamiento por zona horaria
    const defaultDate =
        prefill?.date || (appointment?.scheduled_at ? appointment.scheduled_at.slice(0, 10) : new Date().toISOString().slice(0, 10));

    // Helper para obtener formato HH:MM (usa UTC porque la hora se almacena como reloj en UTC)
    const getHourString = (dateStr?: string | null) => {
        if (!dateStr) return `${String(new Date().getHours() + 1).padStart(2, "0")}:00`;
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
                specialist_id: prefill?.specialistId || appointment?.specialist_id || "",
                service_id: appointment?.service_id || "",
                date: defaultDate,
                start_time: defaultTime,
                notes: appointment?.customer_notes || appointment?.internal_notes || "",
                status: (appointment?.status as string) || "confirmed",
            });
        }
    }, [open, appointment, prefill, reset, defaultDate, defaultTime]);

    const watchServiceId = watch("service_id");
    const watchCustomerId = watch("customer_id");

    // Obtener servicio seleccionado para calcular duración
    const selectedService = services.find((s) => s.id === watchServiceId);
    const selectedCustomer = customers.find((c) => c.id === watchCustomerId);

    // Filtrar clientes por búsqueda
    const filteredCustomers = customers.filter((c) => {
        const searchLower = customerSearch.toLowerCase();
        return (
            c.first_name?.toLowerCase().includes(searchLower) ||
            c.last_name?.toLowerCase().includes(searchLower) ||
            c.email?.toLowerCase().includes(searchLower) ||
            c.phone?.includes(customerSearch)
        );
    });

    const onSubmit = async (data: FormData) => {
        if (!tenantId) return;

        setIsSubmitting(true);
        try {
            const service = services.find((s) => s.id === data.service_id);
            const duration = service?.duration_minutes || 60;

            // Enviar como UTC para mantener consistencia con el almacenamiento
            const startDateTime = `${data.date}T${data.start_time}:00Z`;
            const endTime = appointmentsService.calculateEndTime(startDateTime, duration);

            // Verificar disponibilidad
            const isAvailable = await appointmentsService.isSpecialistAvailable(
                data.specialist_id,
                startDateTime,
                endTime,
                appointment?.id
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

                // Enviar notificaciones (fire-and-forget)
                console.log("selectedCustomer", selectedCustomer);

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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? "Editar cita" : "Nueva cita"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Modifica los datos de la cita"
                            : "Completa los datos para agendar una nueva cita"}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                    {/* Cliente (Select simple por falta de componentes Command) */}
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
                            <p className="text-xs text-destructive">{errors.customer_id.message}</p>
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
                            <p className="text-xs text-destructive">{errors.specialist_id.message}</p>
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
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>Duración: {selectedService.duration_minutes} min</span>
                                <span>•</span>
                                <span>Precio: ${selectedService.base_price}</span>
                            </div>
                        )}
                        {errors.service_id && (
                            <p className="text-xs text-destructive">{errors.service_id.message}</p>
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
                                <p className="text-xs text-destructive">{errors.date.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>
                                Hora inicio <span className="text-destructive">*</span>
                            </Label>
                            <Input type="time" step="900" {...register("start_time")} />
                            {errors.start_time && (
                                <p className="text-xs text-destructive">{errors.start_time.message}</p>
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
                                                    style={{ backgroundColor: s.color }}
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