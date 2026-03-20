// src/components/workstations/workstation-form.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

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
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { WorkstationIcon } from "./workstation-icon";
import { STATION_TYPES } from "@/lib/services/workstations";
import { workstationsService } from "@/lib/services/workstations";
import { useActiveBranches } from "@/hooks/supabase/use-branches";
import { useActiveServices } from "@/hooks/supabase/use-services";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { Tables } from "@/types";

type Workstation = Tables["workstations"]["Row"];

// Zod schema
const workstationSchema = z.object({
    name: z.string().min(1, "El nombre es requerido"),
    code: z.string().optional().nullable(),
    branch_id: z.string().min(1, "La sucursal es requerida"),
    station_type: z.string().default("general"),
    floor: z.coerce.number().min(1).default(1),
    is_active: z.boolean().default(true),
});

type WorkstationFormData = z.infer<typeof workstationSchema>;

interface WorkstationFormProps {
    workstation?: Workstation | null;
    onSuccess?: () => void;
}

export function WorkstationForm({ workstation, onSuccess }: WorkstationFormProps) {
    const router = useRouter();
    const params = useParams();
    const tenantSlug = params.tenant as string;
    const { tenant } = useAuthStore();
    const tenantId = tenant?.id || null;

    const { branches } = useActiveBranches(tenantId);
    const { services } = useActiveServices(tenantId);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedServices, setSelectedServices] = useState<string[]>(
        (workstation?.compatible_services as string[]) || []
    );

    const isEditing = !!workstation;

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<WorkstationFormData>({
        resolver: zodResolver(workstationSchema) as any,
        defaultValues: {
            name: workstation?.name || "",
            code: workstation?.code || "",
            branch_id: workstation?.branch_id || "",
            station_type: workstation?.station_type || "general",
            floor: workstation?.floor || 1,
            is_active: workstation?.is_active ?? true,
        },
    });

    const watchStationType = watch("station_type");
    const watchIsActive = watch("is_active");

    // Preseleccionar la primera sucursal si solo hay una
    useEffect(() => {
        if (!isEditing && branches.length === 1 && !watch("branch_id")) {
            setValue("branch_id", branches[0].id);
        }
    }, [branches, isEditing, setValue, watch]);

    const onSubmit = async (data: WorkstationFormData) => {
        if (!tenantId) return;

        setIsSubmitting(true);
        try {
            if (isEditing && workstation) {
                await workstationsService.updateWorkstation(workstation.id, {
                    ...data,
                    compatible_services: selectedServices.length > 0 ? selectedServices : null,
                });
                toast.success("Puesto de trabajo actualizado");
            } else {
                await workstationsService.createWorkstation({
                    ...data,
                    tenant_id: tenantId,
                    compatible_services: selectedServices.length > 0 ? selectedServices : null,
                });
                toast.success("Puesto de trabajo creado");
            }

            onSuccess?.();
            router.push(`/t/${tenantSlug}/workstations`);
            router.refresh();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Error inesperado";
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleService = (serviceId: string) => {
        setSelectedServices((prev) =>
            prev.includes(serviceId)
                ? prev.filter((id) => id !== serviceId)
                : [...prev, serviceId]
        );
    };

    return (
        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
            {/* Información básica */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Información básica</CardTitle>
                    <CardDescription>Datos principales del puesto de trabajo</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Nombre */}
                        <div className="space-y-2">
                            <Label htmlFor="name">
                                Nombre <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="name"
                                placeholder="Ej: Sillón Principal 1"
                                {...register("name")}
                            />
                            {errors.name && (
                                <p className="text-xs text-destructive">{errors.name.message}</p>
                            )}
                        </div>

                        {/* Código */}
                        <div className="space-y-2">
                            <Label htmlFor="code">Código</Label>
                            <Input
                                id="code"
                                placeholder="Ej: S1, LC-2"
                                {...register("code")}
                            />
                            <p className="text-xs text-muted-foreground">
                                Identificador corto único por sucursal
                            </p>
                        </div>
                    </div>

                    {/* Sucursal */}
                    <div className="space-y-2">
                        <Label>
                            Sucursal <span className="text-destructive">*</span>
                        </Label>
                        <Select
                            value={watch("branch_id")}
                            onValueChange={(val) => setValue("branch_id", val)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar sucursal" />
                            </SelectTrigger>
                            <SelectContent>
                                {branches.map((branch) => (
                                    <SelectItem key={branch.id} value={branch.id}>
                                        {branch.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.branch_id && (
                            <p className="text-xs text-destructive">{errors.branch_id.message}</p>
                        )}
                        {branches.length === 0 && (
                            <p className="text-xs text-amber-600">
                                No hay sucursales activas. Crea una primero en Configuración → Sucursales.
                            </p>
                        )}
                    </div>

                    {/* Tipo de estación */}
                    <div className="space-y-2">
                        <Label>Tipo de estación</Label>
                        <Select
                            value={watchStationType}
                            onValueChange={(val) => setValue("station_type", val)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {STATION_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                        <div className="flex items-center gap-2">
                                            <WorkstationIcon
                                                stationType={type.value}
                                                size={16}
                                            />
                                            <span>{type.label}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Piso */}
                        <div className="space-y-2">
                            <Label htmlFor="floor">Piso</Label>
                            <Input
                                id="floor"
                                type="number"
                                min={1}
                                max={10}
                                {...register("floor")}
                            />
                        </div>

                        {/* Estado activo */}
                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                                <Label>Estado</Label>
                                <p className="text-xs text-muted-foreground">
                                    {watchIsActive ? "Activo y disponible" : "Inactivo"}
                                </p>
                            </div>
                            <Switch
                                checked={watchIsActive}
                                onCheckedChange={(val) => setValue("is_active", val)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Servicios compatibles */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Servicios compatibles</CardTitle>
                    <CardDescription>
                        Selecciona los servicios que se pueden realizar en esta estación.
                        Si no seleccionas ninguno, se considerará compatible con todos.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {services.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No hay servicios activos configurados.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {services.map((service) => {
                                const isSelected = selectedServices.includes(service.id);
                                return (
                                    <button
                                        key={service.id}
                                        type="button"
                                        onClick={() => toggleService(service.id)}
                                        className={`flex items-center gap-2 rounded-lg border p-2.5 text-left text-sm transition-colors ${isSelected
                                                ? "border-primary bg-primary/5 text-primary"
                                                : "border-border hover:border-primary/50"
                                            }`}
                                    >
                                        <div
                                            className={`h-4 w-4 rounded border flex items-center justify-center ${isSelected
                                                    ? "bg-primary border-primary"
                                                    : "border-muted-foreground/30"
                                                }`}
                                        >
                                            {isSelected && (
                                                <svg
                                                    className="h-3 w-3 text-primary-foreground"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                    strokeWidth={3}
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M5 13l4 4L19 7"
                                                    />
                                                </svg>
                                            )}
                                        </div>
                                        <span className="truncate">{service.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    {selectedServices.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-3">
                            {selectedServices.length} servicio{selectedServices.length > 1 ? "s" : ""} seleccionado{selectedServices.length > 1 ? "s" : ""}
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Botones */}
            <div className="flex items-center justify-between">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => router.push(`/t/${tenantSlug}/workstations`)}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </Button>
                <Button type="submit" disabled={isSubmitting || branches.length === 0}>
                    {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="mr-2 h-4 w-4" />
                    )}
                    {isEditing ? "Guardar cambios" : "Crear puesto"}
                </Button>
            </div>
        </form>
    );
}