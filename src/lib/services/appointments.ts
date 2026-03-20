
// src/lib/services/appointments.ts
import { createBrowserSB } from "@/lib/supabase/client";
import type { Tables } from "@/types";

type Appointment = Tables["appointments"]["Row"];

// ==================== INTERFACES ====================

export interface CreateAppointmentData {
    tenant_id: string;
    branch_id: string;
    customer_id: string;
    specialist_id: string;
    service_id: string;
    service_variant_id?: string | null;
    workstation_id?: string | null;
    scheduled_at: string; // ISO string
    ends_at: string;      // ISO string
    duration_minutes: number;
    status?: string;
    customer_notes?: string | null;
    internal_notes?: string | null;
    estimated_price?: number | null;
    currency_code?: string;
}

export interface UpdateAppointmentData {
    specialist_id?: string;
    service_id?: string;
    service_variant_id?: string | null;
    workstation_id?: string | null;
    scheduled_at?: string;
    ends_at?: string;
    status?: string;
    customer_notes?: string | null;
    internal_notes?: string | null;
    estimated_price?: number | null;
}

// Para la vista de calendario: appointment + relaciones
export interface AppointmentWithRelations extends Appointment {
    customer?: { id: string; first_name: string; last_name: string; email?: string; phone?: string } | null;
    specialist?: { id: string; full_name: string; email?: string; avatar_url?: string } | null;
    service?: { id: string; name: string; duration_minutes: number; base_price: number; category?: string } | null;
    branch?: { id: string; name: string; address?: string; email?: string } | null;
    workstation?: { id: string; name: string; code?: string } | null;
}

// Colores por status para el calendario
export const APPOINTMENT_STATUS = [
    { value: "pending", label: "Pendiente", color: "#F59E0B", bgColor: "#FEF3C7" },
    { value: "confirmed", label: "Confirmada", color: "#3B82F6", bgColor: "#DBEAFE" },
    { value: "in_progress", label: "En curso", color: "#8B5CF6", bgColor: "#EDE9FE" },
    { value: "completed", label: "Completada", color: "#10B981", bgColor: "#D1FAE5" },
    { value: "cancelled", label: "Cancelada", color: "#EF4444", bgColor: "#FEE2E2" },
    { value: "no_show", label: "No asistió", color: "#6B7280", bgColor: "#F3F4F6" },
] as const;

export function getStatusInfo(status: string) {
    return APPOINTMENT_STATUS.find((s) => s.value === status) || APPOINTMENT_STATUS[0];
}

// Horas del día para el calendario (7am - 9pm)
export const CALENDAR_HOURS = Array.from({ length: 15 }, (_, i) => i + 7);

// Slot en minutos para la grilla
export const SLOT_MINUTES = 15;

class AppointmentsService {
    private supabase = createBrowserSB();

    // Campos que siempre traemos con relaciones
    private readonly selectWithRelations = `
        *,
        customer:customers!appointments_customer_id_fkey(id, first_name, last_name, email, phone),
        specialist:profiles!appointments_specialist_id_fkey(id, full_name, email, avatar_url),
        service:services!appointments_service_id_fkey(id, name, duration_minutes, base_price, category),
        branch:branches!appointments_branch_id_fkey(id, name, address, email),
        workstation:workstations!appointments_workstation_id_fkey(id, name, code)
    `;

    // ==================== CRUD ====================

    async createAppointment(data: CreateAppointmentData): Promise<Appointment> {
        // @ts-ignore - status type mismatch in generated types vs string
        const { data: appointment, error } = await this.supabase
            .from("appointments")
            .insert({
                ...data,
                status: (data.status || "pending") as any,
                duration_minutes: data.duration_minutes,
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating appointment:", error);
            throw new Error(`Error al crear cita: ${error.message}`);
        }

        return appointment;
    }

    async updateAppointment(appointmentId: string, data: UpdateAppointmentData): Promise<Appointment> {
        const updateData: any = { ...data, updated_at: new Date().toISOString() };
        if (data.status) updateData.status = data.status as any;

        const { data: appointment, error } = await this.supabase
            .from("appointments")
            .update(updateData)
            .eq("id", appointmentId)
            .select()
            .single();

        if (error) {
            console.error("Error updating appointment:", error);
            throw new Error(`Error al actualizar cita: ${error.message}`);
        }

        return appointment;
    }

    async cancelAppointment(appointmentId: string, reason?: string): Promise<void> {
        const { error } = await this.supabase
            .from("appointments")
            .update({
                status: "cancelled" as any,
                internal_notes: reason || null,
                cancelled_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", appointmentId);

        if (error) {
            console.error("Error cancelling appointment:", error);
            throw new Error(`Error al cancelar cita: ${error.message}`);
        }
    }

    async completeAppointment(appointmentId: string): Promise<void> {
        const { error } = await this.supabase
            .from("appointments")
            .update({
                status: "completed" as any,
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", appointmentId);

        if (error) {
            console.error("Error completing appointment:", error);
            throw new Error(`Error al completar cita: ${error.message}`);
        }
    }

    async confirmAppointment(appointmentId: string): Promise<void> {
        const { error } = await this.supabase
            .from("appointments")
            .update({
                status: "confirmed" as any,
                confirmed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", appointmentId);

        if (error) {
            console.error("Error confirming appointment:", error);
            throw new Error(`Error al confirmar cita: ${error.message}`);
        }
    }

    async startAppointment(appointmentId: string): Promise<void> {
        const { error } = await this.supabase
            .from("appointments")
            .update({
                status: "in_progress" as any,
                updated_at: new Date().toISOString(),
            })
            .eq("id", appointmentId);

        if (error) {
            console.error("Error starting appointment:", error);
            throw new Error(`Error al iniciar cita: ${error.message}`);
        }
    }

    async markNoShow(appointmentId: string): Promise<void> {
        const { error } = await this.supabase
            .from("appointments")
            .update({
                status: "no_show" as any,
                updated_at: new Date().toISOString(),
            })
            .eq("id", appointmentId);

        if (error) {
            console.error("Error marking no-show:", error);
            throw new Error(`Error al marcar inasistencia: ${error.message}`);
        }
    }

    async deleteAppointment(appointmentId: string): Promise<void> {
        const { error } = await this.supabase
            .from("appointments")
            .delete()
            .eq("id", appointmentId);

        if (error) {
            console.error("Error deleting appointment:", error);
            throw new Error(`Error al eliminar cita: ${error.message}`);
        }
    }

    // ==================== QUERIES ====================

    /**
     * Obtener citas de un día específico para una sucursal (vista principal del calendario)
     */
    async getAppointmentsByDate(
        tenantId: string,
        date: string, // YYYY-MM-DD
        branchId?: string
    ): Promise<AppointmentWithRelations[]> {
        const dayStart = `${date}T00:00:00Z`;
        const dayEnd = `${date}T23:59:59Z`;

        let query = this.supabase
            .from("appointments")
            .select(this.selectWithRelations)
            .eq("tenant_id", tenantId)
            .gte("scheduled_at", dayStart)
            .lte("scheduled_at", dayEnd)
            .neq("status", "cancelled" as any)
            .order("scheduled_at");

        if (branchId) {
            query = query.eq("branch_id", branchId);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error fetching appointments by date:", error);
            throw new Error(`Error al obtener citas: ${error.message}`);
        }

        return (data as AppointmentWithRelations[]) || [];
    }

    /**
     * Obtener citas de un especialista para un rango de fechas (vista semana)
     */
    async getAppointmentsBySpecialist(
        specialistId: string,
        startDate: string,
        endDate: string
    ): Promise<AppointmentWithRelations[]> {
        const { data, error } = await this.supabase
            .from("appointments")
            .select(this.selectWithRelations)
            .eq("specialist_id", specialistId)
            .gte("scheduled_at", `${startDate}T00:00:00Z`)
            .lte("scheduled_at", `${endDate}T23:59:59Z`)
            .neq("status", "cancelled" as any)
            .order("scheduled_at");

        if (error) {
            console.error("Error fetching specialist appointments:", error);
            throw new Error(`Error al obtener citas del especialista: ${error.message}`);
        }

        return (data as AppointmentWithRelations[]) || [];
    }

    /**
     * Obtener citas de un cliente
     */
    async getAppointmentsByCustomer(
        customerId: string,
        limit = 20
    ): Promise<AppointmentWithRelations[]> {
        const { data, error } = await this.supabase
            .from("appointments")
            .select(this.selectWithRelations)
            .eq("customer_id", customerId)
            .order("scheduled_at", { ascending: false })
            .limit(limit);

        if (error) {
            console.error("Error fetching customer appointments:", error);
            throw new Error(`Error al obtener citas del cliente: ${error.message}`);
        }

        return (data as AppointmentWithRelations[]) || [];
    }

    /**
     * Obtener una cita por ID con relaciones
     */
    async getAppointmentById(appointmentId: string): Promise<AppointmentWithRelations | null> {
        const { data, error } = await this.supabase
            .from("appointments")
            .select(this.selectWithRelations)
            .eq("id", appointmentId)
            .single();

        if (error) {
            if (error.code === "PGRST116") return null;
            console.error("Error fetching appointment:", error);
            throw new Error(`Error al obtener cita: ${error.message}`);
        }

        return data as AppointmentWithRelations;
    }

    // ==================== DISPONIBILIDAD ====================

    /**
     * Verificar si un especialista está disponible en un horario dado
     */
    async isSpecialistAvailable(
        specialistId: string,
        startTime: string,
        endTime: string,
        excludeAppointmentId?: string
    ): Promise<boolean> {
        // Normalizar a ISO UTC para comparación consistente
        const startUtc = startTime.includes("Z") || startTime.includes("+")
            ? startTime
            : `${startTime}Z`;
        const endUtc = endTime.includes("Z") || endTime.includes("+")
            ? endTime
            : `${endTime}Z`;

        let query = this.supabase
            .from("appointments")
            .select("id")
            .eq("specialist_id", specialistId)
            .not("status", "in", '("cancelled","no_show")')
            .lt("scheduled_at", endUtc)
            .gt("ends_at", startUtc);

        if (excludeAppointmentId) {
            query = query.neq("id", excludeAppointmentId);
        }

        const { data } = await query;
        return (data?.length || 0) === 0;
    }

    /**
     * Verificar si un workstation está disponible
     */
    async isWorkstationAvailable(
        workstationId: string,
        startTime: string,
        endTime: string,
        excludeAppointmentId?: string
    ): Promise<boolean> {
        const startUtc = startTime.includes("Z") || startTime.includes("+")
            ? startTime
            : `${startTime}Z`;
        const endUtc = endTime.includes("Z") || endTime.includes("+")
            ? endTime
            : `${endTime}Z`;

        let query = this.supabase
            .from("appointments")
            .select("id")
            .eq("workstation_id", workstationId)
            .not("status", "in", '("cancelled","no_show")')
            .lt("scheduled_at", endUtc)
            .gt("ends_at", startUtc);

        if (excludeAppointmentId) {
            query = query.neq("id", excludeAppointmentId);
        }

        const { data } = await query;
        return (data?.length || 0) === 0;
    }

    /**
     * Obtener slots disponibles de un especialista para un día
     */
    async getAvailableSlots(
        specialistId: string,
        date: string,
        durationMinutes: number,
        branchId: string
    ): Promise<{ start: string; end: string }[]> {
        // 1. Obtener citas del día del especialista
        const appointments = await this.getAppointmentsBySpecialist(
            specialistId,
            date,
            date
        );

        // 2. Construir bloques ocupados
        const occupied = appointments.map((a) => ({
            start: new Date(a.scheduled_at).getTime(),
            end: a.ends_at ? new Date(a.ends_at).getTime() : new Date(a.scheduled_at).getTime() + (a.duration_minutes * 60000),
        }));

        // 3. Generar slots libres (7am - 9pm UTC, cada 15 min)
        const dayStart = new Date(`${date}T07:00:00Z`);
        const dayEnd = new Date(`${date}T21:00:00Z`);
        const slotMs = SLOT_MINUTES * 60 * 1000;
        const durationMs = durationMinutes * 60 * 1000;
        const slots: { start: string; end: string }[] = [];

        for (
            let t = dayStart.getTime();
            t + durationMs <= dayEnd.getTime();
            t += slotMs
        ) {
            const slotStart = t;
            const slotEnd = t + durationMs;

            const isFree = !occupied.some(
                (occ) => slotStart < occ.end && slotEnd > occ.start
            );

            if (isFree) {
                slots.push({
                    start: new Date(slotStart).toISOString(),
                    end: new Date(slotEnd).toISOString(),
                });
            }
        }

        return slots;
    }

    // ==================== ESTADÍSTICAS ====================

    async getDayStats(
        tenantId: string,
        date: string,
        branchId?: string
    ): Promise<{
        total: number;
        confirmed: number;
        completed: number;
        cancelled: number;
        noShow: number;
        pending: number;
        inProgress: number;
        revenue: number;
    }> {
        const appointments = await this.getAppointmentsByDate(tenantId, date, branchId);

        return {
            total: appointments.length,
            confirmed: appointments.filter((a) => a.status === "confirmed").length,
            completed: appointments.filter((a) => a.status === "completed").length,
            cancelled: appointments.filter((a) => a.status === "cancelled").length,
            noShow: appointments.filter((a) => a.status === "no_show").length,
            pending: appointments.filter((a) => a.status === "pending").length,
            inProgress: appointments.filter((a) => a.status === "in_progress").length,
            revenue: appointments
                .filter((a) => a.status === "completed")
                .reduce((sum, a) => sum + (Number(a.estimated_price) || 0), 0),
        };
    }

    // ==================== HELPERS ====================

    /**
     * Calcular ends_at basado en duración del servicio.
     * Trabaja en UTC para evitar desplazamiento por zona horaria.
     */
    calculateEndTime(startTime: string, durationMinutes: number): string {
        // Asegurar que se interprete como UTC
        const utcStr = startTime.includes("Z") || startTime.includes("+")
            ? startTime
            : `${startTime}Z`;
        const start = new Date(utcStr);
        start.setUTCMinutes(start.getUTCMinutes() + durationMinutes);
        return start.toISOString();
    }

    /**
     * Formatear hora para mostrar: "09:30 AM"
     * Usa UTC porque las horas se almacenan como "hora reloj" en UTC.
     */
    formatTime(dateStr: string): string {
        const d = new Date(dateStr);
        const hours = d.getUTCHours();
        const minutes = d.getUTCMinutes();
        const period = hours >= 12 ? "p.\u00a0m." : "a.\u00a0m.";
        const h12 = hours % 12 || 12;
        return `${String(h12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
    }

    /**
     * Formatear rango de hora: "09:30 a. m. - 10:30 a. m."
     */
    formatTimeRange(start: string, end: string): string {
        return `${this.formatTime(start)} - ${this.formatTime(end)}`;
    }

    /**
     * Formatear fecha: "Lunes 10 de Febrero"
     * Usa timeZone UTC para evitar desplazamiento de día.
     */
    formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString("es-VE", {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone: "UTC",
        });
    }
}

export const appointmentsService = new AppointmentsService();
