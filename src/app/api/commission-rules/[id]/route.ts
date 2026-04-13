// src/app/api/commission-rules/[id]/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";

/**
 * PATCH /api/commission-rules/[id]
 * Actualiza valor, tipo o estado activo de una regla.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createServerSB();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    // Verificar que la regla existe y obtener tenant_id
    const { data: existing } = await supabaseAdmin
      .from("commission_rules")
      .select("tenant_id")
      .eq("id", id)
      .single();

    if (!existing)
      return NextResponse.json(
        { error: "Regla no encontrada" },
        { status: 404 },
      );

    // Verificar permisos
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .eq("tenant_id", existing.tenant_id)
      .single();

    if (!profile || !["owner", "admin"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Sin permisos suficientes" },
        { status: 403 },
      );
    }

    const { data: rule, error } = await supabaseAdmin
      .from("commission_rules")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ rule });
  } catch (err) {
    console.error("Error en PATCH /api/commission-rules/[id]:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/commission-rules/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createServerSB();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { id } = await params;

    const { data: existing } = await supabaseAdmin
      .from("commission_rules")
      .select("tenant_id")
      .eq("id", id)
      .single();

    if (!existing)
      return NextResponse.json(
        { error: "Regla no encontrada" },
        { status: 404 },
      );

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .eq("tenant_id", existing.tenant_id)
      .single();

    if (!profile || !["owner", "admin"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Sin permisos suficientes" },
        { status: 403 },
      );
    }

    const { error } = await supabaseAdmin
      .from("commission_rules")
      .delete()
      .eq("id", id);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error en DELETE /api/commission-rules/[id]:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
