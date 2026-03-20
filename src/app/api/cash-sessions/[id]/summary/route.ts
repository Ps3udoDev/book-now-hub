// src/app/api/cash-sessions/[id]/summary/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";
import { calculateSessionSummary } from "../../_utils";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/cash-sessions/:id/summary
 * Devuelve el resumen calculado en tiempo real de los cobros de la sesión:
 *   - Totales por método de pago
 *   - Desglose por área (servicios / productos / cafetería)
 *   - Todo agrupado por moneda
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id: sessionId } = await params;

    const supabase = await createServerSB();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    // Verificar que la sesión existe y que el usuario tiene acceso al tenant
    const { data: session } = await supabaseAdmin
      .from("cash_register_sessions")
      .select("id, tenant_id, branch_id, status, opened_at")
      .eq("id", sessionId)
      .single();

    if (!session)
      return NextResponse.json(
        { error: "Sesión no encontrada" },
        { status: 404 },
      );

    const { data: tenantUser } = await supabaseAdmin
      .from("tenant_users")
      .select("role")
      .eq("auth_user_id", user.id)
      .eq("tenant_id", session.tenant_id)
      .eq("is_active", true)
      .single();

    if (!tenantUser)
      return NextResponse.json(
        { error: "Sin permisos en este tenant" },
        { status: 403 },
      );

    const summary = await calculateSessionSummary(sessionId);

    return NextResponse.json({ session, summary });
  } catch (err) {
    console.error("Error in GET /api/cash-sessions/[id]/summary:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
