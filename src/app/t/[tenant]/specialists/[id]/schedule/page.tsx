// src/app/t/[tenant]/specialists/[id]/schedule/page.tsx
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScheduleEditor, ExceptionManager } from "@/components/specialists";
import { useSpecialist } from "@/hooks/supabase/use-specialists";
import {
    useWeeklySchedule,
    useUpcomingExceptions,
} from "@/hooks/supabase/use-schedules";

export default function SpecialistSchedulePage() {
    const params = useParams();
    const tenantSlug = params.tenant as string;
    const specialistId = params.id as string;

    const { specialist, isLoading: loadingSpecialist } =
        useSpecialist(specialistId);

    // Usar branch_id del especialista o un default
    // TODO: En producción, deberías tener una forma de seleccionar la sucursal
    const branchId = specialist?.branch_id || "";

    const {
        schedule: weeklySchedule,
        isLoading: loadingSchedule,
        mutate: mutateSchedule,
    } = useWeeklySchedule(specialistId, branchId || null);

    const {
        exceptions,
        isLoading: loadingExceptions,
        mutate: mutateExceptions,
    } = useUpcomingExceptions(specialistId, 20);

    const isLoading = loadingSpecialist || loadingSchedule || loadingExceptions;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!specialist) {
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
            </div>
        );
    }

    // Si no tiene sucursal asignada, mostrar advertencia
    if (!branchId) {
        return (
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={`/t/${tenantSlug}/specialists/${specialistId}`}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Horarios</h1>
                        <p className="text-muted-foreground">{specialist.full_name}</p>
                    </div>
                </div>

                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Sucursal requerida</AlertTitle>
                    <AlertDescription>
                        Para configurar horarios, el especialista debe tener una sucursal
                        asignada. Ve al perfil del especialista y asigna una sucursal
                        primero.
                    </AlertDescription>
                </Alert>

                <Button asChild>
                    <Link href={`/t/${tenantSlug}/specialists/${specialistId}`}>
                        Ir al perfil del especialista
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/t/${tenantSlug}/specialists/${specialistId}`}>
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Horarios y Disponibilidad</h1>
                    <p className="text-muted-foreground">{specialist.full_name}</p>
                </div>
            </div>

            {/* Editor de horario semanal */}
            <ScheduleEditor
                specialistId={specialistId}
                branchId={branchId}
                tenantId={specialist.tenant_id}
                weeklySchedule={weeklySchedule}
                onUpdate={() => mutateSchedule()}
            />

            {/* Gestor de excepciones */}
            <ExceptionManager
                specialistId={specialistId}
                exceptions={exceptions}
                onUpdate={() => mutateExceptions()}
            />

            {/* Información adicional */}
            <div className="p-4 rounded-lg bg-muted">
                <h3 className="font-medium mb-2">💡 Notas importantes</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                    <li>
                        • El horario semanal define la disponibilidad base del especialista
                    </li>
                    <li>
                        • Las excepciones (vacaciones, permisos) sobrescriben el horario
                        base
                    </li>
                    <li>
                        • Los cambios se reflejan inmediatamente en el calendario de citas
                    </li>
                    <li>
                        • Las citas existentes NO se cancelan automáticamente al cambiar
                        horarios
                    </li>
                </ul>
            </div>
        </div>
    );
}