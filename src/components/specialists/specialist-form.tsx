// src/components/specialists/specialist-form.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, X, Plus } from "lucide-react";

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
import { SPECIALTIES } from "@/lib/services/specialists";
import type { Tables } from "@/types";

type Profile = Tables["profiles"]["Row"];
type Branch = Tables["branches"]["Row"];

// Schema de validación
const specialistSchema = z.object({
    full_name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    email: z.string().email("Email inválido"),
    phone: z.string().optional().nullable(),
    branch_id: z.string().optional().nullable(),
    role: z.enum(["owner", "admin", "manager", "employee"]).default("employee"),
    bio: z.string().optional().nullable(),
    commission_type: z.enum(["percentage", "fixed", "mixed"]).nullable(),
    commission_percentage: z.coerce.number().min(0).max(100).default(0),
    commission_fixed: z.coerce.number().min(0).default(0),
    is_active: z.boolean().default(true),
});

type SpecialistFormData = z.infer<typeof specialistSchema>;

interface SpecialistFormProps {
    specialist?: Profile | null;
    branches?: Branch[];
    onSubmit: (data: SpecialistFormData & { specialties: string[] }) => Promise<void>;
    onCancel?: () => void;
    isLoading?: boolean;
}

export function SpecialistForm({
    specialist,
    branches = [],
    onSubmit,
    onCancel,
    isLoading = false,
}: SpecialistFormProps) {
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [specialties, setSpecialties] = useState<string[]>(
        specialist?.specialties || []
    );

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<SpecialistFormData>({
        resolver: zodResolver(specialistSchema) as any,
        defaultValues: {
            full_name: specialist?.full_name || "",
            email: specialist?.email || "",
            phone: specialist?.phone || "",
            branch_id: specialist?.branch_id || "",
            role: specialist?.role || "employee",
            bio: specialist?.bio || "",
            commission_type: specialist?.commission_type as "percentage" | "fixed" | "mixed" | null || "percentage",
            commission_percentage: specialist?.commission_percentage || 0,
            commission_fixed: specialist?.commission_fixed || 0,
            is_active: specialist?.is_active ?? true,
        },
    });

    const branch_id = watch("branch_id");
    const role = watch("role");
    const commission_type = watch("commission_type");
    const is_active = watch("is_active");

    const handleFormSubmit = async (data: SpecialistFormData) => {
        try {
            setSubmitError(null);
            await onSubmit({ ...data, specialties });
        } catch (error) {
            setSubmitError(
                error instanceof Error ? error.message : "Error al guardar"
            );
        }
    };

    const toggleSpecialty = (specialty: string) => {
        if (specialties.includes(specialty)) {
            setSpecialties(specialties.filter((s) => s !== specialty));
        } else {
            setSpecialties([...specialties, specialty]);
        }
    };

    const loading = isLoading || isSubmitting;

    return (
        <form onSubmit={handleSubmit(handleFormSubmit as any)} className="space-y-6">
            {/* Información personal */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Información personal</h3>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="full_name">Nombre completo *</Label>
                        <Input
                            id="full_name"
                            placeholder="María García"
                            {...register("full_name")}
                            disabled={loading}
                        />
                        {errors.full_name && (
                            <p className="text-sm text-destructive">
                                {errors.full_name.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Correo electrónico *</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="maria@example.com"
                            {...register("email")}
                            disabled={loading || !!specialist}
                        />
                        {errors.email && (
                            <p className="text-sm text-destructive">{errors.email.message}</p>
                        )}
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input
                            id="phone"
                            placeholder="+58 414 1234567"
                            {...register("phone")}
                            disabled={loading}
                        />
                    </div>

                    {branches.length > 0 && (
                        <div className="space-y-2">
                            <Label htmlFor="branch_id">Sucursal</Label>
                            <Select
                                // 1. Si es null/vacío, el valor visual debe ser "unassigned" para que coincida con el Item
                                value={branch_id || "unassigned"}

                                // 2. Al cambiar: si eligen "unassigned", guardamos null en el formulario. Si no, el ID real.
                                onValueChange={(value) =>
                                    setValue("branch_id", value === "unassigned" ? null : value)
                                }
                                disabled={loading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar sucursal..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {/* 3. ✅ CORREGIDO: Usamos un valor real, no vacío */}
                                    <SelectItem value="unassigned">Sin sucursal asignada</SelectItem>

                                    {branches.map((branch) => (
                                        <SelectItem key={branch.id} value={branch.id}>
                                            {branch.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="bio">Biografía / Descripción</Label>
                    <Textarea
                        id="bio"
                        placeholder="Experiencia, certificaciones, especialización..."
                        rows={3}
                        {...register("bio")}
                        disabled={loading}
                    />
                </div>
            </div>

            {/* Rol */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Rol en el sistema</h3>

                <div className="space-y-2">
                    <Label>Rol</Label>
                    <Select
                        value={role}
                        onValueChange={(value) =>
                            setValue("role", value as SpecialistFormData["role"])
                        }
                        disabled={loading}
                    >
                        <SelectTrigger className="w-full md:w-[300px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="employee">Empleado</SelectItem>
                            <SelectItem value="manager">Gerente</SelectItem>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="owner">Propietario</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Especialidades */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Especialidades</h3>
                <p className="text-sm text-muted-foreground">
                    Selecciona las áreas en las que el especialista tiene experiencia
                </p>

                <div className="flex flex-wrap gap-2">
                    {SPECIALTIES.map((specialty) => (
                        <Badge
                            key={specialty.value}
                            variant={
                                specialties.includes(specialty.value) ? "default" : "outline"
                            }
                            className="cursor-pointer"
                            onClick={() => toggleSpecialty(specialty.value)}
                        >
                            {specialty.label}
                            {specialties.includes(specialty.value) && (
                                <X className="h-3 w-3 ml-1" />
                            )}
                        </Badge>
                    ))}
                </div>
            </div>

            {/* Comisiones */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Comisiones</h3>

                <div className="space-y-2">
                    <Label>Tipo de comisión</Label>
                    <Select
                        value={commission_type || ""}
                        onValueChange={(value) =>
                            setValue(
                                "commission_type",
                                value as SpecialistFormData["commission_type"]
                            )
                        }
                        disabled={loading}
                    >
                        <SelectTrigger className="w-full md:w-[300px]">
                            <SelectValue placeholder="Seleccionar tipo..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="percentage">Porcentaje</SelectItem>
                            <SelectItem value="fixed">Monto fijo</SelectItem>
                            <SelectItem value="mixed">Mixto (% + fijo)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    {(commission_type === "percentage" || commission_type === "mixed") && (
                        <div className="space-y-2">
                            <Label htmlFor="commission_percentage">Porcentaje (%)</Label>
                            <div className="relative">
                                <Input
                                    id="commission_percentage"
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={0.5}
                                    {...register("commission_percentage")}
                                    disabled={loading}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    %
                                </span>
                            </div>
                        </div>
                    )}

                    {(commission_type === "fixed" || commission_type === "mixed") && (
                        <div className="space-y-2">
                            <Label htmlFor="commission_fixed">Monto fijo</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    $
                                </span>
                                <Input
                                    id="commission_fixed"
                                    type="number"
                                    min={0}
                                    step={0.5}
                                    className="pl-7"
                                    {...register("commission_fixed")}
                                    disabled={loading}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Estado */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                    <Label htmlFor="is_active" className="cursor-pointer">
                        Especialista activo
                    </Label>
                    <p className="text-sm text-muted-foreground">
                        Los especialistas inactivos no aparecen en el calendario
                    </p>
                </div>
                <Switch
                    id="is_active"
                    checked={is_active}
                    onCheckedChange={(checked) => setValue("is_active", checked)}
                    disabled={loading}
                />
            </div>

            {/* Rating (solo lectura si existe) */}
            {specialist && (specialist.total_ratings ?? 0) > 0 && (
                <div className="p-4 rounded-lg bg-muted">
                    <Label>Calificación actual</Label>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-2xl">
                            {"★".repeat(Math.floor(specialist.rating || 0))}
                            {"☆".repeat(5 - Math.floor(specialist.rating || 0))}
                        </span>
                        <span className="text-muted-foreground">
                            {specialist.rating?.toFixed(1)} ({specialist.total_ratings}{" "}
                            calificaciones)
                        </span>
                    </div>
                </div>
            )}

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
                    ) : specialist ? (
                        "Guardar cambios"
                    ) : (
                        "Crear especialista"
                    )}
                </Button>
            </div>
        </form>
    );
}