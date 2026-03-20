// src/components/appointments/appointment-day-grid.tsx
"use client";

import { useMemo } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AppointmentBlock } from "./appointment-block";
import { CALENDAR_HOURS, type AppointmentWithRelations } from "@/lib/services/appointments";

interface Specialist {
    id: string;
    full_name: string;
    avatar_url?: string | null;
}

interface AppointmentDayGridProps {
    appointments: AppointmentWithRelations[];
    specialists: Specialist[];
    date: string;
    onSlotClick?: (specialistId: string, hour: number, minute: number) => void;
    onAppointmentClick?: (appointment: AppointmentWithRelations) => void;
}

const PX_PER_MINUTE = 1.2; // 1.2px por minuto → 72px por hora
const HOUR_HEIGHT = 60 * PX_PER_MINUTE;
const START_HOUR = CALENDAR_HOURS[0];
const TIME_COL_WIDTH = 56;

export function AppointmentDayGrid({
    appointments,
    specialists,
    date,
    onSlotClick,
    onAppointmentClick,
}: AppointmentDayGridProps) {
    // Agrupar citas por especialista
    const appointmentsBySpecialist = useMemo(() => {
        const map = new Map<string, AppointmentWithRelations[]>();
        for (const spec of specialists) {
            map.set(spec.id, []);
        }
        for (const apt of appointments) {
            if (!apt.specialist_id) continue;
            const list = map.get(apt.specialist_id);
            if (list) list.push(apt);
        }
        return map;
    }, [appointments, specialists]);

    // Sin especialistas activos
    if (specialists.length === 0) {
        return (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                No hay especialistas activos para mostrar.
            </div>
        );
    }

    const totalHeight = CALENDAR_HOURS.length * HOUR_HEIGHT;

    return (
        <TooltipProvider delayDuration={200}>
            <div className="overflow-auto rounded-lg border bg-background">
                {/* Header: nombres de especialistas */}
                <div className="flex border-b bg-muted/30 sticky top-0 z-20">
                    {/* Columna de horas */}
                    <div
                        className="shrink-0 border-r bg-muted/50"
                        style={{ width: TIME_COL_WIDTH }}
                    />

                    {/* Columnas de especialistas */}
                    {specialists.map((spec) => (
                        <div
                            key={spec.id}
                            className="flex-1 min-w-[140px] border-r last:border-r-0 px-2 py-2.5"
                        >
                            <div className="flex items-center gap-2">
                                <Avatar className="h-7 w-7">
                                    <AvatarImage src={spec.avatar_url || undefined} />
                                    <AvatarFallback className="text-[10px]">
                                        {spec.full_name
                                            .split(" ")
                                            .map((n) => n[0])
                                            .join("")
                                            .slice(0, 2)
                                            .toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-xs font-medium truncate">
                                    {spec.full_name}
                                </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5 ml-9">
                                {appointmentsBySpecialist.get(spec.id)?.length || 0} citas
                            </p>
                        </div>
                    ))}
                </div>

                {/* Body: grilla de horas */}
                <div className="flex relative">
                    {/* Columna de horas */}
                    <div
                        className="shrink-0 border-r bg-muted/20 sticky left-0 z-10"
                        style={{ width: TIME_COL_WIDTH, height: totalHeight }}
                    >
                        {CALENDAR_HOURS.map((hour) => (
                            <div
                                key={hour}
                                className="relative border-b border-dashed"
                                style={{ height: HOUR_HEIGHT }}
                            >
                                <span className="absolute -top-2.5 right-2 text-[10px] text-muted-foreground font-mono">
                                    {String(hour).padStart(2, "0")}:00
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Columnas de especialistas con citas */}
                    {specialists.map((spec) => {
                        const specAppointments =
                            appointmentsBySpecialist.get(spec.id) || [];

                        return (
                            <div
                                key={spec.id}
                                className="flex-1 min-w-[140px] border-r last:border-r-0 relative"
                                style={{ height: totalHeight }}
                            >
                                {/* Líneas de hora */}
                                {CALENDAR_HOURS.map((hour) => (
                                    <div
                                        key={hour}
                                        className="border-b border-dashed cursor-pointer hover:bg-primary/5 transition-colors"
                                        style={{ height: HOUR_HEIGHT }}
                                        onClick={() => onSlotClick?.(spec.id, hour, 0)}
                                    >
                                        {/* Sub-divisiones de 30min */}
                                        <div
                                            className="border-b border-dotted border-muted-foreground/10"
                                            style={{ height: HOUR_HEIGHT / 2 }}
                                        />
                                    </div>
                                ))}

                                {/* Bloques de citas */}
                                {specAppointments.map((apt) => (
                                    <AppointmentBlock
                                        key={apt.id}
                                        appointment={apt}
                                        onClick={onAppointmentClick}
                                        pxPerMinute={PX_PER_MINUTE}
                                        calendarStartHour={START_HOUR}
                                    />
                                ))}
                            </div>
                        );
                    })}

                    {/* Línea de hora actual */}
                    <CurrentTimeLine startHour={START_HOUR} pxPerMinute={PX_PER_MINUTE} date={date} />
                </div>
            </div>
        </TooltipProvider>
    );
}

/** Línea roja que marca la hora actual */
function CurrentTimeLine({
    startHour,
    pxPerMinute,
    date,
}: {
    startHour: number;
    pxPerMinute: number;
    date: string;
}) {
    const now = new Date();
    // Usar fecha local para comparar con el día seleccionado
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const today = `${year}-${month}-${day}`;
    if (date !== today) return null;

    const minutesSinceStart =
        now.getHours() * 60 + now.getMinutes() - startHour * 60;
    if (minutesSinceStart < 0) return null;

    const top = minutesSinceStart * pxPerMinute;

    return (
        <div
            className="absolute left-0 right-0 z-30 pointer-events-none"
            style={{ top: `${top}px` }}
        >
            <div className="relative">
                <div
                    className="absolute -left-0 w-2.5 h-2.5 rounded-full bg-red-500"
                    style={{ top: "-4px", left: `${TIME_COL_WIDTH - 6}px` }}
                />
                <div
                    className="h-[2px] bg-red-500/70"
                    style={{ marginLeft: TIME_COL_WIDTH }}
                />
            </div>
        </div>
    );
}