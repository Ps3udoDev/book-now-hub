// src/app/t/[tenant]/settings/branches/[id]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
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
import { useBranch } from "@/hooks/supabase/use-branches";
import {
    branchesService,
    type UpdateBranchData,
    type OperatingHours,
} from "@/lib/services/branches";

export default function EditBranchPage() {
    const params = useParams();
    const router = useRouter();
    const tenantSlug = params.tenant as string;
    const branchId = params.id as string;

    const { branch, isLoading, mutate } = useBranch(branchId);

    const handleSubmit = async (
        data: UpdateBranchData & { operating_hours: OperatingHours }
    ) => {
        try {
            await branchesService.updateBranch(branchId, data);
            toast.success("Sucursal actualizada exitosamente");
            mutate();
            router.push(`/t/${tenantSlug}/settings/branches`);
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Error al actualizar la sucursal"
            );
            throw error;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!branch) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <h2 className="text-xl font-semibold mb-2">Sucursal no encontrada</h2>
                <p className="text-muted-foreground mb-4">
                    La sucursal que buscas no existe o fue eliminada.
                </p>
                <Button asChild>
                    <Link href={`/t/${tenantSlug}/settings/branches`}>
                        Volver a sucursales
                    </Link>
                </Button>
            </div>
        );
    }

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
                    <h1 className="text-2xl font-bold">Editar Sucursal</h1>
                    <p className="text-muted-foreground">{branch.name}</p>
                </div>
            </div>

            {/* Formulario */}
            <Card>
                <CardHeader>
                    <CardTitle>Información de la sucursal</CardTitle>
                    <CardDescription>
                        Modifica los datos de la sucursal
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <BranchForm
                        branch={branch}
                        onSubmit={handleSubmit}
                        onCancel={() => router.push(`/t/${tenantSlug}/settings/branches`)}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
