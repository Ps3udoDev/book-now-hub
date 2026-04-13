// src/app/api/consumptions/[id]/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";

/**
 * DELETE /api/consumptions/[id]
 */
export async function DELETE(
  _request: NextRequest,
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
      .from("specialist_consumptions")
      .select("tenant_id")
      .eq("id", id)
      .single();

    if (!existing)
      return NextResponse.json(
        { error: "Consumo no encontrado" },
        { status: 404 },
      );

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .eq("tenant_id", existing.tenant_id)
      .single();

    if (!profile || !["owner", "admin"].includes(profile.role))
      return NextResponse.json(
        { error: "Sin permisos suficientes" },
        { status: 403 },
      );

    const { error } = await supabaseAdmin
      .from("specialist_consumptions")
      .delete()
      .eq("id", id);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error en DELETE /api/consumptions/[id]:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
