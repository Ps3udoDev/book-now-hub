// src/app/t/[tenant]/services/[id]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Layers, Loader2 } from "lucide-react";
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
import { ServiceForm, type ServiceFormData } from "@/components/services";
import { useService } from "@/hooks/supabase/use-services";
import { servicesService } from "@/lib/services/services";

export default function EditServicePage() {
    const params = useParams();
    const router = useRouter();
    const tenantSlug = params.tenant as string;
    const serviceId = params.id as string;

    const { service, variants, isLoading, error, mutate } = useService(serviceId);

    const handleSubmit = async (data: ServiceFormData) => {
        try {
            await servicesService.updateService(serviceId, data);
            toast.success("Servicio actualizado");
            mutate();
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Error al actualizar"
            );
            throw error;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !service) {
        return (
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={`/t/${tenantSlug}/services`}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Servicio no encontrado</h1>
                    </div>
                </div>
                <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
                    {error || "El servicio solicitado no existe"}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/t/${tenantSlug}/services`}>
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">Editar Servicio</h1>
                    <p className="text-muted-foreground">{service.name}</p>
                </div>
                {!service.is_active && (
                    <Badge variant="outline">Inactivo</Badge>
                )}
            </div>

            {/* Card de variantes si tiene */}
            {service.has_variants && (
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Layers className="h-4 w-4" />
                                    Variantes
                                </CardTitle>
                                <CardDescription>
                                    {variants.length} variante(s) configurada(s)
                                </CardDescription>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                                <Link href={`/t/${tenantSlug}/services/${serviceId}/variants`}>
                                    Gestionar variantes
                                </Link>
                            </Button>
                        </div>
                    </CardHeader>
                    {variants.length > 0 && (
                        <CardContent className="pt-0">
                            <div className="flex flex-wrap gap-2">
                                {variants.map((v) => (
                                    <Badge key={v.id} variant="secondary">
                                        {v.name}
                                        {(v.price_modifier ?? 0) > 0 && ` (+$${v.price_modifier})`}
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Formulario */}
            <Card>
                <CardHeader>
                    <CardTitle>Información del servicio</CardTitle>
                </CardHeader>
                <CardContent>
                    <ServiceForm
                        service={service}
                        onSubmit={handleSubmit}
                        onCancel={() => router.push(`/t/${tenantSlug}/services`)}
                    />
                </CardContent>
            </Card>

            {/* Activar variantes si no tiene */}
            {!service.has_variants && (
                <div className="p-4 rounded-lg bg-muted border">
                    <p className="text-sm text-muted-foreground mb-3">
                        ¿Este servicio tiene diferentes opciones o tamaños? Activa las
                        variantes para configurar precios y duraciones diferentes.
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                            await servicesService.updateService(serviceId, {
                                has_variants: true,
                            });
                            mutate();
                            router.push(`/t/${tenantSlug}/services/${serviceId}/variants`);
                        }}
                    >
                        <Layers className="h-4 w-4 mr-2" />
                        Activar variantes
                    </Button>
                </div>
            )}
        </div>
    );
}