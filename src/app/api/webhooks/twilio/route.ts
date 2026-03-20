// src/app/api/webhooks/twilio/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Palabras clave para confirmar o cancelar
const CONFIRM_KEYWORDS = ["yes", "si", "sí", "confirmar", "confirmo"];
const CANCEL_KEYWORDS = ["no", "cancelar", "cancelo"];

export async function POST(request: NextRequest) {
  try {
    // Twilio envía datos como application/x-www-form-urlencoded
    const formData = await request.formData();
    const body = formData.get("Body")?.toString().trim().toLowerCase() || "";
    const from = formData.get("From")?.toString() || "";

    // Extraer numero sin el prefijo "whatsapp:" y sin codigo de pais
    const rawPhone = from.replace("whatsapp:", "").replace(/^\+/, "");

    if (!body || !rawPhone) {
      return new NextResponse("OK", { status: 200 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Determinar accion
    const isConfirm = CONFIRM_KEYWORDS.some((kw) => body.includes(kw));
    const isCancel = CANCEL_KEYWORDS.some((kw) => body.includes(kw));

    if (!isConfirm && !isCancel) {
      // Respuesta no reconocida, ignorar
      return new NextResponse("OK", { status: 200 });
    }

    // Buscar customer por telefono (sin codigo de pais, buscar con LIKE al final)
    // El telefono almacenado puede tener o no el codigo de pais
    const lastDigits = rawPhone.slice(-10);
    const { data: customers } = await supabase
      .from("customers")
      .select("id, tenant_id")
      .like("phone", `%${lastDigits}`)
      .limit(5);

    if (!customers || customers.length === 0) {
      return new NextResponse("OK", { status: 200 });
    }

    const customerIds = customers.map((c) => c.id);

    // Buscar la cita mas reciente de este customer que este pending o confirmed
    const { data: appointment, error } = await supabase
      .from("appointments")
      .select("id, tenant_id, customer_id, status")
      .in("customer_id", customerIds)
      .in("status", ["pending", "confirmed"])
      .order("scheduled_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !appointment) {
      return new NextResponse("OK", { status: 200 });
    }

    const newStatus = isConfirm ? "confirmed" : "cancelled";

    // Actualizar status de la cita
    const updateData: Record<string, string> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (isCancel) {
      updateData.cancelled_at = new Date().toISOString();
      updateData.cancellation_reason = "Cancelado por WhatsApp";
    }

    await supabase
      .from("appointments")
      .update(updateData)
      .eq("id", appointment.id);

    // Registrar en notifications
    await supabase.from("notifications").insert({
      tenant_id: appointment.tenant_id,
      recipient_id: appointment.customer_id,
      recipient_type: "customer",
      channel: "whatsapp",
      status: "sent",
      title: `Respuesta WhatsApp: ${newStatus}`,
      message: `Cliente respondio "${body}" desde ${from}. Cita ${newStatus}.`,
      notification_type: "appointment_response",
      reference_id: appointment.id,
      reference_type: "appointment",
      sent_at: new Date().toISOString(),
    });

    // Twilio espera una respuesta TwiML o un 200 vacio
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Error en webhook Twilio:", error);
    return new NextResponse("OK", { status: 200 });
  }
}
