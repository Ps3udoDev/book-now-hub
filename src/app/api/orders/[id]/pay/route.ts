// src/app/api/orders/[id]/pay/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/orders/:id/pay
 * Procesa el cobro de una comanda:
 *   1. Genera invoice + invoice_lines
 *   2. Registra invoice_payment
 *   3. Marca la comanda como 'paid'
 *
 * Body: { cash_register_id, payment_method, reference_number?, notes? }
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: orderId } = await params;
    const supabase = await createServerSB();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    // Verificar que la comanda existe y está en estado sent
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*, items:order_items(*)")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Comanda no encontrada" },
        { status: 404 },
      );
    }

    if (order.status !== "sent") {
      return NextResponse.json(
        { error: "Solo se pueden cobrar comandas en estado 'En caja'" },
        { status: 400 },
      );
    }

    const items = (
      order as unknown as {
        items: {
          id: string;
          type: string;
          item_id: string | null;
          description: string;
          quantity: number;
          unit_price: number;
          subtotal: number;
        }[];
      }
    ).items;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "La comanda no tiene ítems" },
        { status: 400 },
      );
    }

    // Verificar permisos en el tenant
    const { data: tenantUser } = await supabaseAdmin
      .from("tenant_users")
      .select("role")
      .eq("auth_user_id", user.id)
      .eq("tenant_id", order.tenant_id)
      .eq("is_active", true)
      .single();

    if (!tenantUser) {
      return NextResponse.json(
        { error: "Sin permisos en este tenant" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { cash_register_id, payment_method, reference_number, notes } = body;

    if (!cash_register_id || !payment_method) {
      return NextResponse.json(
        { error: "Campos requeridos: cash_register_id, payment_method" },
        { status: 400 },
      );
    }

    // Verificar que la caja registradora pertenece a la misma sucursal
    const { data: cashRegister } = await supabaseAdmin
      .from("cash_registers")
      .select("id, currency_iso, is_active")
      .eq("id", cash_register_id)
      .eq("branch_id", order.branch_id)
      .single();

    if (!cashRegister) {
      return NextResponse.json(
        {
          error:
            "Caja registradora no encontrada o no pertenece a esta sucursal",
        },
        { status: 400 },
      );
    }

    if (!cashRegister.is_active) {
      return NextResponse.json(
        { error: "La caja registradora está inactiva" },
        { status: 400 },
      );
    }

    // Generar número de factura único por tenant
    const { count } = await supabaseAdmin
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", order.tenant_id);

    const invoiceNumber = `INV-${String((count ?? 0) + 1).padStart(6, "0")}`;
    const now = new Date().toISOString();
    const total = items.reduce((sum, i) => sum + i.subtotal, 0);

    // 1. Crear la factura
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("invoices")
      .insert({
        tenant_id: order.tenant_id,
        branch_id: order.branch_id,
        invoice_number: invoiceNumber,
        customer_id: order.customer_id ?? null,
        order_id: orderId,
        appointment_id: order.appointment_id ?? null,
        subtotal: total,
        total,
        currency_iso: order.currency_code,
        status: "paid",
        paid_at: now,
        notes: notes || order.notes || null,
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

    // 2. Crear las líneas de factura desde los ítems de la comanda
    const invoiceLines = items.map((item) => ({
      invoice_id: invoice.id,
      line_type: item.type,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.subtotal,
      service_id: item.type === "service" ? item.item_id : null,
    }));

    const { error: linesError } = await supabaseAdmin
      .from("invoice_lines")
      .insert(invoiceLines);

    if (linesError) {
      // Revertir factura si falla la creación de líneas
      await supabaseAdmin.from("invoices").delete().eq("id", invoice.id);
      return NextResponse.json(
        { error: `Error al crear líneas: ${linesError.message}` },
        { status: 500 },
      );
    }

    // 3. Registrar el pago
    const { error: paymentError } = await supabaseAdmin
      .from("invoice_payments")
      .insert({
        invoice_id: invoice.id,
        cash_register_id,
        amount: total,
        currency_iso: order.currency_code,
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

    // 4. Marcar la comanda como pagada
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ status: "paid" })
      .eq("id", orderId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: `Error al actualizar comanda: ${updateError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({
      order: updatedOrder,
      invoice,
      invoice_number: invoiceNumber,
    });
  } catch (err) {
    console.error("Error in POST /api/orders/[id]/pay:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
