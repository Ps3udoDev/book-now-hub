// src/app/api/commissions/[id]/approve/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";

/**
 * PATCH /api/commissions/[id]/approve
 * Aprueba una comisión pendiente. Solo owners y admins.
 */
export async function PATCH(
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
      .from("commissions")
      .select("tenant_id, status")
      .eq("id", id)
      .single();

    if (!existing)
      return NextResponse.json(
        { error: "Comisión no encontrada" },
        { status: 404 },
      );

    if (existing.status !== "pending")
      return NextResponse.json(
        {
          error: `No se puede aprobar una comisión en estado '${existing.status}'`,
        },
        { status: 422 },
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

    const { data: commission, error } = await supabaseAdmin
      .from("commissions")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: user.id,
      })
      .eq("id", id)
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ commission });
  } catch (err) {
    console.error("Error en PATCH /api/commissions/[id]/approve:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
