import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

const TRACKING_SELECT = `
  id,
  order_number,
  status,
  total,
  currency_iso,
  created_at,
  estimated_ready_at,
  placed_by_name,
  workstation:workstations(id, name),
  items:cafe_order_items(id, description, quantity, unit_price, subtotal, notes)
` as const;

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const { data: order, error } = await supabaseAdmin
      .from("cafe_orders")
      .select(TRACKING_SELECT)
      .eq("id", id)
      .eq("source", "workstation_qr")
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 },
      );
    }

    const workstation = Array.isArray(order.workstation)
      ? order.workstation[0]
      : order.workstation;

    return NextResponse.json({
      order: {
        ...order,
        workstation_name: workstation?.name || null,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/cafeteria/orders/[id]/tracking", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
