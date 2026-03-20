// src/lib/utils/appointment-export.ts
import { type AppointmentWithRelations } from "@/lib/services/appointments";
import { appointmentsService, getStatusInfo } from "@/lib/services/appointments";

/**
 * Genera un CSV con las citas del día para exportar
 */
export function exportAppointmentsToCSV(
    appointments: AppointmentWithRelations[],
    date: string
): string {
    const headers = [
        "Hora inicio",
        "Hora fin",
        "Cliente",
        "Teléfono",
        "Email",
        "Servicio",
        "Especialista",
        "Puesto",
        "Estado",
        "Precio",
        "Notas",
    ];

    const rows = appointments.map((apt) => {
        const customer = apt.customer
            ? `${apt.customer.first_name} ${apt.customer.last_name}`
            : "";
        return [
            appointmentsService.formatTime(apt.scheduled_at),
            apt.ends_at ? appointmentsService.formatTime(apt.ends_at) : "",
            customer,
            apt.customer?.phone || "",
            apt.customer?.email || "",
            apt.service?.name || "",
            apt.specialist?.full_name || "",
            apt.workstation?.name || "",
            getStatusInfo(apt.status || "confirmed").label,
            apt.estimated_price?.toFixed(2) || "",
            (apt.customer_notes || apt.internal_notes || "").replace(/"/g, '""'),
        ];
    });

    const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
            row.map((cell) => `"${cell}"`).join(",")
        ),
    ].join("\n");

    // BOM para que Excel abra correctamente con acentos
    return "\uFEFF" + csvContent;
}

/**
 * Descarga un archivo CSV desde el navegador
 */
export function downloadCSV(content: string, filename: string): void {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Genera y descarga el reporte del día
 */
export function downloadDayReport(
    appointments: AppointmentWithRelations[],
    date: string
): void {
    const csv = exportAppointmentsToCSV(appointments, date);
    const formattedDate = date.replace(/-/g, "");
    downloadCSV(csv, `citas-${formattedDate}.csv`);
}