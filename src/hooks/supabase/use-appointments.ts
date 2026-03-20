// src/hooks/supabase/use-appointments.ts
import useSWR from "swr";
import {
    appointmentsService,
    type AppointmentWithRelations,
} from "@/lib/services/appointments";

/**
 * Hook para obtener citas de un día (vista principal del calendario)
 */
export function useAppointmentsByDate(
    tenantId: string | null,
    date: string | null,
    branchId?: string
) {
    const key =
        tenantId && date
            ? `appointments:date:${tenantId}:${date}:${branchId || "all"}`
            : null;

    const { data, error, isLoading, mutate } = useSWR<AppointmentWithRelations[]>(
        key,
        () =>
            tenantId && date
                ? appointmentsService.getAppointmentsByDate(tenantId, date, branchId)
                : [],
        {
            revalidateOnFocus: false,
            dedupingInterval: 15000, // Más frecuente para citas
            refreshInterval: 60000, // Auto-refresh cada minuto
        }
    );

    return {
        appointments: data || [],
        isLoading,
        error: error?.message || null,
        mutate,
    };
}

/**
 * Hook para obtener citas de un especialista en un rango
 */
export function useAppointmentsBySpecialist(
    specialistId: string | null,
    startDate: string | null,
    endDate: string | null
) {
    const key =
        specialistId && startDate && endDate
            ? `appointments:specialist:${specialistId}:${startDate}:${endDate}`
            : null;

    const { data, error, isLoading, mutate } = useSWR<AppointmentWithRelations[]>(
        key,
        () =>
            specialistId && startDate && endDate
                ? appointmentsService.getAppointmentsBySpecialist(
                      specialistId,
                      startDate,
                      endDate
                  )
                : [],
        {
            revalidateOnFocus: false,
            dedupingInterval: 15000,
        }
    );

    return {
        appointments: data || [],
        isLoading,
        error: error?.message || null,
        mutate,
    };
}

/**
 * Hook para obtener una cita por ID
 */
export function useAppointment(appointmentId: string | null) {
    const { data, error, isLoading, mutate } = useSWR<AppointmentWithRelations | null>(
        appointmentId ? `appointment:${appointmentId}` : null,
        () =>
            appointmentId
                ? appointmentsService.getAppointmentById(appointmentId)
                : null,
        {
            revalidateOnFocus: false,
            dedupingInterval: 15000,
        }
    );

    return {
        appointment: data || null,
        isLoading,
        error: error?.message || null,
        mutate,
    };
}

/**
 * Hook para obtener citas de un cliente
 */
export function useAppointmentsByCustomer(customerId: string | null) {
    const { data, error, isLoading, mutate } = useSWR<AppointmentWithRelations[]>(
        customerId ? `appointments:customer:${customerId}` : null,
        () =>
            customerId
                ? appointmentsService.getAppointmentsByCustomer(customerId)
                : [],
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    return {
        appointments: data || [],
        isLoading,
        error: error?.message || null,
        mutate,
    };
}

/**
 * Hook para estadísticas del día
 */
export function useDayStats(
    tenantId: string | null,
    date: string | null,
    branchId?: string
) {
    const key =
        tenantId && date
            ? `appointments:stats:${tenantId}:${date}:${branchId || "all"}`
            : null;

    const { data, error, isLoading } = useSWR(
        key,
        () =>
            tenantId && date
                ? appointmentsService.getDayStats(tenantId, date, branchId)
                : null,
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    return {
        stats: data || {
            total: 0,
            confirmed: 0,
            completed: 0,
            cancelled: 0,
            noShow: 0,
            pending: 0,
            inProgress: 0,
            revenue: 0,
        },
        isLoading,
        error: error?.message || null,
    };
}