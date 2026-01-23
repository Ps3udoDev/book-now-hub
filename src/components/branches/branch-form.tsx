// src/components/branches/branch-form.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { WEEKDAYS, type OperatingHours, type DayHours } from "@/lib/services/branches";
import type { Tables } from "@/types";

type Branch = Tables["branches"]["Row"];

// Schema de validación
const branchSchema = z.object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    code: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    postal_code: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    timezone: z.string().default("America/Caracas"),
    is_main: z.boolean().default(false),
    is_active: z.boolean().default(true),
});

type BranchFormData = z.infer<typeof branchSchema>;

// Zonas horarias comunes de Latinoamérica
const TIMEZONES = [
    { value: "America/Caracas", label: "Venezuela (UTC-4)" },
    { value: "America/Bogota", label: "Colombia (UTC-5)" },
    { value: "America/Lima", label: "Perú (UTC-5)" },
    { value: "America/Guayaquil", label: "Ecuador (UTC-5)" },
    { value: "America/Mexico_City", label: "México Central (UTC-6)" },
    { value: "America/Argentina/Buenos_Aires", label: "Argentina (UTC-3)" },
    { value: "America/Santiago", label: "Chile (UTC-4/-3)" },
    { value: "America/Sao_Paulo", label: "Brasil (UTC-3)" },
    { value: "America/Panama", label: "Panamá (UTC-5)" },
];

interface BranchFormProps {
    branch?: Branch | null;
    onSubmit: (data: BranchFormData & { operating_hours: OperatingHours }) => Promise<void>;
    onCancel?: () => void;
    isLoading?: boolean;
}

export function BranchForm({
    branch,
    onSubmit,
    onCancel,
    isLoading = false,
}: BranchFormProps) {
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [operatingHours, setOperatingHours] = useState<OperatingHours>(() => {
        if (branch?.operating_hours) {
            return branch.operating_hours as OperatingHours;
        }
        return {
            monday: { open: "08:00", close: "18:00" },
            tuesday: { open: "08:00", close: "18:00" },
            wednesday: { open: "08:00", close: "18:00" },
            thursday: { open: "08:00", close: "18:00" },
            friday: { open: "08:00", close: "18:00" },
            saturday: { open: "09:00", close: "14:00" },
            sunday: null,
        };
    });

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<BranchFormData>({
        resolver: zodResolver(branchSchema) as any,
        defaultValues: {
            name: branch?.name || "",
            code: branch?.code || "",
            address: branch?.address || "",
            city: branch?.city || "",
            state: branch?.state || "",
            country: branch?.country || "",
            postal_code: branch?.postal_code || "",
            phone: branch?.phone || "",
            email: branch?.email || "",
            timezone: branch?.timezone || "America/Caracas",
            is_main: branch?.is_main ?? false,
            is_active: branch?.is_active ?? true,
        },
    });

    const timezone = watch("timezone");
    const is_main = watch("is_main");
    const is_active = watch("is_active");

    const handleFormSubmit = async (data: BranchFormData) => {
        try {
            setSubmitError(null);
            await onSubmit({ ...data, operating_hours: operatingHours });
        } catch (error) {
            setSubmitError(
                error instanceof Error ? error.message : "Error al guardar"
            );
        }
    };

    const updateDayHours = (
        day: keyof OperatingHours,
        field: "open" | "close",
        value: string
    ) => {
        setOperatingHours((prev) => {
            const current = prev[day];
            if (!current) return prev;
            return {
                ...prev,
                [day]: { ...current, [field]: value },
            };
        });
    };

    const toggleDay = (day: keyof OperatingHours, enabled: boolean) => {
        setOperatingHours((prev) => ({
            ...prev,
            [day]: enabled ? { open: "08:00", close: "18:00" } : null,
        }));
    };

    const loading = isLoading || isSubmitting;

    return (
        <form onSubmit={handleSubmit(handleFormSubmit as any)} className="space-y-6">
            {/* Información básica */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Información básica</h3>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre de la sucursal *</Label>
                        <Input
                            id="name"
                            placeholder="Sede Principal"
                            {...register("name")}
                            disabled={loading}
                        />
                        {errors.name && (
                            <p className="text-sm text-destructive">{errors.name.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="code">Código (opcional)</Label>
                        <Input
                            id="code"
                            placeholder="SUC-001"
                            {...register("code")}
                            disabled={loading}
                        />
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input
                            id="phone"
                            placeholder="+58 212 1234567"
                            {...register("phone")}
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="sucursal@ejemplo.com"
                            {...register("email")}
                            disabled={loading}
                        />
                        {errors.email && (
                            <p className="text-sm text-destructive">{errors.email.message}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Ubicación */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Ubicación</h3>

                <div className="space-y-2">
                    <Label htmlFor="address">Dirección</Label>
                    <Input
                        id="address"
                        placeholder="Av. Principal #123"
                        {...register("address")}
                        disabled={loading}
                    />
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                        <Label htmlFor="city">Ciudad</Label>
                        <Input
                            id="city"
                            placeholder="Caracas"
                            {...register("city")}
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="state">Estado/Provincia</Label>
                        <Input
                            id="state"
                            placeholder="Distrito Capital"
                            {...register("state")}
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="postal_code">Código Postal</Label>
                        <Input
                            id="postal_code"
                            placeholder="1010"
                            {...register("postal_code")}
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="country">País</Label>
                        <Input
                            id="country"
                            placeholder="Venezuela"
                            {...register("country")}
                            disabled={loading}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Zona horaria</Label>
                    <Select
                        value={timezone}
                        onValueChange={(value) => setValue("timezone", value)}
                        disabled={loading}
                    >
                        <SelectTrigger className="w-full md:w-[300px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {TIMEZONES.map((tz) => (
                                <SelectItem key={tz.value} value={tz.value}>
                                    {tz.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Horarios de operación */}
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="hours">
                    <AccordionTrigger className="text-lg font-medium">
                        <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Horarios de operación
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-3 pt-2">
                            {WEEKDAYS.map((day) => {
                                const hours = operatingHours[day.key as keyof OperatingHours];
                                const isOpen = hours !== null;

                                return (
                                    <div
                                        key={day.key}
                                        className="flex items-center gap-4 p-3 rounded-lg border"
                                    >
                                        <div className="w-24">
                                            <span className="font-medium">{day.label}</span>
                                        </div>
                                        <Switch
                                            checked={isOpen}
                                            onCheckedChange={(checked) =>
                                                toggleDay(day.key as keyof OperatingHours, checked)
                                            }
                                            disabled={loading}
                                        />
                                        {isOpen ? (
                                            <div className="flex items-center gap-2 flex-1">
                                                <Input
                                                    type="time"
                                                    value={hours?.open || "08:00"}
                                                    onChange={(e) =>
                                                        updateDayHours(
                                                            day.key as keyof OperatingHours,
                                                            "open",
                                                            e.target.value
                                                        )
                                                    }
                                                    className="w-[120px]"
                                                    disabled={loading}
                                                />
                                                <span className="text-muted-foreground">a</span>
                                                <Input
                                                    type="time"
                                                    value={hours?.close || "18:00"}
                                                    onChange={(e) =>
                                                        updateDayHours(
                                                            day.key as keyof OperatingHours,
                                                            "close",
                                                            e.target.value
                                                        )
                                                    }
                                                    className="w-[120px]"
                                                    disabled={loading}
                                                />
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground italic">
                                                Cerrado
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            {/* Opciones */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Opciones</h3>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                        <Label htmlFor="is_main" className="cursor-pointer">
                            Sucursal principal
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            La sucursal principal se muestra como predeterminada
                        </p>
                    </div>
                    <Switch
                        id="is_main"
                        checked={is_main}
                        onCheckedChange={(checked) => setValue("is_main", checked)}
                        disabled={loading}
                    />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                        <Label htmlFor="is_active" className="cursor-pointer">
                            Sucursal activa
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Las sucursales inactivas no aparecen en el sistema de reservas
                        </p>
                    </div>
                    <Switch
                        id="is_active"
                        checked={is_active}
                        onCheckedChange={(checked) => setValue("is_active", checked)}
                        disabled={loading}
                    />
                </div>
            </div>

            {/* Error */}
            {submitError && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    {submitError}
                </div>
            )}

            {/* Acciones */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
                {onCancel && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        Cancelar
                    </Button>
                )}
                <Button type="submit" disabled={loading}>
                    {loading ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Guardando...
                        </>
                    ) : branch ? (
                        "Guardar cambios"
                    ) : (
                        "Crear sucursal"
                    )}
                </Button>
            </div>
        </form>
    );
}
