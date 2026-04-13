// src/app/api/commission-rules/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";

/**
 * GET /api/commission-rules?tenant_id=X
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
    const tenantId = searchParams.get("tenant_id");
    if (!tenantId)
      return NextResponse.json(
        { error: "tenant_id es requerido" },
        { status: 400 },
      );

    const { data, error } = await supabaseAdmin
      .from("commission_rules")
      .select(
        "*, specialist:profiles!commission_rules_specialist_id_fkey(id, full_name, avatar_url), service:services!commission_rules_service_id_fkey(id, name)",
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ rules: data });
  } catch (err) {
    console.error("Error en GET /api/commission-rules:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/commission-rules
 * Crea una regla de comisión. Solo owners y admins.
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
      scope,
      item_type,
      service_id,
      commission_type,
      value,
      currency_code,
      notes,
    } = body;

    if (
      !tenant_id ||
      !specialist_id ||
      !scope ||
      !commission_type ||
      value === undefined
    ) {
      return NextResponse.json(
        {
          error:
            "Campos requeridos: tenant_id, specialist_id, scope, commission_type, value",
        },
        { status: 400 },
      );
    }

    // Verificar que el usuario es owner o admin del tenant
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .eq("tenant_id", tenant_id)
      .single();

    if (!profile || !["owner", "admin"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Sin permisos suficientes" },
        { status: 403 },
      );
    }

    const { data: rule, error } = await supabaseAdmin
      .from("commission_rules")
      .insert({
        tenant_id,
        specialist_id,
        scope,
        item_type: item_type || null,
        service_id: service_id || null,
        commission_type,
        value,
        currency_code:
          commission_type === "fixed" ? currency_code || "USD" : null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ rule }, { status: 201 });
  } catch (err) {
    console.error("Error en POST /api/commission-rules:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
