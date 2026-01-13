// src/app/t/[tenant]/services/[id]/variants/page.tsx
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
} from "@/components/ui/dialog";
import { VariantForm, VariantList } from "@/components/services";
import { useService, useServiceVariants } from "@/hooks/supabase/use-services";
import {
    servicesService,
    type CreateVariantData,
    type UpdateVariantData,
} from "@/lib/services/services";
import type { ServiceVariant } from "@/types";

export default function ServiceVariantsPage() {
    const params = useParams();
    const router = useRouter();
    const tenantSlug = params.tenant as string;
    const serviceId = params.id as string;

    const { service, isLoading: serviceLoading } = useService(serviceId);
    const { variants, isLoading: variantsLoading, mutate } = useServiceVariants(serviceId);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingVariant, setEditingVariant] = useState<ServiceVariant | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isLoading = serviceLoading || variantsLoading;

    const handleCreateVariant = async (
        data: Omit<CreateVariantData, "service_id">
    ) => {
        setIsSubmitting(true);
        try {
            await servicesService.createVariant({
                ...data,
                service_id: serviceId,
            });
            toast.success("Variante agregada");
            setIsDialogOpen(false);
            mutate();
        } catch (error) {
            toast.error("Error al crear variante");
            throw error;
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateVariant = async (data: UpdateVariantData) => {
        if (!editingVariant) return;

        setIsSubmitting(true);
        try {
            await servicesService.updateVariant(editingVariant.id, data);
            toast.success("Variante actualizada");
            setEditingVariant(null);
            mutate();
        } catch (error) {
            toast.error("Error al actualizar variante");
            throw error;
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteVariant = async (variant: ServiceVariant) => {
        if (!confirm(`¿Eliminar la variante "${variant.name}"?`)) return;

        try {
            await servicesService.deleteVariant(variant.id, serviceId);
            toast.success("Variante eliminada");
            mutate();
        } catch (error) {
            toast.error("Error al eliminar variante");
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!service) {
        return (
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
                    Servicio no encontrado
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/t/${tenantSlug}/services/${serviceId}`}>
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">Variantes</h1>
                    <p className="text-muted-foreground">{service.name}</p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva variante
                </Button>
            </div>

            {/* Info del servicio base */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Servicio base</CardTitle>
                    <CardDescription>
                        Precio: ${service.base_price.toFixed(2)} · Duración:{" "}
                        {service.duration_minutes} min
                    </CardDescription>
                </CardHeader>
            </Card>

            {/* Lista de variantes */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">
                        Variantes configuradas ({variants.length})
                    </CardTitle>
                    <CardDescription>
                        Las variantes modifican el precio y/o duración del servicio base
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <VariantList
                        variants={variants}
                        basePrice={service.base_price}
                        baseDuration={service.duration_minutes}
                        onEdit={(variant) => setEditingVariant(variant)}
                        onDelete={handleDeleteVariant}
                    />
                </CardContent>
            </Card>

            {/* Ejemplos de uso */}
            {variants.length === 0 && (
                <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                    <CardHeader>
                        <CardTitle className="text-base text-blue-800 dark:text-blue-200">
                            💡 Ejemplos de variantes
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                        <p>
                            <strong>Balayage:</strong> "Cabello corto" (+$0), "Cabello medio"
                            (+$20, +30min), "Cabello largo" (+$40, +60min)
                        </p>
                        <p>
                            <strong>Manicure:</strong> "Básico" (+$0), "Gel" (+$15), "Acrílico"
                            (+$25)
                        </p>
                        <p>
                            <strong>Masaje:</strong> "30 minutos" (-$20, -30min), "60 minutos"
                            (+$0), "90 minutos" (+$30, +30min)
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Dialog para crear/editar variante */}
            <Dialog
                open={isDialogOpen || editingVariant !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setIsDialogOpen(false);
                        setEditingVariant(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingVariant ? "Editar variante" : "Nueva variante"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingVariant
                                ? "Modifica los detalles de la variante"
                                : "Agrega una nueva opción para este servicio"}
                        </DialogDescription>
                    </DialogHeader>

                    <VariantForm
                        variant={editingVariant}
                        onSubmit={editingVariant ? handleUpdateVariant : handleCreateVariant}
                        onCancel={() => {
                            setIsDialogOpen(false);
                            setEditingVariant(null);
                        }}
                        isLoading={isSubmitting}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}