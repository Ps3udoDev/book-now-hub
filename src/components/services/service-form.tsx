// src/components/services/service-form.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { Service } from "@/types";

// Categorías de servicios disponibles (debe coincidir con el enum de la BD)
export const SERVICE_CATEGORIES = [
    { value: "hair", label: "Cabello", emoji: "💇" },
    { value: "nails", label: "Uñas", emoji: "💅" },
    { value: "skin", label: "Piel / Facial", emoji: "🧴" },
    { value: "makeup", label: "Maquillaje", emoji: "💄" },
    { value: "spa", label: "Spa / Masajes", emoji: "🧖" },
    { value: "barber", label: "Barbería", emoji: "✂️" },
    { value: "other", label: "Otro", emoji: "📦" },
] as const;

// Schema de validación
const serviceSchema = z.object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    description: z.string().optional(),
    category: z.enum([
        "hair",
        "nails",
        "skin",
        "makeup",
        "spa",
        "barber",
        "other",
    ]),
    duration_minutes: z.coerce
        .number()
        .min(5, "Duración mínima: 5 minutos")
        .max(480, "Duración máxima: 8 horas"),
    buffer_minutes: z.coerce.number().min(0).max(60).default(0),
    base_price: z.coerce.number().min(0, "El precio no puede ser negativo"),
    currency_code: z.string().default("USD"),
    has_variants: z.boolean().default(false),
    requires_specialist: z.boolean().default(true),
    requires_station: z.boolean().default(false),
    is_featured: z.boolean().default(false),
    is_active: z.boolean().default(true),
});

export type ServiceFormData = z.infer<typeof serviceSchema>;

interface ServiceFormProps {
    service?: Service | null;
    onSubmit: (data: ServiceFormData) => Promise<void>;
    onCancel?: () => void;
    isLoading?: boolean;
}

export function ServiceForm({
    service,
    onSubmit,
    onCancel,
    isLoading = false,
}: ServiceFormProps) {
    const [submitError, setSubmitError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<ServiceFormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(serviceSchema) as any,
        defaultValues: {
            name: service?.name || "",
            description: service?.description || "",
            category: service?.category || "other",
            duration_minutes: service?.duration_minutes || 30,
            buffer_minutes: service?.buffer_minutes || 0,
            base_price: service?.base_price || 0,
            currency_code: service?.currency_code || "USD",
            has_variants: service?.has_variants ?? false,
            requires_specialist: service?.requires_specialist ?? true,
            requires_station: service?.requires_station ?? false,
            is_featured: service?.is_featured ?? false,
            is_active: service?.is_active ?? true,
        },
    });

    const category = watch("category");
    const requires_specialist = watch("requires_specialist");
    const requires_station = watch("requires_station");
    const is_featured = watch("is_featured");
    const is_active = watch("is_active");

    const handleFormSubmit = async (data: ServiceFormData) => {
        try {
            setSubmitError(null);
            await onSubmit(data);
        } catch (error) {
            setSubmitError(
                error instanceof Error ? error.message : "Error al guardar"
            );
        }
    };

    const loading = isLoading || isSubmitting;

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Información básica */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Información básica</h3>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre del servicio *</Label>
                        <Input
                            id="name"
                            placeholder="Ej: Corte de cabello"
                            {...register("name")}
                            disabled={loading}
                        />
                        {errors.name && (
                            <p className="text-sm text-destructive">{errors.name.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="category">Categoría *</Label>
                        <Select
                            value={category}
                            onValueChange={(value) =>
                                setValue("category", value as ServiceFormData["category"])
                            }
                            disabled={loading}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona categoría" />
                            </SelectTrigger>
                            <SelectContent>
                                {SERVICE_CATEGORIES.map((cat) => (
                                    <SelectItem key={cat.value} value={cat.value}>
                                        <span className="flex items-center gap-2">
                                            <span>{cat.emoji}</span>
                                            <span>{cat.label}</span>
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.category && (
                            <p className="text-sm text-destructive">
                                {errors.category.message}
                            </p>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                        id="description"
                        placeholder="Describe el servicio..."
                        rows={3}
                        {...register("description")}
                        disabled={loading}
                    />
                </div>
            </div>

            {/* Duración y precio */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Duración y precio</h3>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                        <Label htmlFor="duration_minutes">Duración (minutos) *</Label>
                        <Input
                            id="duration_minutes"
                            type="number"
                            min={5}
                            max={480}
                            step={5}
                            {...register("duration_minutes")}
                            disabled={loading}
                        />
                        {errors.duration_minutes && (
                            <p className="text-sm text-destructive">
                                {errors.duration_minutes.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="buffer_minutes">Tiempo buffer (minutos)</Label>
                        <Input
                            id="buffer_minutes"
                            type="number"
                            min={0}
                            max={60}
                            step={5}
                            {...register("buffer_minutes")}
                            disabled={loading}
                        />
                        <p className="text-xs text-muted-foreground">
                            Tiempo entre citas
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="base_price">Precio base *</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                $
                            </span>
                            <Input
                                id="base_price"
                                type="number"
                                min={0}
                                step={0.01}
                                className="pl-7"
                                {...register("base_price")}
                                disabled={loading}
                            />
                        </div>
                        {errors.base_price && (
                            <p className="text-sm text-destructive">
                                {errors.base_price.message}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Requisitos */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Requisitos</h3>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                            <Label htmlFor="requires_specialist" className="cursor-pointer">
                                Requiere especialista
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                El servicio debe asignarse a un profesional
                            </p>
                        </div>
                        <Switch
                            id="requires_specialist"
                            checked={requires_specialist}
                            onCheckedChange={(checked) =>
                                setValue("requires_specialist", checked)
                            }
                            disabled={loading}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                            <Label htmlFor="requires_station" className="cursor-pointer">
                                Requiere puesto de trabajo
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Necesita una estación específica
                            </p>
                        </div>
                        <Switch
                            id="requires_station"
                            checked={requires_station}
                            onCheckedChange={(checked) =>
                                setValue("requires_station", checked)
                            }
                            disabled={loading}
                        />
                    </div>
                </div>
            </div>

            {/* Visibilidad */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Visibilidad</h3>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                            <Label htmlFor="is_active" className="cursor-pointer">
                                Servicio activo
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Visible para clientes
                            </p>
                        </div>
                        <Switch
                            id="is_active"
                            checked={is_active}
                            onCheckedChange={(checked) => setValue("is_active", checked)}
                            disabled={loading}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                            <Label htmlFor="is_featured" className="cursor-pointer">
                                Destacado
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Mostrar en página principal
                            </p>
                        </div>
                        <Switch
                            id="is_featured"
                            checked={is_featured}
                            onCheckedChange={(checked) => setValue("is_featured", checked)}
                            disabled={loading}
                        />
                    </div>
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
                    <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                        Cancelar
                    </Button>
                )}
                <Button type="submit" disabled={loading}>
                    {loading ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Guardando...
                        </>
                    ) : service ? (
                        "Guardar cambios"
                    ) : (
                        "Crear servicio"
                    )}
                </Button>
            </div>
        </form>
    );
}