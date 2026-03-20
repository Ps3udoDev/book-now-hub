// src/app/api/orders/[id]/send/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/orders/:id/send
 * Cambia el estado de la comanda a `sent`.
 * Dispara el evento Realtime hacia caja.
 */
export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const { id: orderId } = await params;
    const supabase = await createServerSB();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, status, tenant_id, items:order_items(id)")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Comanda no encontrada" },
        { status: 404 },
      );
    }

    if (order.status !== "draft") {
      return NextResponse.json(
        { error: "Solo se pueden enviar comandas en estado borrador" },
        { status: 400 },
      );
    }

    const items = (order as unknown as { items: { id: string }[] }).items;
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "La comanda debe tener al menos un ítem antes de enviarse" },
        { status: 400 },
      );
    }

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

    const { data: updated, error } = await supabaseAdmin
      .from("orders")
      .update({ status: "sent" })
      .eq("id", orderId)
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ order: updated });
  } catch (err) {
    console.error("Error in POST /api/orders/[id]/send:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
