// src/app/api/consumptions/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";

/**
 * POST /api/consumptions
 * Registra un consumo de material de un especialista. Solo admins/owners/managers.
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
      specialist_id,
      description,
      service_id,
      quantity,
      unit_cost,
      currency_code,
      deduct_from_commission,
      date,
      notes,
    } = body;

    if (
      !tenant_id ||
      !specialist_id ||
      !description ||
      quantity === undefined ||
      unit_cost === undefined
    ) {
      return NextResponse.json(
        {
          error:
            "Campos requeridos: tenant_id, specialist_id, description, quantity, unit_cost",
        },
        { status: 400 },
      );
    }

    // Solo owners, admins y managers
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .eq("tenant_id", tenant_id)
      .single();

    if (!profile || !["owner", "admin", "manager"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Sin permisos suficientes" },
        { status: 403 },
      );
    }

    const { data: consumption, error } = await supabaseAdmin
      .from("specialist_consumptions")
      .insert({
        tenant_id,
        specialist_id,
        description,
        service_id: service_id || null,
        quantity,
        unit_cost,
        currency_code: currency_code || "USD",
        deduct_from_commission: deduct_from_commission ?? true,
        registered_by: user.id,
        date: date || new Date().toISOString().slice(0, 10),
        notes: notes || null,
      })
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ consumption }, { status: 201 });
  } catch (err) {
    console.error("Error en POST /api/consumptions:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
