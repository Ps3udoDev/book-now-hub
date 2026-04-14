// src/app/api/orders/[id]/pay/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

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

interface PaymentEntry {
  payment_method: string;
  amount: number;
  reference_number?: string | null;
}

type OrderItem = {
  id: string;
  type: string;
  item_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  buyer_type?: string;
};

type ProductOrderItem = OrderItem & {
  type: "product";
  item_id: string;
};

/**
 * POST /api/orders/:id/pay
 * Procesa el cobro de una comanda con uno o varios métodos de pago:
 *   1. Genera invoice + invoice_lines
 *   2. Registra un invoice_payment por cada entrada en payments[]
 *   3. Marca la comanda como 'paid'
 *
 * Body: {
 *   cash_register_id: string,
 *   payments: Array<{ payment_method, amount, reference_number? }>,
 *   notes?: string,
 * }
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

    const items = (order as unknown as { items: OrderItem[] }).items;

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
    const {
      cash_register_id,
      payments,
      notes,
      document_type,
      customer_name: bodyCustomerName,
      customer_document: bodyCustomerDocument,
      customer_address: bodyCustomerAddress,
    }: {
      cash_register_id: string;
      payments: PaymentEntry[];
      notes?: string;
      document_type?: "nota_debito" | "factura";
      customer_name?: string | null;
      customer_document?: string | null;
      customer_address?: string | null;
    } = body;

    if (!cash_register_id) {
      return NextResponse.json(
        { error: "Campo requerido: cash_register_id" },
        { status: 400 },
      );
    }

    if (!Array.isArray(payments) || payments.length === 0) {
      return NextResponse.json(
        { error: "Se requiere al menos un método de pago en payments[]" },
        { status: 400 },
      );
    }

    // Validar cada entrada del array de pagos
    for (const p of payments) {
      if (!p.payment_method || !p.amount || Number(p.amount) <= 0) {
        return NextResponse.json(
          {
            error: "Cada pago debe tener payment_method y amount mayor a 0",
          },
          { status: 400 },
        );
      }
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

    // Verificar que el usuario tiene perfil en este tenant (FK invoices.created_by → profiles.id)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .eq("tenant_id", order.tenant_id)
      .maybeSingle();
    const createdById = profile?.id ?? null;

    const total = items.reduce((sum, i) => sum + i.subtotal, 0);

    // Validar que la suma de pagos cubre el total (tolerancia de 1 centavo)
    const paymentsTotal = payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    if (Math.abs(paymentsTotal - total) > 0.01) {
      return NextResponse.json(
        {
          error: `La suma de pagos (${paymentsTotal.toFixed(2)}) no coincide con el total (${total.toFixed(2)})`,
        },
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

    // Obtener snapshot de tasa de cambio al momento del cobro
    const exchangeRate = await getExchangeRateSnapshot(
      order.currency_code,
      "USD",
    );
    const amountLocal = exchangeRate ? total * exchangeRate : null;

    // 1. Crear la factura/nota de débito
    const docType = document_type || "nota_debito";
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("invoices")
      .insert({
        tenant_id: order.tenant_id,
        branch_id: order.branch_id,
        invoice_number: invoiceNumber,
        document_type: docType,
        customer_id: order.customer_id ?? null,
        customer_name: bodyCustomerName || null,
        customer_document: bodyCustomerDocument || null,
        customer_address: bodyCustomerAddress || null,
        order_id: orderId,
        appointment_id: order.appointment_id ?? null,
        subtotal: total,
        total,
        currency_iso: order.currency_code,
        exchange_rate_snapshot: exchangeRate,
        amount_local: amountLocal,
        status: "paid",
        paid_at: now,
        notes: notes || order.notes || null,
        created_by: createdById,
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
      await supabaseAdmin.from("invoices").delete().eq("id", invoice.id);
      return NextResponse.json(
        { error: `Error al crear líneas: ${linesError.message}` },
        { status: 500 },
      );
    }

    // 3. Obtener la sesión de caja activa para vincular los pagos
    const { data: activeSession } = await supabaseAdmin
      .from("cash_register_sessions")
      .select("id")
      .eq("branch_id", order.branch_id)
      .eq("status", "open")
      .maybeSingle();

    const sessionId = activeSession?.id ?? null;

    // 4. Registrar un invoice_payment por cada método de pago
    const paymentRows = payments.map((p) => {
      const amt = Number(p.amount);
      const amtBase = exchangeRate ? amt * exchangeRate : null;
      return {
        invoice_id: invoice.id,
        cash_register_id,
        amount: amt,
        currency_iso: order.currency_code,
        exchange_rate: exchangeRate,
        amount_in_base_currency: amtBase,
        payment_method: p.payment_method,
        reference_number: p.reference_number || null,
        session_id: sessionId,
      };
    });

    const { error: paymentError } = await supabaseAdmin
      .from("invoice_payments")
      .insert(paymentRows);

    if (paymentError) {
      await supabaseAdmin.from("invoices").delete().eq("id", invoice.id);
      return NextResponse.json(
        { error: `Error al registrar pagos: ${paymentError.message}` },
        { status: 500 },
      );
    }

    // 5. Procesar items de tipo producto: descontar stock + registrar deudas
    const productItems = items.filter(
      (i): i is ProductOrderItem => i.type === "product" && i.item_id !== null,
    );

    for (const item of productItems) {
      const buyerType =
        (item as unknown as { buyer_type?: string }).buyer_type || "customer";
      const movementType =
        buyerType === "specialist" ? "specialist_withdrawal" : "exit";

      // Crear movimiento de inventario (descuento de stock)
      await supabaseAdmin.from("inventory_movements").insert({
        product_id: item.item_id,
        branch_id: order.branch_id,
        movement_type: movementType,
        quantity: item.quantity,
        reason:
          buyerType === "specialist"
            ? `Compra de especialista — Comanda ${orderId.slice(0, 8)}`
            : `Venta al cliente — Comanda ${orderId.slice(0, 8)}`,
        specialist_id: buyerType === "specialist" ? order.specialist_id : null,
        reference_id: orderId,
        created_by: user.id,
      });

      // Si es compra del especialista, crear deuda
      if (buyerType === "specialist") {
        const debtAmount = item.subtotal;
        await supabaseAdmin.from("specialist_debts").insert({
          tenant_id: order.tenant_id,
          specialist_id: order.specialist_id,
          description: item.description,
          original_amount: debtAmount,
          remaining_amount: debtAmount,
          currency_code: order.currency_code,
          source_type: "product_purchase",
          source_order_item_id: item.id,
          created_by: user.id,
        });
      }
    }

    // 6. Marcar la comanda como pagada
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
