// src/app/api/cafe/orders/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";
import type { CafeOrderStatus, CafeOrderType } from "@/types";

const CAFE_ORDER_WITH_RELATIONS = `
  *,
  items:cafe_order_items(*),
  client:customers!cafe_orders_client_id_fkey(id, first_name, last_name, full_name),
  specialist:profiles!cafe_orders_specialist_id_fkey(id, full_name, avatar_url),
  workstation:workstations(id, name, code, cafeteria_qr_slug)
` as const;

/**
 * GET /api/cafe/orders?branch_id=...&status=...&order_type=...&tenant_id=...
 * Filtros opcionales: from, to (yyyy-mm-dd), specialist_id, client_id
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSB();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branch_id");
    const tenantId = searchParams.get("tenant_id");
    const status = searchParams.get("status");
    const orderType = searchParams.get("order_type");
    const specialistId = searchParams.get("specialist_id");
    const clientId = searchParams.get("client_id");
    const workstationId = searchParams.get("workstation_id");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    let query = supabaseAdmin
      .from("cafe_orders")
      .select(CAFE_ORDER_WITH_RELATIONS)
      .order("created_at", { ascending: false });

    if (tenantId) query = query.eq("tenant_id", tenantId);
    if (branchId) query = query.eq("branch_id", branchId);
    if (orderType) query = query.eq("order_type", orderType as CafeOrderType);
    if (specialistId) query = query.eq("specialist_id", specialistId);
    if (clientId) query = query.eq("client_id", clientId);
    if (workstationId) query = query.eq("workstation_id", workstationId);
    if (status) {
      const values = status
        .split(",")
        .map((s) => s.trim()) as CafeOrderStatus[];
      if (values.length === 1) query = query.eq("status", values[0]);
      else query = query.in("status", values);
    }
    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);

    const { data, error } = await query;
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ orders: data });
  } catch (err) {
    console.error("Error in GET /api/cafe/orders:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/cafe/orders
 * Crea un pedido con items. Calcula total via trigger.
 * Vincula automaticamente con la sesion de caja abierta (trigger DB).
 * Body: {
 *   tenant_id, branch_id, order_type (client|specialist|walkin),
 *   client_id?, specialist_id?, currency_iso?, notes?,
 *   charge_to_commissions?,
 *   items: [{ menu_item_id?, description, quantity, unit_price, notes? }]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSB();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const body = await request.json();
    const {
      tenant_id,
      branch_id,
      order_type,
      client_id,
      specialist_id,
      workstation_id,
      currency_iso,
      notes,
      charge_to_commissions,
      source,
      placed_by_name,
      placed_by_email,
      estimated_ready_at,
      items,
    } = body;

    if (!tenant_id || !branch_id || !order_type) {
      return NextResponse.json(
        { error: "tenant_id, branch_id y order_type son requeridos" },
        { status: 400 },
      );
    }

    if (!["client", "specialist", "walkin"].includes(order_type)) {
      return NextResponse.json(
        { error: "order_type invalido" },
        { status: 400 },
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "El pedido debe tener al menos un item" },
        { status: 400 },
      );
    }

    // Validar permisos segun order_type
    const { data: tenantUser } = await supabaseAdmin
      .from("tenant_users")
      .select("role")
      .eq("auth_user_id", user.id)
      .eq("tenant_id", tenant_id)
      .eq("is_active", true)
      .maybeSingle();

    if (order_type === "client") {
      // Cliente debe estar vinculado a un customer del tenant
      if (!client_id) {
        return NextResponse.json(
          { error: "client_id requerido para order_type=client" },
          { status: 400 },
        );
      }
      const { data: customer } = await supabaseAdmin
        .from("customers")
        .select("id, user_id, tenant_id")
        .eq("id", client_id)
        .single();

      if (!customer || customer.tenant_id !== tenant_id) {
        return NextResponse.json(
          { error: "Cliente no valido para este tenant" },
          { status: 400 },
        );
      }
      // Permite al cliente mismo O a staff del tenant
      const isOwnOrder = customer.user_id === user.id;
      if (!isOwnOrder && !tenantUser) {
        return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
      }
    } else if (order_type === "specialist") {
      if (!specialist_id) {
        return NextResponse.json(
          { error: "specialist_id requerido para order_type=specialist" },
          { status: 400 },
        );
      }
      const { data: ownProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("tenant_id", tenant_id)
        .eq("email", user.email || "")
        .eq("is_active", true)
        .maybeSingle();
      const isSelf = specialist_id === ownProfile?.id;
      if (!isSelf && !tenantUser) {
        return NextResponse.json(
          {
            error:
              "Sin permisos para crear pedido a nombre de otro especialista",
          },
          { status: 403 },
        );
      }
    } else {
      // walkin: requiere miembro del tenant
      if (!tenantUser) {
        return NextResponse.json(
          { error: "Sin permisos en este tenant" },
          { status: 403 },
        );
      }
    }

    // Validar items
    for (const it of items) {
      if (!it.description || it.quantity == null || it.unit_price == null) {
        return NextResponse.json(
          { error: "Cada item requiere description, quantity y unit_price" },
          { status: 400 },
        );
      }
      if (Number(it.quantity) <= 0 || Number(it.unit_price) < 0) {
        return NextResponse.json(
          { error: "quantity > 0 y unit_price >= 0" },
          { status: 400 },
        );
      }
    }

    // Crear pedido (cash_session_id lo auto-resuelve el trigger DB)
    const { data: order, error: createError } = await supabaseAdmin
      .from("cafe_orders")
      .insert({
        tenant_id,
        branch_id,
        order_type,
        client_id: client_id || null,
        specialist_id: specialist_id || null,
        workstation_id: workstation_id || null,
        currency_iso: currency_iso || "USD",
        notes: notes || null,
        charge_to_commissions: Boolean(charge_to_commissions),
        source: source || "internal",
        placed_by_name: placed_by_name || null,
        placed_by_email: placed_by_email?.toLowerCase() || null,
        estimated_ready_at: estimated_ready_at || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    // Insertar items
    const itemRows = items.map((it) => ({
      cafe_order_id: order.id,
      menu_item_id: it.menu_item_id || null,
      description: String(it.description).trim(),
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price),
      notes: it.notes || null,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from("cafe_order_items")
      .insert(itemRows);

    if (itemsError) {
      await supabaseAdmin.from("cafe_orders").delete().eq("id", order.id);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // Regresar pedido con relaciones
    const { data: complete } = await supabaseAdmin
      .from("cafe_orders")
      .select(CAFE_ORDER_WITH_RELATIONS)
      .eq("id", order.id)
      .single();

    return NextResponse.json({ order: complete }, { status: 201 });
  } catch (err) {
    console.error("Error in POST /api/cafe/orders:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
