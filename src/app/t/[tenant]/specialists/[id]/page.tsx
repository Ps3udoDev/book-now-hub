// src/app/t/[tenant]/specialists/[id]/page.tsx
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Loader2,
    Calendar,
    Briefcase,
    Star,
    Plus,
    X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { SpecialistForm } from "@/components/specialists";
import {
    useSpecialist,
    useSpecialistServices,
} from "@/hooks/supabase/use-specialists";
import { useServices } from "@/hooks/supabase/use-services";
import {
    specialistsService,
    type UpdateSpecialistData,
    SPECIALTIES,
} from "@/lib/services/specialists";
import type { Tables } from "@/types";

type Service = Tables["services"]["Row"];

export default function SpecialistDetailPage() {
    const params = useParams();
    const router = useRouter();
    const tenantSlug = params.tenant as string;
    const specialistId = params.id as string;

    const { specialist, isLoading, error, mutate } = useSpecialist(specialistId);
    const { services: assignedServices, mutate: mutateServices } =
        useSpecialistServices(specialistId);

    // Para asignar servicios
    const { services: allServices } = useServices(specialist?.tenant_id || null);
    const [isServicesDialogOpen, setIsServicesDialogOpen] = useState(false);
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [isAssigning, setIsAssigning] = useState(false);

    const handleSubmit = async (
        data: UpdateSpecialistData & { specialties: string[] }
    ) => {
        try {
            await specialistsService.updateSpecialist(specialistId, data);
            toast.success("Especialista actualizado");
            mutate();
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Error al actualizar"
            );
            throw error;
        }
    };

    const handleAssignServices = async () => {
        if (!specialist) return;

        setIsAssigning(true);
        try {
            await specialistsService.assignMultipleServices(
                specialistId,
                selectedServices,
                specialist.tenant_id
            );
            toast.success("Servicios asignados");
            setIsServicesDialogOpen(false);
            setSelectedServices([]);
            mutateServices();
        } catch (error) {
            toast.error("Error al asignar servicios");
        } finally {
            setIsAssigning(false);
        }
    };

    const handleRemoveService = async (id: string) => {
        try {
            await specialistsService.removeService(id);
            toast.success("Servicio removido");
            mutateServices();
        } catch (error) {
            toast.error("Error al remover servicio");
        }
    };

    const toggleService = (serviceId: string) => {
        if (selectedServices.includes(serviceId)) {
            setSelectedServices(selectedServices.filter((id) => id !== serviceId));
        } else {
            setSelectedServices([...selectedServices, serviceId]);
        }
    };

    // Servicios disponibles para asignar (excluyendo ya asignados)
    const assignedServiceIds = assignedServices.map((s) => s.service_id);
    const availableServices = allServices.filter(
        (s) => !assignedServiceIds.includes(s.id) && s.is_active
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !specialist) {
        return (
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={`/t/${tenantSlug}/specialists`}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Especialista no encontrado</h1>
                    </div>
                </div>
                <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
                    {error || "El especialista solicitado no existe"}
                </div>
            </div>
        );
    }

    // Helpers
    const getSpecialtyLabel = (value: string) => {
        return SPECIALTIES.find((s) => s.value === value)?.label || value;
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/t/${tenantSlug}/specialists`}>
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">{specialist.full_name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        {specialist.rating && specialist.rating > 0 && (
                            <Badge variant="secondary" className="gap-1">
                                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                                {specialist.rating.toFixed(1)}
                            </Badge>
                        )}
                        {!specialist.is_active && (
                            <Badge variant="outline">Inactivo</Badge>
                        )}
                    </div>
                </div>

                {/* Acciones rápidas */}
                <Button variant="outline" size="sm" asChild>
                    <Link href={`/t/${tenantSlug}/specialists/${specialistId}/schedule`}>
                        <Calendar className="h-4 w-4 mr-2" />
                        Horarios
                    </Link>
                </Button>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="info" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="info">Información</TabsTrigger>
                    <TabsTrigger value="services">
                        Servicios ({assignedServices.length})
                    </TabsTrigger>
                    <TabsTrigger value="stats">Estadísticas</TabsTrigger>
                </TabsList>

                {/* Tab: Información */}
                <TabsContent value="info" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Editar información</CardTitle>
                            <CardDescription>
                                Actualiza los datos del especialista
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SpecialistForm
                                specialist={specialist}
                                onSubmit={handleSubmit}
                                onCancel={() => router.push(`/t/${tenantSlug}/specialists`)}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab: Servicios */}
                <TabsContent value="services" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Servicios asignados</CardTitle>
                                    <CardDescription>
                                        Servicios que este especialista puede realizar
                                    </CardDescription>
                                </div>
                                <Dialog
                                    open={isServicesDialogOpen}
                                    onOpenChange={setIsServicesDialogOpen}
                                >
                                    <DialogTrigger asChild>
                                        <Button size="sm" disabled={availableServices.length === 0}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Asignar servicios
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-md">
                                        <DialogHeader>
                                            <DialogTitle>Asignar servicios</DialogTitle>
                                            <DialogDescription>
                                                Selecciona los servicios que puede realizar este
                                                especialista
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="max-h-[400px] overflow-y-auto space-y-2">
                                            {availableServices.map((service) => (
                                                <label
                                                    key={service.id}
                                                    className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent"
                                                >
                                                    <Checkbox
                                                        checked={selectedServices.includes(service.id)}
                                                        onCheckedChange={() => toggleService(service.id)}
                                                    />
                                                    <div className="flex-1">
                                                        <p className="font-medium">{service.name}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {service.duration_minutes} min · $
                                                            {service.base_price}
                                                        </p>
                                                    </div>
                                                </label>
                                            ))}
                                            {availableServices.length === 0 && (
                                                <p className="text-center text-muted-foreground py-4">
                                                    No hay más servicios disponibles para asignar
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex justify-end gap-2 pt-4 border-t">
                                            <Button
                                                variant="outline"
                                                onClick={() => setIsServicesDialogOpen(false)}
                                            >
                                                Cancelar
                                            </Button>
                                            <Button
                                                onClick={handleAssignServices}
                                                disabled={
                                                    selectedServices.length === 0 || isAssigning
                                                }
                                            >
                                                {isAssigning ? (
                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                ) : null}
                                                Asignar ({selectedServices.length})
                                            </Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {assignedServices.length > 0 ? (
                                <div className="space-y-2">
                                    {assignedServices.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between p-3 border rounded-lg"
                                        >
                                            <div>
                                                <p className="font-medium">{item.service.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {item.service.duration_minutes} min · $
                                                    {item.custom_price || item.service.base_price}
                                                    {item.custom_price && (
                                                        <span className="ml-1 text-xs">
                                                            (precio personalizado)
                                                        </span>
                                                    )}
                                                </p>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <span className="text-xs text-muted-foreground">
                                                        Nivel:
                                                    </span>
                                                    <span className="text-amber-500 text-sm">
                                                        {"★".repeat(item.skill_level ?? 0)}
                                                        {"☆".repeat(5 - (item.skill_level ?? 0))}
                                                    </span>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRemoveService(item.id)}
                                                className="text-destructive hover:text-destructive"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p className="font-medium">Sin servicios asignados</p>
                                    <p className="text-sm mt-1">
                                        Asigna servicios para que este especialista pueda atender
                                        citas
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Especialidades */}
                    {specialist.specialties && specialist.specialties.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Especialidades</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {specialist.specialties.map((specialty) => (
                                        <Badge key={specialty} variant="secondary">
                                            {getSpecialtyLabel(specialty)}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Tab: Estadísticas */}
                <TabsContent value="stats" className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Calificación
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-bold">
                                        {specialist.rating?.toFixed(1) || "0.0"}
                                    </span>
                                    <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {specialist.total_ratings} calificaciones
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Servicios
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">{assignedServices.length}</p>
                                <p className="text-xs text-muted-foreground">
                                    servicios asignados
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Comisión
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">
                                    {specialist.commission_type === "percentage"
                                        ? `${specialist.commission_percentage}%`
                                        : specialist.commission_type === "fixed"
                                            ? `$${specialist.commission_fixed}`
                                            : specialist.commission_type === "mixed"
                                                ? `${specialist.commission_percentage}% + $${specialist.commission_fixed}`
                                                : "N/A"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    por servicio realizado
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Placeholder para más estadísticas */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Historial de citas</CardTitle>
                            <CardDescription>
                                Citas atendidas por este especialista
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-muted-foreground">
                                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p className="font-medium">Sin historial de citas</p>
                                <p className="text-sm mt-1">
                                    El historial se mostrará cuando el módulo de agendamiento esté
                                    activo
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}