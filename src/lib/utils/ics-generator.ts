// src/lib/utils/ics-generator.ts

export interface ICSEventData {
    title: string;
    description?: string;
    location?: string;
    startTime: Date;
    endTime: Date;
    organizerName?: string;
    organizerEmail?: string;
    attendeeName?: string;
    attendeeEmail?: string;
    uid?: string;
    reminderMinutes?: number;
}

/**
 * Genera un string en formato .ics (iCalendar) para adjuntar a emails.
 * Gmail, Outlook y Apple Mail lo detectan automáticamente y ofrecen
 * "Agregar al calendario".
 */
export function generateICS(event: ICSEventData): string {
    const uid = event.uid || `${Date.now()}-${Math.random().toString(36).slice(2)}@elvisstudio`;
    const now = formatICSDate(new Date());
    const start = formatICSDate(event.startTime);
    const end = formatICSDate(event.endTime);
    const reminder = event.reminderMinutes ?? 30;

    const lines: string[] = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Elvis Studio//Booking System//ES",
        "CALSCALE:GREGORIAN",
        "METHOD:REQUEST",
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${now}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${escapeICSText(event.title)}`,
    ];

    if (event.description) {
        lines.push(`DESCRIPTION:${escapeICSText(event.description)}`);
    }

    if (event.location) {
        lines.push(`LOCATION:${escapeICSText(event.location)}`);
    }

    if (event.organizerEmail) {
        const cn = event.organizerName ? `;CN=${event.organizerName}` : "";
        lines.push(`ORGANIZER${cn}:mailto:${event.organizerEmail}`);
    }

    if (event.attendeeEmail) {
        const cn = event.attendeeName ? `;CN=${event.attendeeName}` : "";
        lines.push(
            `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED${cn}:mailto:${event.attendeeEmail}`
        );
    }

    // Recordatorio
    lines.push(
        "BEGIN:VALARM",
        "TRIGGER:-PT" + reminder + "M",
        "ACTION:DISPLAY",
        `DESCRIPTION:Recordatorio: ${escapeICSText(event.title)}`,
        "END:VALARM"
    );

    lines.push("END:VEVENT", "END:VCALENDAR");

    return lines.join("\r\n");
}

/**
 * Genera ICS para el cliente
 */
export function generateClientICS(params: {
    serviceName: string;
    specialistName: string;
    branchName: string;
    branchAddress?: string;
    startTime: Date;
    endTime: Date;
    clientName: string;
    clientEmail: string;
    branchEmail?: string;
    appointmentId: string;
}): string {
    return generateICS({
        title: `Cita: ${params.serviceName} - Elvis Studio`,
        description: [
            `Servicio: ${params.serviceName}`,
            `Especialista: ${params.specialistName}`,
            `Sucursal: ${params.branchName}`,
            "",
            "¡Te esperamos! Si necesitas reagendar, contáctanos con anticipación.",
        ].join("\\n"),
        location: params.branchAddress || params.branchName,
        startTime: params.startTime,
        endTime: params.endTime,
        attendeeName: params.clientName,
        attendeeEmail: params.clientEmail,
        organizerEmail: params.branchEmail,
        organizerName: "Elvis Studio",
        uid: `appointment-${params.appointmentId}@elvisstudio`,
        reminderMinutes: 60,
    });
}

/**
 * Genera ICS para el especialista
 */
export function generateSpecialistICS(params: {
    serviceName: string;
    clientName: string;
    branchName: string;
    branchAddress?: string;
    startTime: Date;
    endTime: Date;
    specialistName: string;
    specialistEmail: string;
    workstationName?: string;
    appointmentId: string;
    notes?: string;
}): string {
    const descParts = [
        `Cliente: ${params.clientName}`,
        `Servicio: ${params.serviceName}`,
        `Sucursal: ${params.branchName}`,
    ];
    if (params.workstationName) {
        descParts.push(`Puesto: ${params.workstationName}`);
    }
    if (params.notes) {
        descParts.push("", `Notas: ${params.notes}`);
    }

    return generateICS({
        title: `${params.clientName} - ${params.serviceName}`,
        description: descParts.join("\\n"),
        location: params.branchAddress || params.branchName,
        startTime: params.startTime,
        endTime: params.endTime,
        attendeeName: params.specialistName,
        attendeeEmail: params.specialistEmail,
        organizerName: "Elvis Studio",
        uid: `appointment-spec-${params.appointmentId}@elvisstudio`,
        reminderMinutes: 15,
    });
}

/**
 * Convierte un Date a formato iCalendar: 20250209T143000Z
 */
function formatICSDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Escapa caracteres especiales para iCalendar
 */
function escapeICSText(text: string): string {
    return text
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        .replace(/\n/g, "\\n");
}

/**
 * Convierte el string ICS a un Blob (útil para descargas del lado del cliente)
 */
export function icsToBlob(icsContent: string): Blob {
    return new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
}

/**
 * Convierte el string ICS a base64 (útil para adjuntar a emails)
 */
export function icsToBase64(icsContent: string): string {
    if (typeof Buffer !== "undefined") {
        return Buffer.from(icsContent, "utf-8").toString("base64");
    }
    return btoa(unescape(encodeURIComponent(icsContent)));
}