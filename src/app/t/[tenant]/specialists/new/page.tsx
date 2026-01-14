// src/app/t/[tenant]/specialists/new/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { SpecialistForm } from "@/components/specialists";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
    specialistsService,
    type CreateSpecialistData,
} from "@/lib/services/specialists";

export default function NewSpecialistPage() {
    const params = useParams();
    const router = useRouter();
    const tenantSlug = params.tenant as string;
    const { tenant } = useAuthStore();

    // TODO: Obtener sucursales del tenant
    const branches: never[] = [];

    const handleSubmit = async (
        data: Omit<CreateSpecialistData, "tenant_id"> & { specialties: string[] }
    ) => {
        if (!tenant?.id) {
            toast.error("Error: No se pudo identificar el tenant");
            return;
        }

        try {
            // NOTA: En producción, primero deberías crear el usuario en auth.users
            // y luego usar su ID aquí. Por ahora, generamos un UUID temporal.
            const tempUserId = crypto.randomUUID();

            await specialistsService.createSpecialist(tempUserId, {
                ...data,
                tenant_id: tenant.id,
            });

            toast.success("Especialista creado exitosamente");
            router.push(`/t/${tenantSlug}/specialists`);
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Error al crear el especialista"
            );
            throw error;
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/t/${tenantSlug}/specialists`}>
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Nuevo Especialista</h1>
                    <p className="text-muted-foreground">
                        Registra un nuevo profesional en el equipo
                    </p>
                </div>
            </div>

            {/* Formulario */}
            <Card>
                <CardHeader>
                    <CardTitle>Información del especialista</CardTitle>
                    <CardDescription>
                        Completa los datos del profesional
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SpecialistForm
                        branches={branches}
                        onSubmit={handleSubmit}
                        onCancel={() => router.push(`/t/${tenantSlug}/specialists`)}
                    />
                </CardContent>
            </Card>

            {/* Tips */}
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>💡 Siguiente paso:</strong> Después de crear el especialista,
                    podrás configurar su horario semanal y asignarle los servicios que
                    puede realizar.
                </p>
            </div>
        </div>
    );
}