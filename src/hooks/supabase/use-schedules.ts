// src/hooks/supabase/use-schedules.ts
import useSWR from "swr";
import {
    schedulesService,
    type WeeklySchedule,
} from "@/lib/services/schedules";
import type { Tables } from "@/types";

type SpecialistSchedule = Tables["specialist_schedules"]["Row"];
type ScheduleException = Tables["schedule_exceptions"]["Row"];

/**
 * Hook para obtener horarios de un especialista
 */
export function useSpecialistSchedules(specialistId: string | null) {
    const { data, error, isLoading, mutate } = useSWR<SpecialistSchedule[]>(
        specialistId ? `schedules:specialist:${specialistId}` : null,
        () =>
            specialistId
                ? schedulesService.getSchedulesBySpecialist(specialistId)
                : [],
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    return {
        schedules: data || [],
        isLoading,
        error: error?.message || null,
        mutate,
    };
}

/**
 * Hook para obtener horario semanal organizado por día
 */
export function useWeeklySchedule(
    specialistId: string | null,
    branchId: string | null
) {
    const { data, error, isLoading, mutate } = useSWR<WeeklySchedule>(
        specialistId && branchId
            ? `schedules:weekly:${specialistId}:${branchId}`
            : null,
        () =>
            specialistId && branchId
                ? schedulesService.getWeeklySchedule(specialistId, branchId)
                : {
                    monday: null,
                    tuesday: null,
                    wednesday: null,
                    thursday: null,
                    friday: null,
                    saturday: null,
                    sunday: null,
                },
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    return {
        schedule: data || {
            monday: null,
            tuesday: null,
            wednesday: null,
            thursday: null,
            friday: null,
            saturday: null,
            sunday: null,
        },
        isLoading,
        error: error?.message || null,
        mutate,
    };
}

/**
 * Hook para obtener excepciones de un especialista
 */
export function useScheduleExceptions(specialistId: string | null) {
    const { data, error, isLoading, mutate } = useSWR<ScheduleException[]>(
        specialistId ? `exceptions:specialist:${specialistId}` : null,
        () =>
            specialistId
                ? schedulesService.getExceptionsBySpecialist(specialistId)
                : [],
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    return {
        exceptions: data || [],
        isLoading,
        error: error?.message || null,
        mutate,
    };
}

/**
 * Hook para obtener excepciones futuras
 */
export function useUpcomingExceptions(
    specialistId: string | null,
    limit: number = 10
) {
    const { data, error, isLoading, mutate } = useSWR<ScheduleException[]>(
        specialistId ? `exceptions:upcoming:${specialistId}:${limit}` : null,
        () =>
            specialistId
                ? schedulesService.getUpcomingExceptions(specialistId, limit)
                : [],
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000,
        }
    );

    return {
        exceptions: data || [],
        isLoading,
        error: error?.message || null,
        mutate,
    };
}

/**
 * Hook para obtener excepciones en un rango de fechas
 */
export function useExceptionsByDateRange(
    specialistId: string | null,
    startDate: string | null,
    endDate: string | null
) {
    const { data, error, isLoading, mutate } = useSWR<ScheduleException[]>(
        specialistId && startDate && endDate
            ? `exceptions:range:${specialistId}:${startDate}:${endDate}`
            : null,
        () =>
            specialistId && startDate && endDate
                ? schedulesService.getExceptionsByDateRange(
                    specialistId,
                    startDate,
                    endDate
                )
                : [],
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    return {
        exceptions: data || [],
        isLoading,
        error: error?.message || null,
        mutate,
    };
}