// src/app/t/[tenant]/settings/branches/new/page.tsx
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
import { BranchForm } from "@/components/branches";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
    branchesService,
    type CreateBranchData,
    type OperatingHours,
} from "@/lib/services/branches";

export default function NewBranchPage() {
    const params = useParams();
    const router = useRouter();
    const tenantSlug = params.tenant as string;
    const { tenant } = useAuthStore();

    const handleSubmit = async (
        data: Omit<CreateBranchData, "tenant_id"> & { operating_hours: OperatingHours }
    ) => {
        if (!tenant?.id) {
            toast.error("Error: No se pudo identificar el tenant");
            return;
        }

        try {
            await branchesService.createBranch({
                ...data,
                tenant_id: tenant.id,
            });

            toast.success("Sucursal creada exitosamente");
            router.push(`/t/${tenantSlug}/settings/branches`);
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Error al crear la sucursal"
            );
            throw error;
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/t/${tenantSlug}/settings/branches`}>
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Nueva Sucursal</h1>
                    <p className="text-muted-foreground">
                        Registra una nueva ubicación para tu negocio
                    </p>
                </div>
            </div>

            {/* Formulario */}
            <Card>
                <CardHeader>
                    <CardTitle>Información de la sucursal</CardTitle>
                    <CardDescription>
                        Completa los datos de la nueva sucursal
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <BranchForm
                        onSubmit={handleSubmit}
                        onCancel={() => router.push(`/t/${tenantSlug}/settings/branches`)}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
