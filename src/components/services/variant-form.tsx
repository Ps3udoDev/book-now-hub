// src/components/services/variant-form.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Trash2, GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import type { ServiceVariant } from "@/types";

// Schema de validación
const variantSchema = z.object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    description: z.string().optional(),
    duration_modifier: z.preprocess(
        (val) => (val === "" || val === undefined ? 0 : Number(val)),
        z.number().min(-120).max(240)
    ),
    price_modifier: z.preprocess(
        (val) => (val === "" || val === undefined ? 0 : Number(val)),
        z.number()
    ),
    is_active: z.boolean(),
});

type VariantFormData = z.infer<typeof variantSchema>;

interface VariantFormProps {
    variant?: ServiceVariant | null;
    onSubmit: (data: VariantFormData) => Promise<void>;
    onCancel?: () => void;
    isLoading?: boolean;
}

export function VariantForm({
    variant,
    onSubmit,
    onCancel,
    isLoading = false,
}: VariantFormProps) {
    const [submitError, setSubmitError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<VariantFormData>({
        resolver: zodResolver(variantSchema) as any,
        defaultValues: {
            name: variant?.name || "",
            description: variant?.description || "",
            duration_modifier: variant?.duration_modifier || 0,
            price_modifier: variant?.price_modifier || 0,
            is_active: variant?.is_active ?? true,
        },
    });

    const is_active = watch("is_active");
    const duration_modifier = watch("duration_modifier");
    const price_modifier = watch("price_modifier");

    const handleFormSubmit = async (data: VariantFormData) => {
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
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="name">Nombre de la variante *</Label>
                    <Input
                        id="name"
                        placeholder="Ej: Cabello largo"
                        {...register("name")}
                        disabled={loading}
                    />
                    {errors.name && (
                        <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-7">
                    <Label htmlFor="is_active" className="text-sm">
                        Activa
                    </Label>
                    <Switch
                        id="is_active"
                        checked={is_active}
                        onCheckedChange={(checked) => setValue("is_active", checked)}
                        disabled={loading}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                    id="description"
                    placeholder="Descripción opcional..."
                    rows={2}
                    {...register("description")}
                    disabled={loading}
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="duration_modifier">Modificador de duración (min)</Label>
                    <Input
                        id="duration_modifier"
                        type="number"
                        step={5}
                        {...register("duration_modifier")}
                        disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                        {duration_modifier > 0
                            ? `+${duration_modifier} minutos extra`
                            : duration_modifier < 0
                                ? `${duration_modifier} minutos menos`
                                : "Sin cambio en duración"}
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="price_modifier">Modificador de precio ($)</Label>
                    <Input
                        id="price_modifier"
                        type="number"
                        step={0.5}
                        {...register("price_modifier")}
                        disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                        {price_modifier > 0
                            ? `+$${price_modifier} al precio base`
                            : price_modifier < 0
                                ? `-$${Math.abs(price_modifier)} de descuento`
                                : "Sin cambio en precio"}
                    </p>
                </div>
            </div>

            {submitError && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    {submitError}
                </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
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
                    ) : variant ? (
                        "Guardar"
                    ) : (
                        "Agregar variante"
                    )}
                </Button>
            </div>
        </form>
    );
}

// Componente para mostrar lista de variantes
interface VariantListProps {
    variants: ServiceVariant[];
    basePrice: number;
    baseDuration: number;
    onEdit: (variant: ServiceVariant) => void;
    onDelete: (variant: ServiceVariant) => void;
}

export function VariantList({
    variants,
    basePrice,
    baseDuration,
    onEdit,
    onDelete,
}: VariantListProps) {
    if (variants.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground border rounded-lg">
                <p>No hay variantes configuradas</p>
                <p className="text-sm mt-1">
                    Las variantes permiten ofrecer diferentes opciones del mismo servicio
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {variants.map((variant) => (
                <Card
                    key={variant.id}
                    className={!variant.is_active ? "opacity-60" : ""}
                >
                    <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="cursor-move text-muted-foreground hover:text-foreground">
                                    <GripVertical className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="font-medium">{variant.name}</p>
                                    {variant.description && (
                                        <p className="text-sm text-muted-foreground">
                                            {variant.description}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                        <span>
                                            Duración: {baseDuration + (variant.duration_modifier ?? 0)} min
                                            {(variant.duration_modifier ?? 0) !== 0 && (
                                                <span className="ml-1">
                                                    ({(variant.duration_modifier ?? 0) > 0 ? "+" : ""}
                                                    {variant.duration_modifier})
                                                </span>
                                            )}
                                        </span>
                                        <span>
                                            Precio: ${(basePrice + (variant.price_modifier ?? 0)).toFixed(2)}
                                            {(variant.price_modifier ?? 0) !== 0 && (
                                                <span className="ml-1">
                                                    ({(variant.price_modifier ?? 0) > 0 ? "+" : ""}$
                                                    {variant.price_modifier})
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onEdit(variant)}
                                >
                                    Editar
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onDelete(variant)}
                                    className="text-destructive hover:text-destructive"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}