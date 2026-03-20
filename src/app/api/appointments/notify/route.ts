// src/app/api/appointments/notify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import twilio from "twilio";
import {
  generateClientICS,
  generateSpecialistICS,
  icsToBase64,
} from "@/lib/utils/ics-generator";

// Email (Resend)
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "Elvis Studio <onboarding@resend.dev>";

// WhatsApp (Twilio)
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";
const TWILIO_CONTENT_SID = process.env.TWILIO_CONTENT_SID;

interface NotifyRequest {
  appointmentId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: NotifyRequest = await request.json();
    const { appointmentId } = body;

    if (!appointmentId) {
      return NextResponse.json(
        { error: "appointmentId es requerido" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Obtener la cita con relaciones (incluye phone_country_code del customer)
    const { data: appointment, error } = await supabase
      .from("appointments")
      .select(`
        *,
        customer:customers!appointments_customer_id_fkey(
          id, first_name, last_name, email, phone, phone_country_code
        ),
        specialist:profiles!appointments_specialist_id_fkey(
          id, full_name, email
        ),
        service:services!appointments_service_id_fkey(
          id, name, duration_minutes, base_price
        ),
        branch:branches!appointments_branch_id_fkey(
          id, name, address, email, phone
        ),
        workstation:workstations!appointments_workstation_id_fkey(
          id, name, code
        )
      `)
      .eq("id", appointmentId)
      .single();

    if (error || !appointment) {
      return NextResponse.json(
        { error: "Cita no encontrada" },
        { status: 404 }
      );
    }

    const customerName = appointment.customer
      ? `${appointment.customer.first_name} ${appointment.customer.last_name}`
      : "Cliente";
    const specialistName = appointment.specialist?.full_name || "Especialista";
    const serviceName = appointment.service?.name || "Servicio";
    const branchName = appointment.branch?.name || "Elvis Studio";
    const startTime = new Date(appointment.scheduled_at);
    const endTime = new Date(appointment.ends_at);

    const notifiedChannels: string[] = [];

    // Formatear fecha y hora con timezone UTC (consistente con almacenamiento)
    const dateFormatted = startTime.toLocaleDateString("es-VE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
    const timeFormatted = startTime.toLocaleTimeString("es-VE", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    });

    // 1. Email al cliente
    if (appointment.customer?.email) {
      try {
        const clientICS = generateClientICS({
          serviceName,
          specialistName,
          branchName,
          branchAddress: appointment.branch?.address || undefined,
          startTime,
          endTime,
          clientName: customerName,
          clientEmail: appointment.customer.email,
          branchEmail: appointment.branch?.email || undefined,
          appointmentId: appointment.id,
        });

        await sendEmail({
          to: appointment.customer.email,
          subject: `Confirmacion de cita - ${serviceName} en ${branchName}`,
          html: buildClientEmailHTML({
            customerName,
            serviceName,
            specialistName,
            branchName,
            branchAddress: appointment.branch?.address || "",
            branchPhone: appointment.branch?.phone || "",
            date: dateFormatted,
            time: timeFormatted,
            duration: appointment.service?.duration_minutes || 60,
            price: appointment.estimated_price,
          }),
          icsContent: clientICS,
          icsFilename: "cita.ics",
        });

        await logNotification(supabase, {
          tenant_id: appointment.tenant_id,
          recipient_id: appointment.customer.id,
          recipient_type: "customer",
          channel: "email",
          status: "sent",
          title: `Confirmacion de cita - ${serviceName}`,
          message: `Email enviado a ${appointment.customer.email}`,
          notification_type: "appointment_confirmation",
          reference_id: appointmentId,
          reference_type: "appointment",
        });

        notifiedChannels.push(`email:cliente(${appointment.customer.email})`);
      } catch (emailErr) {
        console.error("Error enviando email al cliente:", emailErr);
        await logNotification(supabase, {
          tenant_id: appointment.tenant_id,
          recipient_id: appointment.customer.id,
          recipient_type: "customer",
          channel: "email",
          status: "failed",
          title: `Confirmacion de cita - ${serviceName}`,
          message: `Error enviando email a ${appointment.customer.email}`,
          notification_type: "appointment_confirmation",
          reference_id: appointmentId,
          reference_type: "appointment",
          error_message: emailErr instanceof Error ? emailErr.message : "Error desconocido",
        });
      }
    }

    // 2. Email al especialista
    if (appointment.specialist?.email) {
      try {
        const specialistICS = generateSpecialistICS({
          serviceName,
          clientName: customerName,
          branchName,
          branchAddress: appointment.branch?.address || undefined,
          startTime,
          endTime,
          specialistName,
          specialistEmail: appointment.specialist.email,
          workstationName: appointment.workstation?.name || undefined,
          appointmentId: appointment.id,
          notes: appointment.customer_notes || appointment.internal_notes || undefined,
        });

        await sendEmail({
          to: appointment.specialist.email,
          subject: `Nueva cita: ${customerName} - ${serviceName}`,
          html: buildSpecialistEmailHTML({
            specialistName,
            customerName,
            customerPhone: appointment.customer?.phone || "",
            serviceName,
            branchName,
            workstationName: appointment.workstation?.name || null,
            date: dateFormatted,
            time: timeFormatted,
            duration: appointment.service?.duration_minutes || 60,
            notes: appointment.customer_notes || appointment.internal_notes || null,
          }),
          icsContent: specialistICS,
          icsFilename: "cita-trabajo.ics",
        });

        await logNotification(supabase, {
          tenant_id: appointment.tenant_id,
          recipient_id: appointment.specialist.id,
          recipient_type: "specialist",
          channel: "email",
          status: "sent",
          title: `Nueva cita: ${customerName}`,
          message: `Email enviado a ${appointment.specialist.email}`,
          notification_type: "appointment_confirmation",
          reference_id: appointmentId,
          reference_type: "appointment",
        });

        notifiedChannels.push(`email:especialista(${appointment.specialist.email})`);
      } catch (emailErr) {
        console.error("Error enviando email al especialista:", emailErr);
        await logNotification(supabase, {
          tenant_id: appointment.tenant_id,
          recipient_id: appointment.specialist.id,
          recipient_type: "specialist",
          channel: "email",
          status: "failed",
          title: `Nueva cita: ${customerName}`,
          message: `Error enviando email a ${appointment.specialist.email}`,
          notification_type: "appointment_confirmation",
          reference_id: appointmentId,
          reference_type: "appointment",
          error_message: emailErr instanceof Error ? emailErr.message : "Error desconocido",
        });
      }
    }

    // 3. WhatsApp al cliente (si tiene telefono y Twilio configurado)
    if (appointment.customer?.phone && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
      try {
        const phoneCountryCode = appointment.customer.phone_country_code || "+58";
        const cleanPhone = appointment.customer.phone.replace(/\D/g, "");
        const whatsappTo = `whatsapp:${phoneCountryCode}${cleanPhone}`;

        await sendWhatsApp({
          to: whatsappTo,
          dateFormatted,
          timeFormatted,
        });

        await logNotification(supabase, {
          tenant_id: appointment.tenant_id,
          recipient_id: appointment.customer.id,
          recipient_type: "customer",
          channel: "whatsapp",
          status: "sent",
          title: `Confirmacion de cita - ${serviceName}`,
          message: `WhatsApp enviado a ${whatsappTo}`,
          notification_type: "appointment_confirmation",
          reference_id: appointmentId,
          reference_type: "appointment",
        });

        notifiedChannels.push(`whatsapp:cliente(${whatsappTo})`);
      } catch (waErr) {
        console.error("Error enviando WhatsApp:", waErr);
        await logNotification(supabase, {
          tenant_id: appointment.tenant_id,
          recipient_id: appointment.customer.id,
          recipient_type: "customer",
          channel: "whatsapp",
          status: "failed",
          title: `Confirmacion de cita - ${serviceName}`,
          message: `Error enviando WhatsApp`,
          notification_type: "appointment_confirmation",
          reference_id: appointmentId,
          reference_type: "appointment",
          error_message: waErr instanceof Error ? waErr.message : "Error desconocido",
        });
      }
    }

    return NextResponse.json({
      success: true,
      notifiedChannels,
    });
  } catch (error) {
    console.error("Error sending notifications:", error);
    return NextResponse.json(
      { error: "Error al enviar notificaciones" },
      { status: 500 }
    );
  }
}

// ==================== WHATSAPP (TWILIO) ====================

async function sendWhatsApp(params: {
  to: string;
  dateFormatted: string;
  timeFormatted: string;
}) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.warn("Twilio no configurado, WhatsApp no enviado a:", params.to);
    return;
  }

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  if (TWILIO_CONTENT_SID) {
    // Usar Content Template aprobado por WhatsApp
    await client.messages.create({
      from: TWILIO_WHATSAPP_FROM,
      to: params.to,
      contentSid: TWILIO_CONTENT_SID,
      contentVariables: JSON.stringify({
        "1": params.dateFormatted,
        "2": params.timeFormatted,
      }),
    });
  } else {
    // Fallback: mensaje de texto simple (solo funciona en sandbox)
    await client.messages.create({
      from: TWILIO_WHATSAPP_FROM,
      to: params.to,
      body: `Hola! Tu cita ha sido confirmada para el ${params.dateFormatted} a las ${params.timeFormatted}. Responde "si" para confirmar o "no" para cancelar.`,
    });
  }
}

// ==================== EMAIL SENDER (Resend SDK) ====================

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  icsContent: string;
  icsFilename: string;
}) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY no configurada, email no enviado a:", params.to);
    return;
  }

  const resend = new Resend(RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [params.to],
    subject: params.subject,
    html: params.html,
    attachments: [
      {
        filename: params.icsFilename,
        content: icsToBase64(params.icsContent),
        contentType: "text/calendar; method=REQUEST",
      },
    ],
  });

  if (error) {
    console.error("Resend error:", error);
    throw new Error(`Error enviando email: ${error.message}`);
  }

  console.log("Email enviado:", data);
}

// ==================== NOTIFICATION LOGGER ====================

// biome-ignore lint: accept any supabase client type
async function logNotification(
  supabase: any,
  data: {
    tenant_id: string;
    recipient_id: string;
    recipient_type: string;
    channel: string;
    status: string;
    title: string;
    message: string;
    notification_type: string;
    reference_id?: string;
    reference_type?: string;
    error_message?: string;
  }
) {
  try {
    await supabase.from("notifications").insert({
      tenant_id: data.tenant_id,
      recipient_id: data.recipient_id,
      recipient_type: data.recipient_type,
      channel: data.channel,
      status: data.status,
      title: data.title,
      message: data.message,
      notification_type: data.notification_type,
      reference_id: data.reference_id || null,
      reference_type: data.reference_type || null,
      error_message: data.error_message || null,
      sent_at: data.status === "sent" ? new Date().toISOString() : null,
    });
  } catch (err) {
    console.error("Error logging notification:", err);
  }
}

// ==================== EMAIL TEMPLATES ====================

function buildClientEmailHTML(data: {
  customerName: string;
  serviceName: string;
  specialistName: string;
  branchName: string;
  branchAddress: string;
  branchPhone: string;
  date: string;
  time: string;
  duration: number;
  price: number | null;
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
    <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="font-size: 24px; color: #1a1a1a; margin: 0;">Elvis Studio</h1>
        <p style="color: #666; margin-top: 4px;">Confirmacion de cita</p>
    </div>

    <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
        <p style="margin: 0 0 16px;">Hola <strong>${data.customerName}</strong>,</p>
        <p style="margin: 0 0 16px;">Tu cita ha sido confirmada. Aqui tienes los detalles:</p>

        <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #666;">Servicio</td><td style="padding: 8px 0; font-weight: 600;">${data.serviceName}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Especialista</td><td style="padding: 8px 0; font-weight: 600;">${data.specialistName}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Fecha</td><td style="padding: 8px 0; font-weight: 600; text-transform: capitalize;">${data.date}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Hora</td><td style="padding: 8px 0; font-weight: 600;">${data.time}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Duracion</td><td style="padding: 8px 0; font-weight: 600;">${data.duration} min</td></tr>
            ${data.price ? `<tr><td style="padding: 8px 0; color: #666;">Precio</td><td style="padding: 8px 0; font-weight: 600;">$${data.price.toFixed(2)}</td></tr>` : ""}
        </table>
    </div>

    <div style="background: #fff3cd; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 14px;"><strong>${data.branchName}</strong></p>
        ${data.branchAddress ? `<p style="margin: 4px 0 0; font-size: 13px; color: #666;">${data.branchAddress}</p>` : ""}
        ${data.branchPhone ? `<p style="margin: 4px 0 0; font-size: 13px; color: #666;">${data.branchPhone}</p>` : ""}
    </div>

    <p style="font-size: 13px; color: #666; text-align: center;">
        Adjuntamos un archivo de calendario para que puedas agregar la cita automaticamente.<br>
        Si necesitas reagendar, contactanos con anticipacion.
    </p>

    <p style="font-size: 13px; color: #999; text-align: center; margin-top: 24px;">
        Te esperamos! -- Elvis Studio
    </p>
</body>
</html>`;
}

function buildSpecialistEmailHTML(data: {
  specialistName: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  branchName: string;
  workstationName: string | null;
  date: string;
  time: string;
  duration: number;
  notes: string | null;
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
    <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="font-size: 24px; color: #1a1a1a; margin: 0;">Nueva cita asignada</h1>
    </div>

    <div style="background: #e8f4fd; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
        <p style="margin: 0 0 16px;">Hola <strong>${data.specialistName}</strong>,</p>
        <p style="margin: 0 0 16px;">Tienes una nueva cita programada:</p>

        <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #666;">Cliente</td><td style="padding: 8px 0; font-weight: 600;">${data.customerName}</td></tr>
            ${data.customerPhone ? `<tr><td style="padding: 8px 0; color: #666;">Telefono</td><td style="padding: 8px 0;">${data.customerPhone}</td></tr>` : ""}
            <tr><td style="padding: 8px 0; color: #666;">Servicio</td><td style="padding: 8px 0; font-weight: 600;">${data.serviceName}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Fecha</td><td style="padding: 8px 0; font-weight: 600; text-transform: capitalize;">${data.date}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Hora</td><td style="padding: 8px 0; font-weight: 600;">${data.time}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Duracion</td><td style="padding: 8px 0; font-weight: 600;">${data.duration} min</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Sucursal</td><td style="padding: 8px 0;">${data.branchName}</td></tr>
            ${data.workstationName ? `<tr><td style="padding: 8px 0; color: #666;">Puesto</td><td style="padding: 8px 0;">${data.workstationName}</td></tr>` : ""}
        </table>
    </div>

    ${
      data.notes
        ? `<div style="background: #fff3cd; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 14px;"><strong>Notas:</strong> ${data.notes}</p>
    </div>`
        : ""
    }

    <p style="font-size: 13px; color: #666; text-align: center;">
        Se adjunta archivo de calendario para agregar automaticamente a tu agenda.
    </p>
</body>
</html>`;
}
