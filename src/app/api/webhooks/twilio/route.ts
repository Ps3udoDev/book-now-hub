// src/app/api/webhooks/twilio/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  processWhatsAppReply,
  type ReplyIntent,
  type ReplyTarget,
  verifyTwilioRequest,
  type WhatsAppReplyStore,
} from "@/lib/twilio/whatsapp-reply";

const RESPONSE_TEXT: Record<ReplyIntent, string> = {
  confirm: "El cliente confirmó la cita por WhatsApp.",
  cancel: "El cliente canceló la cita por WhatsApp.",
};

const supabaseStore: WhatsAppReplyStore = {
  async findRecentWhatsAppNotifications(sinceIso, limit) {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("tenant_id, recipient_id, reference_id, created_at")
      .eq("channel", "whatsapp")
      .eq("recipient_type", "customer")
      .eq("reference_type", "appointment")
      .neq("notification_type", "appointment_response")
      .in("status", ["sent", "delivered", "read"])
      .gt("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`notifications: ${error.code}`);
    return data ?? [];
  },

  async findCustomersByIds(ids) {
    const { data, error } = await supabaseAdmin
      .from("customers")
      .select("id, tenant_id, phone, phone_country_code")
      .in("id", ids);

    if (error) throw new Error(`customers: ${error.code}`);
    return data ?? [];
  },

  async updateAppointmentStatus(target: ReplyTarget, intent, nowIso) {
    const update =
      intent === "confirm"
        ? { status: "confirmed" as const, updated_at: nowIso }
        : {
            status: "cancelled" as const,
            updated_at: nowIso,
            cancelled_at: nowIso,
            cancellation_reason: "Cancelado por WhatsApp",
          };

    // Solo la cita notificada, del mismo negocio y cliente, futura y en pending/confirmed
    const { data, error } = await supabaseAdmin
      .from("appointments")
      .update(update)
      .eq("id", target.appointmentId)
      .eq("tenant_id", target.tenantId)
      .eq("customer_id", target.customerId)
      .in("status", ["pending", "confirmed"])
      .gt("scheduled_at", nowIso)
      .select("id");

    if (error) throw new Error(`appointments: ${error.code}`);
    return (data?.length ?? 0) > 0;
  },

  async logResponse(target, intent) {
    // Texto fijo: sin teléfono ni texto del cliente
    const { error } = await supabaseAdmin.from("notifications").insert({
      tenant_id: target.tenantId,
      recipient_id: target.customerId,
      recipient_type: "customer",
      channel: "whatsapp",
      status: "delivered",
      title: "Respuesta por WhatsApp",
      message: RESPONSE_TEXT[intent],
      notification_type: "appointment_response",
      reference_id: target.appointmentId,
      reference_type: "appointment",
      sent_at: new Date().toISOString(),
    });

    if (error) throw new Error(`notifications insert: ${error.code}`);
  },
};

export async function POST(request: NextRequest) {
  const config = {
    authToken: process.env.TWILIO_AUTH_TOKEN,
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    webhookUrl: process.env.TWILIO_WEBHOOK_URL,
  };

  // Sin configuración nunca se procesa sin validar
  if (!config.authToken || !config.accountSid || !config.webhookUrl) {
    return new NextResponse("Service Unavailable", { status: 503 });
  }

  // Twilio envía application/x-www-form-urlencoded
  let params: Record<string, string>;
  try {
    const formData = await request.formData();
    params = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") params[key] = value;
    }
  } catch {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // B1: firma y cuenta antes de usar ningún campo
  const verification = verifyTwilioRequest(
    config,
    request.headers.get("x-twilio-signature"),
    params,
  );
  if (verification === "unavailable") {
    return new NextResponse("Service Unavailable", { status: 503 });
  }
  if (verification !== "ok") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    await processWhatsAppReply(supabaseStore, {
      from: params.From ?? "",
      body: params.Body ?? "",
    });
  } catch (error) {
    // Sin datos del mensaje en el log
    console.error(
      "Error en webhook Twilio:",
      error instanceof Error ? error.message : "desconocido",
    );
  }

  // Twilio espera una respuesta TwiML o un 200 vacio
  return new NextResponse("OK", { status: 200 });
}
