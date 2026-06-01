// src/app/api/client/history/[id]/route.ts
// Detalle de una cita del historial del cliente con servicios y pagos asociados.
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireClientCustomer } from "../../_utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireClientCustomer(request);
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;
  const admin = supabaseAdmin;

  const { data: appointment, error } = await admin
    .from("appointments")
    .select(
      `
      id,
      scheduled_at,
      ends_at,
      duration_minutes,
      status,
      estimated_price,
      currency_code,
      customer_notes,
      completed_at,
      cancelled_at,
      cancellation_reason,
      service_id,
      services(id, name, category, image_url),
      specialist_id,
      profiles:specialist_id(id, full_name, avatar_url),
      branch_id,
      branches(id, name)
      `,
    )
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id)
    .eq("customer_id", ctx.customer.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!appointment) {
    return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  }

  const [{ data: appointmentServices }, { data: paidOrders }] =
    await Promise.all([
      admin
        .from("appointment_services")
        .select(
          `
          id,
          service_id,
          service_variant_id,
          specialist_id,
          price,
          duration_minutes,
          services(id, name, category, image_url),
          service_variants(id, name),
          profiles:specialist_id(id, full_name, avatar_url)
          `,
        )
        .eq("appointment_id", id),
      admin
        .from("orders")
        .select("id, total, currency_code, paid_at, status")
        .eq("appointment_id", id)
        .eq("status", "paid"),
    ]);

  const orderIds = ((paidOrders || []) as Array<{ id: string }>).map(
    (order) => order.id,
  );
  const payments: Array<{
    id: string;
    payment_method: string | null;
    amount: number;
    currency_code: string | null;
    paid_at: string | null;
    reference_number: string | null;
  }> = [];

  if (orderIds.length > 0) {
    const { data: invoices } = await admin
      .from("invoices")
      .select("id, order_id, currency_iso")
      .in("order_id", orderIds);

    const invoiceIds = ((invoices || []) as Array<{ id: string }>).map(
      (invoice) => invoice.id,
    );
    const invoiceCurrency = new Map(
      (
        (invoices || []) as Array<{ id: string; currency_iso: string | null }>
      ).map((invoice) => [invoice.id, invoice.currency_iso]),
    );

    if (invoiceIds.length > 0) {
      const { data: invoicePayments } = await admin
        .from("invoice_payments")
        .select(
          "id, invoice_id, payment_method, amount, currency_iso, created_at, reference_number",
        )
        .in("invoice_id", invoiceIds);

      for (const payment of invoicePayments || []) {
        const row = payment as {
          id: string;
          invoice_id: string;
          payment_method: string | null;
          amount: number;
          currency_iso: string | null;
          created_at: string | null;
          reference_number: string | null;
        };
        payments.push({
          id: row.id,
          payment_method: row.payment_method,
          amount: Number(row.amount),
          currency_code:
            row.currency_iso ?? invoiceCurrency.get(row.invoice_id) ?? null,
          paid_at: row.created_at,
          reference_number: row.reference_number,
        });
      }
    }
  }

  const paidOrder = (
    (paidOrders || []) as Array<{
      total: number;
      currency_code: string;
      paid_at: string | null;
    }>
  )[0];

  return NextResponse.json({
    appointment: {
      ...appointment,
      paid_amount: paidOrder ? Number(paidOrder.total) : null,
      paid_currency: paidOrder?.currency_code ?? null,
      paid_at: paidOrder?.paid_at ?? null,
      rating: null,
      appointment_services: appointmentServices ?? [],
      payments,
    },
  });
}
