// src/components/specialists/exception-form.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, Trash2, CalendarIcon, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    schedulesService,
    EXCEPTION_TYPES,
    TIME_SLOTS,
    type ExceptionType,
} from "@/lib/services/schedules";
import type { Tables } from "@/types";

type ScheduleException = Tables["schedule_exceptions"]["Row"];

// Schema de validación
const exceptionSchema = z.object({
    exception_date: z.string().min(1, "La fecha es requerida"),
    exception_type: z.enum(["vacation", "sick", "holiday", "special_hours"]),
    is_day_off: z.boolean().default(true),
    start_time: z.string().optional().nullable(),
    end_time: z.string().optional().nullable(),
    reason: z.string().optional().nullable(),
});

type ExceptionFormData = z.infer<typeof exceptionSchema>;

interface ExceptionFormProps {
    specialistId: string;
    onSuccess: () => void;
    onCancel?: () => void;
}

export function ExceptionForm({
    specialistId,
    onSuccess,
    onCancel,
}: ExceptionFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors },
    } = useForm<ExceptionFormData>({
        resolver: zodResolver(exceptionSchema) as any,
        defaultValues: {
            exception_date: "",
            exception_type: "vacation",
            is_day_off: true,
            start_time: null,
            end_time: null,
            reason: "",
        },
    });

    const exception_type = watch("exception_type");
    const is_day_off = watch("is_day_off");

    const onSubmit = async (data: ExceptionFormData) => {
        setIsSubmitting(true);
        try {
            await schedulesService.createException({
                specialist_id: specialistId,
                exception_date: data.exception_date,
                exception_type: data.exception_type,
                is_day_off: data.is_day_off,
                start_time: !data.is_day_off ? data.start_time : null,
                end_time: !data.is_day_off ? data.end_time : null,
                reason: data.reason,
            });
            toast.success("Excepción creada");
            reset();
            onSuccess();
        } catch (error) {
            toast.error("Error al crear excepción");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="exception_date">Fecha *</Label>
                    <Input
                        id="exception_date"
                        type="date"
                        {...register("exception_date")}
                        disabled={isSubmitting}
                    />
                    {errors.exception_date && (
                        <p className="text-sm text-destructive">
                            {errors.exception_date.message}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label>Tipo de excepción</Label>
                    <Select
                        value={exception_type}
                        onValueChange={(value) =>
                            setValue("exception_type", value as ExceptionType)
                        }
                        disabled={isSubmitting}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {EXCEPTION_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                    <span className="flex items-center gap-2">
                                        <span>{type.emoji}</span>
                                        <span>{type.label}</span>
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                    <Label htmlFor="is_day_off" className="cursor-pointer">
                        Día libre completo
                    </Label>
                    <p className="text-sm text-muted-foreground">
                        {is_day_off
                            ? "No trabajará este día"
                            : "Trabajará con horario especial"}
                    </p>
                </div>
                <Switch
                    id="is_day_off"
                    checked={is_day_off}
                    onCheckedChange={(checked) => setValue("is_day_off", checked)}
                    disabled={isSubmitting}
                />
            </div>

            {!is_day_off && (
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label>Hora inicio</Label>
                        <Select
                            value={watch("start_time") || ""}
                            onValueChange={(value) => setValue("start_time", value)}
                            disabled={isSubmitting}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent>
                                {TIME_SLOTS.map((time) => (
                                    <SelectItem key={time} value={time}>
                                        {time}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Hora fin</Label>
                        <Select
                            value={watch("end_time") || ""}
                            onValueChange={(value) => setValue("end_time", value)}
                            disabled={isSubmitting}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent>
                                {TIME_SLOTS.map((time) => (
                                    <SelectItem key={time} value={time}>
                                        {time}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="reason">Motivo (opcional)</Label>
                <Textarea
                    id="reason"
                    placeholder="Descripción o motivo de la ausencia..."
                    rows={2}
                    {...register("reason")}
                    disabled={isSubmitting}
                />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
                {onCancel && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </Button>
                )}
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Guardando...
                        </>
                    ) : (
                        "Agregar excepción"
                    )}
                </Button>
            </div>
        </form>
    );
}

// Lista de excepciones
interface ExceptionListProps {
    exceptions: ScheduleException[];
    onDelete: (exception: ScheduleException) => void;
    isDeleting?: string | null;
}

export function ExceptionList({
    exceptions,
    onDelete,
    isDeleting,
}: ExceptionListProps) {
    if (exceptions.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground border rounded-lg">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Sin excepciones programadas</p>
                <p className="text-sm mt-1">
                    Las vacaciones y ausencias aparecerán aquí
                </p>
            </div>
        );
    }

    const getTypeInfo = (type: string) => {
        return EXCEPTION_TYPES.find((t) => t.value === type) || {
            label: type,
            emoji: "📅",
        };
    };

    return (
        <div className="space-y-2">
            {exceptions.map((exception) => {
                const typeInfo = getTypeInfo(exception.exception_type);
                const date = new Date(exception.exception_date + "T12:00:00");

                return (
                    <div
                        key={exception.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{typeInfo.emoji}</span>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">
                                        {format(date, "EEEE d 'de' MMMM", { locale: es })}
                                    </span>
                                    <Badge variant="secondary" className="text-xs">
                                        {typeInfo.label}
                                    </Badge>
                                </div>
                                {exception.is_day_off ? (
                                    <p className="text-sm text-muted-foreground">Día libre</p>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        {exception.start_time?.substring(0, 5)} -{" "}
                                        {exception.end_time?.substring(0, 5)}
                                    </p>
                                )}
                                {exception.reason && (
                                    <p className="text-sm text-muted-foreground">
                                        {exception.reason}
                                    </p>
                                )}
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(exception)}
                            disabled={isDeleting === exception.id}
                            className="text-destructive hover:text-destructive"
                        >
                            {isDeleting === exception.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2 className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                );
            })}
        </div>
    );
}

// Componente completo para gestionar excepciones
interface ExceptionManagerProps {
    specialistId: string;
    exceptions: ScheduleException[];
    onUpdate: () => void;
}

export function ExceptionManager({
    specialistId,
    exceptions,
    onUpdate,
}: ExceptionManagerProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDelete = async (exception: ScheduleException) => {
        if (!confirm("¿Eliminar esta excepción?")) return;

        setDeletingId(exception.id);
        try {
            await schedulesService.deleteException(exception.id);
            toast.success("Excepción eliminada");
            onUpdate();
        } catch (error) {
            toast.error("Error al eliminar");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base">Excepciones y ausencias</CardTitle>
                        <CardDescription>
                            Vacaciones, permisos y horarios especiales
                        </CardDescription>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <Plus className="h-4 w-4 mr-2" />
                                Agregar
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Nueva excepción</DialogTitle>
                                <DialogDescription>
                                    Registra una ausencia o horario especial
                                </DialogDescription>
                            </DialogHeader>
                            <ExceptionForm
                                specialistId={specialistId}
                                onSuccess={() => {
                                    setIsDialogOpen(false);
                                    onUpdate();
                                }}
                                onCancel={() => setIsDialogOpen(false)}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                <ExceptionList
                    exceptions={exceptions}
                    onDelete={handleDelete}
                    isDeleting={deletingId}
                />
            </CardContent>
        </Card>
    );
}