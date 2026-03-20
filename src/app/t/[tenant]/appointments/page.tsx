// src/app/t/[tenant]/appointments/page.tsx
"use client";

import { useState, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Download,
    CalendarDays,
    CalendarRange,
    Loader2,
    RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AppointmentDayGrid,
    AppointmentWeekView,
    AppointmentFormDialog,
    AppointmentDetailSheet,
    DayStatsBar,
} from "@/components/appointments";
import {
    useAppointmentsByDate,
    useAppointmentsBySpecialist,
    useDayStats,
} from "@/hooks/supabase/use-appointments";
import { useActiveBranches } from "@/hooks/supabase/use-branches";
import { useAuthStore } from "@/lib/stores/auth-store";
import { downloadDayReport } from "@/lib/utils/appointment-export";
import { type AppointmentWithRelations } from "@/lib/services/appointments";
import { createBrowserSB } from "@/lib/supabase/client";
import useSWR from "swr";
import type { Tables } from "@/types";

type Customer = Tables["customers"]["Row"];

// ==================== HELPERS ====================

function formatDateISO(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr + "T12:00:00");
    d.setDate(d.getDate() + days);
    return formatDateISO(d);
}

function getMonday(dateStr: string): string {
    const d = new Date(dateStr + "T12:00:00");
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return formatDateISO(d);
}

// ==================== PAGE ====================

export default function AppointmentsPage() {
    const params = useParams();
    const tenantSlug = params.tenant as string;
    const { tenant } = useAuthStore();
    const tenantId = tenant?.id || null;

    // Estado de la vista
    const [selectedDate, setSelectedDate] = useState(formatDateISO(new Date()));
    const [viewMode, setViewMode] = useState<"day" | "week">("day");
    const [selectedSpecialistId, setSelectedSpecialistId] = useState<string>("all");
    const [selectedBranchId, setSelectedBranchId] = useState<string>("all");

    // Dialog states
    const [formDialogOpen, setFormDialogOpen] = useState(false);
    const [detailSheetOpen, setDetailSheetOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] =
        useState<AppointmentWithRelations | null>(null);
    const [formPrefill, setFormPrefill] = useState<{
        specialistId?: string;
        date?: string;
        hour?: number;
        minute?: number;
    }>({});

    // Branches
    const { branches } = useActiveBranches(tenantId);
    const activeBranchId =
        selectedBranchId !== "all"
            ? selectedBranchId
            : branches.length > 0
              ? branches[0].id
              : "";

    // Especialistas activos del tenant
    const { specialists, isLoading: loadingSpecs } = useSpecialists(tenantId);

    // Clientes para el formulario
    const { customers } = useCustomers(tenantId);

    // Filtrar especialistas por branch si aplica
    const filteredSpecialists = useMemo(() => {
        if (selectedSpecialistId !== "all") {
            return specialists.filter((s) => s.id === selectedSpecialistId);
        }
        return specialists;
    }, [specialists, selectedSpecialistId]);

    // Week dates
    const weekStart = useMemo(() => getMonday(selectedDate), [selectedDate]);
    const weekEnd = addDays(weekStart, 6);

    // Data: citas del día (vista día)
    const {
        appointments: dayAppointments,
        isLoading: loadingDay,
        mutate: mutateDayAppointments,
    } = useAppointmentsByDate(
        tenantId,
        viewMode === "day" ? selectedDate : null,
        activeBranchId || undefined
    );

    // Data: citas de la semana para un especialista (vista semana)
    const {
        appointments: weekAppointments,
        isLoading: loadingWeek,
        mutate: mutateWeekAppointments,
    } = useAppointmentsBySpecialist(
        viewMode === "week" && selectedSpecialistId !== "all"
            ? selectedSpecialistId
            : null,
        weekStart,
        weekEnd
    );

    // Stats del día
    const { stats } = useDayStats(tenantId, selectedDate, activeBranchId || undefined);

    // Navegación de fecha
    const goToday = () => setSelectedDate(formatDateISO(new Date()));
    const goPrev = () =>
        setSelectedDate((d) => addDays(d, viewMode === "day" ? -1 : -7));
    const goNext = () =>
        setSelectedDate((d) => addDays(d, viewMode === "day" ? 1 : 7));

    // Handlers
    const handleSlotClick = useCallback(
        (specialistIdOrDate: string, hour: number, minute: number) => {
            if (viewMode === "day") {
                // specialistIdOrDate es el specialistId
                setFormPrefill({
                    specialistId: specialistIdOrDate,
                    date: selectedDate,
                    hour,
                    minute,
                });
            } else {
                // specialistIdOrDate es la fecha
                setFormPrefill({
                    specialistId:
                        selectedSpecialistId !== "all" ? selectedSpecialistId : undefined,
                    date: specialistIdOrDate,
                    hour,
                    minute,
                });
            }
            setSelectedAppointment(null);
            setFormDialogOpen(true);
        },
        [viewMode, selectedDate, selectedSpecialistId]
    );

    const handleAppointmentClick = useCallback(
        (appointment: AppointmentWithRelations) => {
            setSelectedAppointment(appointment);
            setDetailSheetOpen(true);
        },
        []
    );

    const handleEditFromDetail = (appointment: AppointmentWithRelations) => {
        setSelectedAppointment(appointment);
        setFormPrefill({});
        setFormDialogOpen(true);
    };

    const refreshAll = () => {
        mutateDayAppointments();
        mutateWeekAppointments();
    };

    const handleExport = () => {
        const data = viewMode === "day" ? dayAppointments : weekAppointments;
        downloadDayReport(data, selectedDate);
        toast.success("Reporte exportado");
    };

    // Auto-switch a vista semana si selecciono un especialista
    const handleSpecialistChange = (value: string) => {
        setSelectedSpecialistId(value);
        if (value !== "all") {
            setViewMode("week");
        } else {
            setViewMode("day");
        }
    };

    const isLoading = loadingDay || loadingWeek || loadingSpecs;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Agenda
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {viewMode === "day"
                            ? "Vista general del día"
                            : selectedSpecialistId !== "all"
                              ? `Semana de ${specialists.find((s) => s.id === selectedSpecialistId)?.full_name || "especialista"}`
                              : "Vista semanal"}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleExport}>
                        <Download className="mr-1.5 h-4 w-4" />
                        Exportar
                    </Button>
                    <Button size="sm" onClick={() => {
                        setSelectedAppointment(null);
                        setFormPrefill({ date: selectedDate });
                        setFormDialogOpen(true);
                    }}>
                        <Plus className="mr-1.5 h-4 w-4" />
                        Nueva cita
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <DayStatsBar stats={stats} date={selectedDate} />

            {/* Controles de navegación y filtros */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {/* Navegación de fecha */}
                <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={goPrev}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={goToday}>
                        Hoy
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={goNext}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                    />
                </div>

                {/* Filtro de especialista */}
                <Select value={selectedSpecialistId} onValueChange={handleSpecialistChange}>
                    <SelectTrigger className="w-[200px] h-8 text-sm">
                        <SelectValue placeholder="Todos los especialistas" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los especialistas</SelectItem>
                        {specialists.map((spec) => (
                            <SelectItem key={spec.id} value={spec.id}>
                                {spec.full_name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Filtro de sucursal (si hay más de una) */}
                {branches.length > 1 && (
                    <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                        <SelectTrigger className="w-[180px] h-8 text-sm">
                            <SelectValue placeholder="Sucursal" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las sucursales</SelectItem>
                            {branches.map((b) => (
                                <SelectItem key={b.id} value={b.id}>
                                    {b.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                {/* Toggle vista */}
                <div className="flex items-center gap-1 ml-auto">
                    <Button
                        variant={viewMode === "day" ? "default" : "outline"}
                        size="sm"
                        className="h-8"
                        onClick={() => {
                            setViewMode("day");
                            setSelectedSpecialistId("all");
                        }}
                    >
                        <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                        Día
                    </Button>
                    <Button
                        variant={viewMode === "week" ? "default" : "outline"}
                        size="sm"
                        className="h-8"
                        onClick={() => setViewMode("week")}
                        disabled={selectedSpecialistId === "all"}
                        title={
                            selectedSpecialistId === "all"
                                ? "Selecciona un especialista para ver la vista semanal"
                                : undefined
                        }
                    >
                        <CalendarRange className="mr-1.5 h-3.5 w-3.5" />
                        Semana
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={refreshAll}
                        disabled={isLoading}
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    </Button>
                </div>
            </div>

            {/* Calendario */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : viewMode === "day" ? (
                <AppointmentDayGrid
                    appointments={dayAppointments}
                    specialists={filteredSpecialists}
                    date={selectedDate}
                    onSlotClick={handleSlotClick}
                    onAppointmentClick={handleAppointmentClick}
                />
            ) : selectedSpecialistId !== "all" ? (
                <AppointmentWeekView
                    appointments={weekAppointments}
                    weekStart={weekStart}
                    onSlotClick={handleSlotClick}
                    onAppointmentClick={handleAppointmentClick}
                />
            ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <CalendarRange className="h-12 w-12 mb-3 opacity-50" />
                    <p>Selecciona un especialista para ver su vista semanal.</p>
                </div>
            )}

            {/* Dialog de crear/editar cita */}
            <AppointmentFormDialog
                open={formDialogOpen}
                onOpenChange={setFormDialogOpen}
                prefill={formPrefill}
                appointment={selectedAppointment}
                specialists={specialists}
                customers={customers}
                branchId={activeBranchId}
                onSaved={refreshAll}
            />

            {/* Sheet de detalle */}
            <AppointmentDetailSheet
                appointment={selectedAppointment}
                open={detailSheetOpen}
                onOpenChange={setDetailSheetOpen}
                onEdit={handleEditFromDetail}
                onStatusChanged={refreshAll}
            />
        </div>
    );
}

// ==================== HOOKS LOCALES ====================

/** Hook para obtener especialistas activos */
function useSpecialists(tenantId: string | null) {
    const { data, error, isLoading } = useSWR(
        tenantId ? `specialists:active:${tenantId}` : null,
        async () => {
            if (!tenantId) return [];
            const supabase = createBrowserSB();
            const { data, error } = await supabase
                .from("profiles")
                .select("id, full_name, avatar_url, email, branch_id")
                .eq("tenant_id", tenantId)
                .eq("is_specialist", true)
                .eq("is_active", true)
                .order("full_name");

            if (error) throw error;
            return data || [];
        },
        { revalidateOnFocus: false, dedupingInterval: 30000 }
    );

    return {
        specialists: data || [],
        isLoading,
    };
}

/** Hook para obtener clientes del tenant */
function useCustomers(tenantId: string | null) {
    const { data } = useSWR<Customer[]>(
        tenantId ? `customers:all:${tenantId}` : null,
        async () => {
            if (!tenantId) return [];
            const supabase = createBrowserSB();
            const { data, error } = await supabase
                .from("customers")
                .select("*")
                .eq("tenant_id", tenantId)
                .order("first_name");

            if (error) throw error;
            return data || [];
        },
        { revalidateOnFocus: false, dedupingInterval: 30000 }
    );

    return { customers: data || [] };
}