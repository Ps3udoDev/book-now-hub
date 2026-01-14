// src/lib/services/schedules.ts
import { createBrowserSB } from "@/lib/supabase/client";
import type { Tables } from "@/types";

type SpecialistSchedule = Tables["specialist_schedules"]["Row"];
type ScheduleException = Tables["schedule_exceptions"]["Row"];

export type DayOfWeek =
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday";

export type ExceptionType = "vacation" | "sick" | "holiday" | "special_hours";

export interface CreateScheduleData {
    specialist_id: string;
    branch_id: string;
    tenant_id: string;
    day_of_week: DayOfWeek;
    start_time: string; // "09:00"
    end_time: string; // "18:00"
    break_start?: string | null;
    break_end?: string | null;
    is_active?: boolean;
}

export interface UpdateScheduleData {
    start_time?: string;
    end_time?: string;
    break_start?: string | null;
    break_end?: string | null;
    is_active?: boolean;
}

export interface CreateExceptionData {
    specialist_id?: string | null;
    branch_id?: string | null;
    exception_date: string; // "2025-01-20"
    exception_type: ExceptionType;
    start_time?: string | null;
    end_time?: string | null;
    is_day_off?: boolean;
    reason?: string | null;
}

export interface WeeklySchedule {
    monday: SpecialistSchedule | null;
    tuesday: SpecialistSchedule | null;
    wednesday: SpecialistSchedule | null;
    thursday: SpecialistSchedule | null;
    friday: SpecialistSchedule | null;
    saturday: SpecialistSchedule | null;
    sunday: SpecialistSchedule | null;
}

// Constantes
export const DAYS_OF_WEEK: { value: DayOfWeek; label: string; short: string }[] = [
    { value: "monday", label: "Lunes", short: "Lun" },
    { value: "tuesday", label: "Martes", short: "Mar" },
    { value: "wednesday", label: "Miércoles", short: "Mié" },
    { value: "thursday", label: "Jueves", short: "Jue" },
    { value: "friday", label: "Viernes", short: "Vie" },
    { value: "saturday", label: "Sábado", short: "Sáb" },
    { value: "sunday", label: "Domingo", short: "Dom" },
];

export const EXCEPTION_TYPES: { value: ExceptionType; label: string; emoji: string }[] = [
    { value: "vacation", label: "Vacaciones", emoji: "🏖️" },
    { value: "sick", label: "Enfermedad", emoji: "🤒" },
    { value: "holiday", label: "Feriado", emoji: "🎉" },
    { value: "special_hours", label: "Horario especial", emoji: "⏰" },
];

// Horarios de trabajo predefinidos
export const TIME_SLOTS = Array.from({ length: 28 }, (_, i) => {
    const hour = Math.floor(i / 2) + 6; // Desde las 6:00
    const minute = (i % 2) * 30;
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
});

class SchedulesService {
    private supabase = createBrowserSB();

    // ============================================
    // HORARIOS SEMANALES
    // ============================================

    /**
     * Obtener horarios de un especialista
     */
    async getSchedulesBySpecialist(
        specialistId: string
    ): Promise<SpecialistSchedule[]> {
        const { data, error } = await this.supabase
            .from("specialist_schedules")
            .select("*")
            .eq("specialist_id", specialistId)
            .order("day_of_week", { ascending: true });

        if (error) throw error;
        return data || [];
    }

    /**
     * Obtener horarios de un especialista por sucursal
     */
    async getSchedulesBySpecialistAndBranch(
        specialistId: string,
        branchId: string
    ): Promise<SpecialistSchedule[]> {
        const { data, error } = await this.supabase
            .from("specialist_schedules")
            .select("*")
            .eq("specialist_id", specialistId)
            .eq("branch_id", branchId)
            .order("day_of_week", { ascending: true });

        if (error) throw error;
        return data || [];
    }

    /**
     * Obtener horario semanal organizado por día
     */
    async getWeeklySchedule(
        specialistId: string,
        branchId: string
    ): Promise<WeeklySchedule> {
        const schedules = await this.getSchedulesBySpecialistAndBranch(
            specialistId,
            branchId
        );

        const weekly: WeeklySchedule = {
            monday: null,
            tuesday: null,
            wednesday: null,
            thursday: null,
            friday: null,
            saturday: null,
            sunday: null,
        };

        schedules.forEach((schedule) => {
            weekly[schedule.day_of_week as DayOfWeek] = schedule;
        });

        return weekly;
    }

    /**
     * Crear horario para un día
     */
    async createSchedule(data: CreateScheduleData): Promise<SpecialistSchedule> {
        const { data: schedule, error } = await this.supabase
            .from("specialist_schedules")
            .insert({
                specialist_id: data.specialist_id,
                branch_id: data.branch_id,
                tenant_id: data.tenant_id,
                day_of_week: data.day_of_week,
                start_time: data.start_time,
                end_time: data.end_time,
                break_start: data.break_start || null,
                break_end: data.break_end || null,
                is_active: data.is_active ?? true,
            })
            .select()
            .single();

        if (error) {
            if (error.code === "23505") {
                throw new Error("Ya existe un horario para este día");
            }
            throw error;
        }

        return schedule;
    }

    /**
     * Actualizar horario
     */
    async updateSchedule(
        scheduleId: string,
        data: UpdateScheduleData
    ): Promise<SpecialistSchedule> {
        const { data: schedule, error } = await this.supabase
            .from("specialist_schedules")
            .update(data)
            .eq("id", scheduleId)
            .select()
            .single();

        if (error) throw error;
        return schedule;
    }

    /**
     * Eliminar horario
     */
    async deleteSchedule(scheduleId: string): Promise<void> {
        const { error } = await this.supabase
            .from("specialist_schedules")
            .delete()
            .eq("id", scheduleId);

        if (error) throw error;
    }

    /**
     * Crear o actualizar horario (upsert)
     */
    async upsertSchedule(data: CreateScheduleData): Promise<SpecialistSchedule> {
        const { data: schedule, error } = await this.supabase
            .from("specialist_schedules")
            .upsert(
                {
                    specialist_id: data.specialist_id,
                    branch_id: data.branch_id,
                    tenant_id: data.tenant_id,
                    day_of_week: data.day_of_week,
                    start_time: data.start_time,
                    end_time: data.end_time,
                    break_start: data.break_start || null,
                    break_end: data.break_end || null,
                    is_active: data.is_active ?? true,
                },
                { onConflict: "specialist_id,branch_id,day_of_week" }
            )
            .select()
            .single();

        if (error) throw error;
        return schedule;
    }

    /**
     * Copiar horarios de un especialista a otro
     */
    async copySchedules(
        fromSpecialistId: string,
        toSpecialistId: string,
        branchId: string,
        tenantId: string
    ): Promise<void> {
        const sourceSchedules = await this.getSchedulesBySpecialistAndBranch(
            fromSpecialistId,
            branchId
        );

        for (const schedule of sourceSchedules) {
            await this.upsertSchedule({
                specialist_id: toSpecialistId,
                branch_id: branchId,
                tenant_id: tenantId,
                day_of_week: schedule.day_of_week as DayOfWeek,
                start_time: schedule.start_time,
                end_time: schedule.end_time,
                break_start: schedule.break_start,
                break_end: schedule.break_end,
                is_active: schedule.is_active ?? true,
            });
        }
    }

    /**
     * Aplicar plantilla de horario estándar
     */
    async applyStandardSchedule(
        specialistId: string,
        branchId: string,
        tenantId: string,
        template: "fulltime" | "morning" | "afternoon" | "weekend"
    ): Promise<void> {
        const templates = {
            fulltime: {
                days: ["monday", "tuesday", "wednesday", "thursday", "friday"] as DayOfWeek[],
                start: "09:00",
                end: "18:00",
                breakStart: "13:00",
                breakEnd: "14:00",
            },
            morning: {
                days: ["monday", "tuesday", "wednesday", "thursday", "friday"] as DayOfWeek[],
                start: "08:00",
                end: "14:00",
                breakStart: null,
                breakEnd: null,
            },
            afternoon: {
                days: ["monday", "tuesday", "wednesday", "thursday", "friday"] as DayOfWeek[],
                start: "14:00",
                end: "20:00",
                breakStart: null,
                breakEnd: null,
            },
            weekend: {
                days: ["saturday", "sunday"] as DayOfWeek[],
                start: "10:00",
                end: "18:00",
                breakStart: "14:00",
                breakEnd: "15:00",
            },
        };

        const config = templates[template];

        for (const day of config.days) {
            await this.upsertSchedule({
                specialist_id: specialistId,
                branch_id: branchId,
                tenant_id: tenantId,
                day_of_week: day,
                start_time: config.start,
                end_time: config.end,
                break_start: config.breakStart,
                break_end: config.breakEnd,
                is_active: true,
            });
        }
    }

    // ============================================
    // EXCEPCIONES DE HORARIO
    // ============================================

    /**
     * Obtener excepciones de un especialista
     */
    async getExceptionsBySpecialist(
        specialistId: string
    ): Promise<ScheduleException[]> {
        const { data, error } = await this.supabase
            .from("schedule_exceptions")
            .select("*")
            .eq("specialist_id", specialistId)
            .order("exception_date", { ascending: true });

        if (error) throw error;
        return data || [];
    }

    /**
     * Obtener excepciones en un rango de fechas
     */
    async getExceptionsByDateRange(
        specialistId: string,
        startDate: string,
        endDate: string
    ): Promise<ScheduleException[]> {
        const { data, error } = await this.supabase
            .from("schedule_exceptions")
            .select("*")
            .eq("specialist_id", specialistId)
            .gte("exception_date", startDate)
            .lte("exception_date", endDate)
            .order("exception_date", { ascending: true });

        if (error) throw error;
        return data || [];
    }

    /**
     * Obtener excepciones futuras
     */
    async getUpcomingExceptions(
        specialistId: string,
        limit: number = 10
    ): Promise<ScheduleException[]> {
        const today = new Date().toISOString().split("T")[0];

        const { data, error } = await this.supabase
            .from("schedule_exceptions")
            .select("*")
            .eq("specialist_id", specialistId)
            .gte("exception_date", today)
            .order("exception_date", { ascending: true })
            .limit(limit);

        if (error) throw error;
        return data || [];
    }

    /**
     * Crear excepción
     */
    async createException(data: CreateExceptionData): Promise<ScheduleException> {
        const { data: exception, error } = await this.supabase
            .from("schedule_exceptions")
            .insert({
                specialist_id: data.specialist_id || null,
                branch_id: data.branch_id || null,
                exception_date: data.exception_date,
                exception_type: data.exception_type,
                start_time: data.start_time || null,
                end_time: data.end_time || null,
                is_day_off: data.is_day_off ?? (data.exception_type !== "special_hours"),
                reason: data.reason || null,
            })
            .select()
            .single();

        if (error) throw error;
        return exception;
    }

    /**
     * Crear rango de vacaciones
     */
    async createVacationRange(
        specialistId: string,
        startDate: string,
        endDate: string,
        reason?: string
    ): Promise<ScheduleException[]> {
        const exceptions: ScheduleException[] = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        while (start <= end) {
            const dateStr = start.toISOString().split("T")[0];
            const exception = await this.createException({
                specialist_id: specialistId,
                exception_date: dateStr,
                exception_type: "vacation",
                is_day_off: true,
                reason: reason || "Vacaciones",
            });
            exceptions.push(exception);
            start.setDate(start.getDate() + 1);
        }

        return exceptions;
    }

    /**
     * Actualizar excepción
     */
    async updateException(
        exceptionId: string,
        data: Partial<CreateExceptionData>
    ): Promise<ScheduleException> {
        const { data: exception, error } = await this.supabase
            .from("schedule_exceptions")
            .update(data)
            .eq("id", exceptionId)
            .select()
            .single();

        if (error) throw error;
        return exception;
    }

    /**
     * Eliminar excepción
     */
    async deleteException(exceptionId: string): Promise<void> {
        const { error } = await this.supabase
            .from("schedule_exceptions")
            .delete()
            .eq("id", exceptionId);

        if (error) throw error;
    }

    /**
     * Eliminar excepciones en un rango de fechas
     */
    async deleteExceptionsInRange(
        specialistId: string,
        startDate: string,
        endDate: string
    ): Promise<void> {
        const { error } = await this.supabase
            .from("schedule_exceptions")
            .delete()
            .eq("specialist_id", specialistId)
            .gte("exception_date", startDate)
            .lte("exception_date", endDate);

        if (error) throw error;
    }

    // ============================================
    // UTILIDADES
    // ============================================

    /**
     * Verificar si un especialista trabaja un día específico
     */
    async isWorkingDay(
        specialistId: string,
        branchId: string,
        date: Date
    ): Promise<boolean> {
        const dayNames: DayOfWeek[] = [
            "sunday",
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
        ];
        const dayOfWeek = dayNames[date.getDay()];
        const dateStr = date.toISOString().split("T")[0];

        // Verificar excepciones primero
        const { data: exceptions } = await this.supabase
            .from("schedule_exceptions")
            .select("*")
            .eq("specialist_id", specialistId)
            .eq("exception_date", dateStr);

        if (exceptions && exceptions.length > 0) {
            const exception = exceptions[0];
            return !exception.is_day_off;
        }

        // Verificar horario semanal
        const { data: schedule } = await this.supabase
            .from("specialist_schedules")
            .select("*")
            .eq("specialist_id", specialistId)
            .eq("branch_id", branchId)
            .eq("day_of_week", dayOfWeek)
            .eq("is_active", true)
            .single();

        return !!schedule;
    }

    /**
     * Obtener horario efectivo para una fecha específica
     */
    async getEffectiveSchedule(
        specialistId: string,
        branchId: string,
        date: Date
    ): Promise<{ start: string; end: string; breakStart?: string; breakEnd?: string } | null> {
        const dayNames: DayOfWeek[] = [
            "sunday",
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
        ];
        const dayOfWeek = dayNames[date.getDay()];
        const dateStr = date.toISOString().split("T")[0];

        // Verificar excepciones
        const { data: exceptions } = await this.supabase
            .from("schedule_exceptions")
            .select("*")
            .eq("specialist_id", specialistId)
            .eq("exception_date", dateStr);

        if (exceptions && exceptions.length > 0) {
            const exception = exceptions[0];
            if (exception.is_day_off) return null;
            if (exception.start_time && exception.end_time) {
                return {
                    start: exception.start_time,
                    end: exception.end_time,
                };
            }
        }

        // Obtener horario semanal
        const { data: schedule } = await this.supabase
            .from("specialist_schedules")
            .select("*")
            .eq("specialist_id", specialistId)
            .eq("branch_id", branchId)
            .eq("day_of_week", dayOfWeek)
            .eq("is_active", true)
            .single();

        if (!schedule) return null;

        return {
            start: schedule.start_time,
            end: schedule.end_time,
            breakStart: schedule.break_start || undefined,
            breakEnd: schedule.break_end || undefined,
        };
    }

    /**
     * Formatear horario para mostrar
     */
    formatSchedule(schedule: SpecialistSchedule): string {
        const start = schedule.start_time.substring(0, 5);
        const end = schedule.end_time.substring(0, 5);

        if (schedule.break_start && schedule.break_end) {
            const breakStart = schedule.break_start.substring(0, 5);
            const breakEnd = schedule.break_end.substring(0, 5);
            return `${start} - ${breakStart}, ${breakEnd} - ${end}`;
        }

        return `${start} - ${end}`;
    }
}

export const schedulesService = new SchedulesService();