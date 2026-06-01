// src/app/api/cafe/orders/[id]/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

const CAFE_ORDER_WITH_RELATIONS = `
  *,
  items:cafe_order_items(*),
  client:customers!cafe_orders_client_id_fkey(id, first_name, last_name, full_name),
  specialist:profiles!cafe_orders_specialist_id_fkey(id, full_name, avatar_url),
  workstation:workstations(id, name, code, cafeteria_qr_slug)
` as const;

/**
 * GET /api/cafe/orders/:id
 * Detalle del pedido con items y relaciones.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createServerSB();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from("cafe_orders")
      .select(CAFE_ORDER_WITH_RELATIONS)
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json({ order: data });
  } catch (err) {
    console.error("Error in GET /api/cafe/orders/[id]:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
