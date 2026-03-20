// src/components/appointments/appointment-block.tsx
"use client";

import { Clock, User, Scissors } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { getStatusInfo, type AppointmentWithRelations } from "@/lib/services/appointments";
import { appointmentsService } from "@/lib/services/appointments";

interface AppointmentBlockProps {
    appointment: AppointmentWithRelations;
    onClick?: (appointment: AppointmentWithRelations) => void;
    /** Altura en píxeles por minuto del slot (para calcular alto del bloque) */
    pxPerMinute: number;
    /** Hora de inicio del calendario (ej: 7 = 7am) */
    calendarStartHour: number;
}

export function AppointmentBlock({
    appointment,
    onClick,
    pxPerMinute,
    calendarStartHour,
}: AppointmentBlockProps) {
    const statusInfo = getStatusInfo(appointment.status || "confirmed");

    // Calcular posición y alto usando UTC (las horas se almacenan como hora reloj en UTC)
    const startDate = new Date(appointment.scheduled_at || new Date().toISOString());
    const endDate = appointment.ends_at
        ? new Date(appointment.ends_at)
        : new Date(startDate.getTime() + (appointment.duration_minutes || 30) * 60000);

    const startMinutes =
        startDate.getUTCHours() * 60 +
        startDate.getUTCMinutes() -
        calendarStartHour * 60;
    const durationMinutes = Math.max(
        appointment.duration_minutes || 30,
        (endDate.getTime() - startDate.getTime()) / (1000 * 60)
    );

    const top = Math.max(0, startMinutes * pxPerMinute);
    const height = Math.max(24, durationMinutes * pxPerMinute - 2);

    const customerName = appointment.customer
        ? `${appointment.customer.first_name} ${appointment.customer.last_name}`
        : "Cliente";
    const serviceName = appointment.service?.name || "Servicio";
    const timeRange = appointmentsService.formatTimeRange(
        appointment.scheduled_at,
        appointment.ends_at || endDate.toISOString()
    );

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    className="absolute left-1 right-1 rounded-md px-2 py-1 text-left text-xs transition-opacity hover:opacity-90 overflow-hidden z-10"
                    style={{
                        top: `${top}px`,
                        height: `${height}px`,
                        backgroundColor: statusInfo.bgColor,
                        borderLeft: `3px solid ${statusInfo.color}`,
                        color: statusInfo.color,
                    }}
                    onClick={() => onClick?.(appointment)}
                >
                    <p className="font-semibold truncate leading-tight">
                        {customerName}
                    </p>
                    {height > 36 && (
                        <p className="truncate leading-tight opacity-80">
                            {serviceName}
                        </p>
                    )}
                    {height > 52 && (
                        <p className="truncate leading-tight opacity-60">
                            {timeRange}
                        </p>
                    )}
                </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[240px] p-3">
                <div className="space-y-2">
                    <p className="font-semibold text-sm">{customerName}</p>
                    <div className="flex items-center gap-2 text-xs">
                        <Scissors className="h-3.5 w-3.5 shrink-0" />
                        <span>{serviceName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>{timeRange}</span>
                    </div>
                    {appointment.specialist && (
                        <div className="flex items-center gap-2 text-xs">
                            <User className="h-3.5 w-3.5 shrink-0" />
                            <span>{appointment.specialist.full_name}</span>
                        </div>
                    )}
                    <div
                        className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-medium mt-1"
                        style={{
                            backgroundColor: statusInfo.bgColor,
                            color: statusInfo.color,
                        }}
                    >
                        {statusInfo.label}
                    </div>
                    {appointment.workstation && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                            Puesto: {appointment.workstation.name}
                        </p>
                    )}
                </div>
            </TooltipContent>
        </Tooltip>
    );
}