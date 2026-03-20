// src/app/api/appointments/[id]/advance/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";

/** Obtiene la tasa de cambio vigente entre dos monedas (valid_until IS NULL). */
async function getExchangeRateSnapshot(
  fromCurrency: string,
  toCurrency: string,
): Promise<number | null> {
  if (fromCurrency === toCurrency) return 1;
  const { data } = await supabaseAdmin
    .from("exchange_rates")
    .select("rate")
    .eq("from_currency", fromCurrency)
    .eq("to_currency", toCurrency)
    .is("valid_until", null)
    .maybeSingle();
  return data ? Number(data.rate) : null;
}

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/appointments/:id/advance
 * Registra un pago de anticipo para una cita:
 *   1. Crea invoice (type=advance) + invoice_lines
 *   2. Crea invoice_payment
 *   3. El trigger sync_appointment_advance actualiza advance_paid_amount en appointments
 *
 * Body: { cash_register_id, payment_method, amount, reference_number? }
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: appointmentId } = await params;

    // Autenticación
    const supabase = await createServerSB();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Obtener la cita con el servicio
    const { data: appointment, error: apptError } = await supabaseAdmin
      .from("appointments")
      .select("*, service:services(id, name, base_price)")
      .eq("id", appointmentId)
      .single();

    if (apptError || !appointment) {
      return NextResponse.json(
        { error: "Cita no encontrada" },
        { status: 404 },
      );
    }

    // Verificar permisos en el tenant
    const { data: tenantUser } = await supabaseAdmin
      .from("tenant_users")
      .select("role")
      .eq("auth_user_id", user.id)
      .eq("tenant_id", appointment.tenant_id)
      .eq("is_active", true)
      .single();

    if (!tenantUser) {
      return NextResponse.json(
        { error: "Sin permisos en este tenant" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { cash_register_id, payment_method, amount, reference_number } = body;

    if (
      !cash_register_id ||
      !payment_method ||
      !amount ||
      Number(amount) <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Campos requeridos: cash_register_id, payment_method, amount (debe ser mayor a 0)",
        },
        { status: 400 },
      );
    }

    const amountNum = Number(amount);

    // Verificar caja registradora (debe pertenecer a la misma sucursal)
    const { data: cashRegister } = await supabaseAdmin
      .from("cash_registers")
      .select("id, currency_iso, is_active, branch_id")
      .eq("id", cash_register_id)
      .eq("branch_id", appointment.branch_id)
      .single();

    if (!cashRegister) {
      return NextResponse.json(
        { error: "Caja registradora no encontrada para esta sucursal" },
        { status: 400 },
      );
    }

    if (!cashRegister.is_active) {
      return NextResponse.json(
        { error: "La caja registradora está inactiva" },
        { status: 400 },
      );
    }

    // Obtener snapshot de tasa de cambio al momento del anticipo
    const exchangeRate = await getExchangeRateSnapshot(
      cashRegister.currency_iso,
      "USD",
    );
    const amountInBase = exchangeRate ? amountNum * exchangeRate : null;

    // Generar número de factura único por tenant
    const { count } = await supabaseAdmin
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", appointment.tenant_id);

    const invoiceNumber = `INV-${String((count ?? 0) + 1).padStart(6, "0")}`;
    const now = new Date().toISOString();

    // 1. Crear la factura de anticipo
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("invoices")
      .insert({
        tenant_id: appointment.tenant_id,
        branch_id: appointment.branch_id,
        invoice_number: invoiceNumber,
        customer_id: appointment.customer_id ?? null,
        appointment_id: appointmentId,
        subtotal: amountNum,
        total: amountNum,
        currency_iso: cashRegister.currency_iso,
        exchange_rate_snapshot: exchangeRate,
        amount_local: amountInBase,
        // @ts-expect-error — columna type añadida en fase2-tarea3-cobros.sql
        type: "advance",
        status: "paid",
        paid_at: now,
        notes: `Anticipo — cita ${appointmentId}`,
        created_by: user.id,
      })
      .select()
      .single();

    if (invoiceError) {
      return NextResponse.json(
        { error: `Error al crear factura: ${invoiceError.message}` },
        { status: 500 },
      );
    }

    // 2. Crear línea de factura (el anticipo como ítem de servicio)
    const service = (appointment as any).service as {
      id: string;
      name: string;
      base_price: number;
    } | null;

    const { error: lineError } = await supabaseAdmin
      .from("invoice_lines")
      .insert({
        invoice_id: invoice.id,
        line_type: "service",
        description: service?.name
          ? `Anticipo — ${service.name}`
          : "Anticipo de pago",
        quantity: 1,
        unit_price: amountNum,
        total: amountNum,
        service_id: appointment.service_id ?? null,
      });

    if (lineError) {
      // Revertir factura si falla la línea
      await supabaseAdmin.from("invoices").delete().eq("id", invoice.id);
      return NextResponse.json(
        { error: `Error al crear línea de factura: ${lineError.message}` },
        { status: 500 },
      );
    }

    // 3. Registrar el pago con snapshot de tasa de cambio
    const { error: paymentError } = await supabaseAdmin
      .from("invoice_payments")
      .insert({
        invoice_id: invoice.id,
        cash_register_id,
        amount: amountNum,
        currency_iso: cashRegister.currency_iso,
        exchange_rate: exchangeRate,
        amount_in_base_currency: amountInBase,
        payment_method,
        reference_number: reference_number || null,
      });

    if (paymentError) {
      await supabaseAdmin.from("invoices").delete().eq("id", invoice.id);
      return NextResponse.json(
        { error: `Error al registrar pago: ${paymentError.message}` },
        { status: 500 },
      );
    }

    // El trigger sync_appointment_advance actualiza advance_paid_amount automáticamente.
    // También actualizamos advance_amount si aún no estaba seteado.
    await supabaseAdmin
      .from("appointments")
      .update({ advance_amount: amountNum })
      .eq("id", appointmentId)
      .eq("advance_amount", 0); // solo si todavía es 0

    return NextResponse.json({
      invoice,
      invoice_number: invoiceNumber,
      amount: amountNum,
      currency: cashRegister.currency_iso,
    });
  } catch (err) {
    console.error("Error in POST /api/appointments/[id]/advance:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
