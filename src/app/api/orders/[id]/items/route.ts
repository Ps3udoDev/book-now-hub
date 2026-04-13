// src/app/api/orders/[id]/items/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

/**
 * PUT /api/orders/:id/items
 * Agrega un ítem a la comanda. Solo si está en estado draft.
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id: orderId } = await params;
    const supabase = await createServerSB();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    // Verificar que la comanda existe y está en draft
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, status, tenant_id")
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
        { error: "Solo se pueden editar comandas en estado borrador" },
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
      type,
      item_id,
      description,
      quantity,
      unit_price,
      currency_code,
      notes,
      buyer_type,
    } = body;

    if (
      !type ||
      !description ||
      quantity == null ||
      unit_price == null ||
      !currency_code
    ) {
      return NextResponse.json(
        {
          error:
            "Campos requeridos: type, description, quantity, unit_price, currency_code",
        },
        { status: 400 },
      );
    }

    if (quantity <= 0 || unit_price < 0) {
      return NextResponse.json(
        {
          error:
            "quantity debe ser mayor a 0 y unit_price no puede ser negativo",
        },
        { status: 400 },
      );
    }

    const { data: item, error } = await supabaseAdmin
      .from("order_items")
      .insert({
        order_id: orderId,
        type,
        item_id: item_id || null,
        description,
        quantity,
        unit_price,
        currency_code,
        notes: notes || null,
        buyer_type: buyer_type || "customer",
      })
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    console.error("Error in PUT /api/orders/[id]/items:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/orders/:id/items
 * Elimina un ítem de la comanda. Solo si está en estado draft.
 * Body: { item_id: string }
 */
export async function DELETE(request: NextRequest, { params }: Params) {
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
      .select("id, status, tenant_id")
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
        { error: "Solo se pueden editar comandas en estado borrador" },
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

    const body = await request.json();
    const { item_id } = body;

    if (!item_id) {
      return NextResponse.json(
        { error: "item_id es requerido" },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin
      .from("order_items")
      .delete()
      .eq("id", item_id)
      .eq("order_id", orderId);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error in DELETE /api/orders/[id]/items:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
