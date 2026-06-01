import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";

type Params = { params: Promise<{ tenantSlug: string; qrSlug: string }> };
type PublicOrderItemInput = {
  menu_item_id?: string | null;
  quantity?: number;
  notes?: string | null;
};

const PUBLIC_CAFE_ORDER_WITH_RELATIONS = `
  id,
  order_number,
  status,
  total,
  currency_iso,
  created_at,
  estimated_ready_at,
  placed_by_name,
  items:cafe_order_items(id, description, quantity, unit_price, subtotal, notes),
  workstation:workstations(id, name, code, cafeteria_qr_slug)
` as const;

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { tenantSlug, qrSlug } = await params;
    const supabase = await createServerSB();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: contextRows, error: contextError } = await supabaseAdmin.rpc(
      "get_public_cafeteria_qr_context",
      {
        p_tenant_slug: tenantSlug,
        p_qr_slug: qrSlug,
      },
    );

    if (contextError) {
      return NextResponse.json({ error: contextError.message }, { status: 500 });
    }

    const context = contextRows?.[0];
    if (!context || !context.qr_enabled || !context.station_active) {
      return NextResponse.json(
        { error: "El QR de cafetería no está disponible" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const fullName = String(body.full_name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const orderNotes = String(body.notes || "").trim();
    const items: PublicOrderItemInput[] = Array.isArray(body.items) ? body.items : [];

    if (!fullName || !email) {
      return NextResponse.json(
        { error: "Nombre y email son requeridos" },
        { status: 400 },
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Debes seleccionar al menos un item" },
        { status: 400 },
      );
    }

    let customerId: string | null = null;

    if (user?.id) {
      const { data: linkedCustomer } = await supabaseAdmin
        .from("customers")
        .select("id")
        .eq("tenant_id", context.tenant_id)
        .eq("user_id", user.id)
        .maybeSingle();

      customerId = linkedCustomer?.id ?? null;
    }

    if (!customerId) {
      const { data: customerRows, error: customerError } = await supabaseAdmin.rpc(
        "find_or_create_cafeteria_customer",
        {
          p_tenant_id: context.tenant_id,
          p_branch_id: context.branch_id,
          p_email: email,
          p_full_name: fullName,
        },
      );

      if (customerError) {
        return NextResponse.json(
          { error: customerError.message },
          { status: 500 },
        );
      }

      customerId = customerRows?.[0]?.customer_id || null;
    }

    if (!customerId) {
      return NextResponse.json(
        { error: "No se pudo resolver el cliente" },
        { status: 500 },
      );
    }

    const itemIds = items
      .map((item) => String(item.menu_item_id || "").trim())
      .filter(Boolean);

    const { data: menuItems, error: menuError } = await supabaseAdmin
      .from("menu_items")
      .select("id, name, price, currency_iso, preparation_time_minutes, is_available")
      .in("id", itemIds)
      .eq("tenant_id", context.tenant_id)
      .eq("branch_id", context.branch_id)
      .eq("is_active", true);

    if (menuError) {
      return NextResponse.json({ error: menuError.message }, { status: 500 });
    }

    const menuMap = new Map((menuItems || []).map((menuItem) => [menuItem.id, menuItem]));
    const normalizedItems = [];
    let maxEtaMinutes = 0;
    let currencyIso = "USD";

    for (const item of items) {
      const menuItemId = String(item.menu_item_id || "").trim();
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const notes = typeof item.notes === "string" ? item.notes.trim() : null;
      const menuItem = menuMap.get(menuItemId);

      if (!menuItem || !menuItem.is_available) {
        return NextResponse.json(
          { error: "Uno de los items ya no está disponible" },
          { status: 400 },
        );
      }

      normalizedItems.push({
        menu_item_id: menuItem.id,
        description: menuItem.name,
        quantity,
        unit_price: Number(menuItem.price),
        notes,
      });

      currencyIso = menuItem.currency_iso || currencyIso;
      maxEtaMinutes += (menuItem.preparation_time_minutes || 0) * quantity;
    }

    const estimatedReadyAt = new Date(
      Date.now() + Math.max(maxEtaMinutes, 5) * 60_000,
    ).toISOString();

    const { data: createdOrder, error: orderError } = await supabaseAdmin
      .from("cafe_orders")
      .insert({
        tenant_id: context.tenant_id,
        branch_id: context.branch_id,
        workstation_id: context.workstation_id,
        client_id: customerId,
        specialist_id: context.specialist_id || null,
        order_type: "client",
        status: "pending",
        source: "workstation_qr",
        notes: orderNotes || null,
        placed_by_name: fullName,
        placed_by_email: email,
        estimated_ready_at: estimatedReadyAt,
        currency_iso: currencyIso,
        charge_to_commissions: false,
      })
      .select("id")
      .single();

    if (orderError || !createdOrder) {
      return NextResponse.json(
        { error: orderError?.message || "No se pudo crear el pedido" },
        { status: 500 },
      );
    }

    const { error: itemsError } = await supabaseAdmin
      .from("cafe_order_items")
      .insert(
        normalizedItems.map((item) => ({
          cafe_order_id: createdOrder.id,
          ...item,
        })),
      );

    if (itemsError) {
      await supabaseAdmin.from("cafe_orders").delete().eq("id", createdOrder.id);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    const { data: order } = await supabaseAdmin
      .from("cafe_orders")
      .select(PUBLIC_CAFE_ORDER_WITH_RELATIONS)
      .eq("id", createdOrder.id)
      .single();

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error(
      "Error in POST /api/cafeteria/qr/[tenantSlug]/[qrSlug]/orders",
      error,
    );
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
