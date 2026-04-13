// src/app/api/commissions/bulk-pay/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";

/**
 * POST /api/commissions/bulk-pay
 * Marca múltiples comisiones como pagadas. Solo owners y admins.
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
    const { commission_ids } = body as { commission_ids: string[] };

    if (!Array.isArray(commission_ids) || commission_ids.length === 0) {
      return NextResponse.json(
        { error: "Se requiere al menos una comisión" },
        { status: 400 },
      );
    }

    // Obtener tenant_id de la primera comisión para verificar rol
    const { data: first } = await supabaseAdmin
      .from("commissions")
      .select("tenant_id")
      .eq("id", commission_ids[0])
      .single();

    if (!first)
      return NextResponse.json(
        { error: "Comisión no encontrada" },
        { status: 404 },
      );

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .eq("tenant_id", first.tenant_id)
      .single();

    if (!profile || !["owner", "admin"].includes(profile.role))
      return NextResponse.json(
        { error: "Sin permisos suficientes" },
        { status: 403 },
      );

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("commissions")
      .update({
        status: "paid",
        paid_at: now,
        paid_by: user.id,
      })
      .in("id", commission_ids)
      .in("status", ["pending", "approved"]);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, count: commission_ids.length });
  } catch (err) {
    console.error("Error en POST /api/commissions/bulk-pay:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
