// src/app/t/[tenant]/workstations/[id]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { WorkstationForm } from "@/components/workstations";
import { useWorkstation } from "@/hooks/supabase/use-workstations";

export default function EditWorkstationPage() {
    const params = useParams();
    const workstationId = params.id as string;

    const { workstation, isLoading, error } = useWorkstation(workstationId);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !workstation) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <h2 className="text-lg font-medium">Puesto no encontrado</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    El puesto de trabajo que buscas no existe o fue eliminado.
                </p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">
                    Editar puesto de trabajo
                </h1>
                <p className="text-muted-foreground">
                    {workstation.name}
                    {workstation.code && ` (${workstation.code})`}
                </p>
            </div>
            <WorkstationForm workstation={workstation} />
        </div>
    );
}