// src/app/t/[tenant]/services/new/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceForm, type ServiceFormData } from "@/components/services";
import { useAuthStore } from "@/lib/stores/auth-store";
import { servicesService } from "@/lib/services/services";

export default function NewServicePage() {
    const params = useParams();
    const router = useRouter();
    const tenantSlug = params.tenant as string;
    const { tenant } = useAuthStore();

    const handleSubmit = async (data: ServiceFormData) => {
        if (!tenant?.id) {
            toast.error("Error: No se pudo identificar el tenant");
            return;
        }

        try {
            const service = await servicesService.createService({
                ...data,
                tenant_id: tenant.id,
            });

            toast.success("Servicio creado exitosamente");

            // Si tiene variantes habilitadas, ir a configurarlas
            if (data.has_variants) {
                router.push(`/t/${tenantSlug}/services/${service.id}/variants`);
            } else {
                router.push(`/t/${tenantSlug}/services`);
            }
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Error al crear el servicio"
            );
            throw error;
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/t/${tenantSlug}/services`}>
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Nuevo Servicio</h1>
                    <p className="text-muted-foreground">
                        Configura un nuevo servicio para tu negocio
                    </p>
                </div>
            </div>

            {/* Formulario */}
            <Card>
                <CardHeader>
                    <CardTitle>Información del servicio</CardTitle>
                </CardHeader>
                <CardContent>
                    <ServiceForm
                        onSubmit={handleSubmit}
                        onCancel={() => router.push(`/t/${tenantSlug}/services`)}
                    />
                </CardContent>
            </Card>

            {/* Tip sobre variantes */}
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>💡 Tip:</strong> Si tu servicio tiene diferentes opciones (como
                    "Cabello corto/medio/largo" para un balayage), podrás configurar las
                    variantes después de crear el servicio.
                </p>
            </div>
        </div>
    );
}