// src/app/api/orders/route.ts
import { type NextRequest, NextResponse } from "next/server";
import type { OrderStatus } from "@/lib/services/orders";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";

/**
 * GET /api/orders?branch_id=X&status=sent
 * Comandas de una sucursal. Usado por el panel de caja.
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
    const status = searchParams.get("status");

    if (!branchId) {
      return NextResponse.json(
        { error: "branch_id es requerido" },
        { status: 400 },
      );
    }

    let query = supabaseAdmin
      .from("orders")
      .select(
        "*, specialist:profiles!orders_specialist_id_fkey(id, full_name, avatar_url), customer:customers!orders_customer_id_fkey(id, first_name, last_name, phone), items:order_items(*)",
      )
      .eq("branch_id", branchId)
      .order("sent_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status as OrderStatus);

    const { data, error } = await query;
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ orders: data });
  } catch (err) {
    console.error("Error in GET /api/orders:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/orders
 * Crea una comanda en estado draft.
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
      specialist_id,
      appointment_id,
      customer_id,
      currency_code,
      notes,
    } = body;

    if (!tenant_id || !branch_id || !specialist_id) {
      return NextResponse.json(
        { error: "Campos requeridos: tenant_id, branch_id, specialist_id" },
        { status: 400 },
      );
    }

    // Verificar que el usuario pertenece al tenant
    const { data: tenantUser } = await supabaseAdmin
      .from("tenant_users")
      .select("role")
      .eq("auth_user_id", user.id)
      .eq("tenant_id", tenant_id)
      .eq("is_active", true)
      .single();

    if (!tenantUser) {
      return NextResponse.json(
        { error: "Sin permisos en este tenant" },
        { status: 403 },
      );
    }

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        tenant_id,
        branch_id,
        specialist_id,
        appointment_id: appointment_id || null,
        customer_id: customer_id || null,
        currency_code: currency_code || "USD",
        notes: notes || null,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    console.error("Error in POST /api/orders:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
