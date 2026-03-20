// src/components/appointments/appointment-week-view.tsx
"use client";

import { useMemo } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppointmentBlock } from "./appointment-block";
import { CALENDAR_HOURS, type AppointmentWithRelations } from "@/lib/services/appointments";

interface AppointmentWeekViewProps {
    appointments: AppointmentWithRelations[];
    weekStart: string; // YYYY-MM-DD (lunes)
    onSlotClick?: (date: string, hour: number, minute: number) => void;
    onAppointmentClick?: (appointment: AppointmentWithRelations) => void;
}

const PX_PER_MINUTE = 1.2;
const HOUR_HEIGHT = 60 * PX_PER_MINUTE;
const START_HOUR = CALENDAR_HOURS[0];
const TIME_COL_WIDTH = 56;

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function getWeekDates(weekStart: string): string[] {
    const start = new Date(weekStart + "T00:00:00");
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return d.toISOString().slice(0, 10);
    });
}

export function AppointmentWeekView({
    appointments,
    weekStart,
    onSlotClick,
    onAppointmentClick,
}: AppointmentWeekViewProps) {
    const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
    const today = new Date().toISOString().slice(0, 10);

    // Agrupar citas por fecha
    const appointmentsByDate = useMemo(() => {
        const map = new Map<string, AppointmentWithRelations[]>();
        for (const date of weekDates) {
            map.set(date, []);
        }
        for (const apt of appointments) {
            const date = (apt.scheduled_at || "").slice(0, 10);
            const list = map.get(date);
            if (list) list.push(apt);
        }
        return map;
    }, [appointments, weekDates]);

    const totalHeight = CALENDAR_HOURS.length * HOUR_HEIGHT;

    return (
        <TooltipProvider delayDuration={200}>
            <div className="overflow-auto rounded-lg border bg-background">
                {/* Header: días de la semana */}
                <div className="flex border-b bg-muted/30 sticky top-0 z-20">
                    <div
                        className="shrink-0 border-r bg-muted/50"
                        style={{ width: TIME_COL_WIDTH }}
                    />
                    {weekDates.map((date, i) => {
                        const dayNum = new Date(date + "T12:00:00").getDate();
                        const isToday = date === today;
                        return (
                            <div
                                key={date}
                                className={`flex-1 min-w-[100px] border-r last:border-r-0 px-2 py-2 text-center ${isToday ? "bg-primary/5" : ""
                                    }`}
                            >
                                <p className="text-[10px] text-muted-foreground uppercase">
                                    {WEEKDAY_LABELS[i]}
                                </p>
                                <p
                                    className={`text-sm font-semibold ${isToday
                                            ? "bg-primary text-primary-foreground w-7 h-7 rounded-full inline-flex items-center justify-center"
                                            : ""
                                        }`}
                                >
                                    {dayNum}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                    {appointmentsByDate.get(date)?.length || 0} citas
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* Body */}
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

                    {/* Columnas por día */}
                    {weekDates.map((date) => {
                        const dayAppointments = appointmentsByDate.get(date) || [];
                        const isToday = date === today;

                        return (
                            <div
                                key={date}
                                className={`flex-1 min-w-[100px] border-r last:border-r-0 relative ${isToday ? "bg-primary/[0.02]" : ""
                                    }`}
                                style={{ height: totalHeight }}
                            >
                                {CALENDAR_HOURS.map((hour) => (
                                    <div
                                        key={hour}
                                        className="border-b border-dashed cursor-pointer hover:bg-primary/5 transition-colors"
                                        style={{ height: HOUR_HEIGHT }}
                                        onClick={() => onSlotClick?.(date, hour, 0)}
                                    >
                                        <div
                                            className="border-b border-dotted border-muted-foreground/10"
                                            style={{ height: HOUR_HEIGHT / 2 }}
                                        />
                                    </div>
                                ))}

                                {dayAppointments.map((apt) => (
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
                </div>
            </div>
        </TooltipProvider>
    );
}