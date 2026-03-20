// src/app/api/cash-sessions/[id]/close/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";
import { calculateSessionSummary } from "../../_utils";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/cash-sessions/:id/close
 * Cierra una sesión de caja:
 *   1. Valida que la sesión esté abierta
 *   2. Valida que no haya comandas en estado 'sent' sin cobrar en la sucursal
 *   3. Calcula el resumen de cobros y lo guarda en cash_register_summaries
 *   4. Actualiza la sesión con status='closed', closed_at, closed_by,
 *      closing_amount y difference
 *
 * Body: { closing_amount?: number, notes?: string }
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: sessionId } = await params;

    const supabase = await createServerSB();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    // Verificar sesión
    const { data: session } = await supabaseAdmin
      .from("cash_register_sessions")
      .select("id, tenant_id, branch_id, status, opening_amount")
      .eq("id", sessionId)
      .single();

    if (!session)
      return NextResponse.json(
        { error: "Sesión no encontrada" },
        { status: 404 },
      );

    if (session.status !== "open")
      return NextResponse.json(
        { error: "La sesión ya está cerrada" },
        { status: 409 },
      );

    // Verificar permisos
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

    // Validar que no haya comandas pendientes (status='sent') en la sucursal
    const { count: pendingCount } = await supabaseAdmin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("branch_id", session.branch_id)
      .eq("status", "sent");

    if (pendingCount && pendingCount > 0) {
      return NextResponse.json(
        {
          error: `Hay ${pendingCount} comanda(s) en caja sin cobrar. Cóbralas antes de cerrar.`,
          pending_orders: pendingCount,
        },
        { status: 409 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const closingAmount =
      body.closing_amount !== undefined ? Number(body.closing_amount) : null;
    const notes: string | null = body.notes || null;
    const now = new Date().toISOString();

    // Calcular resumen de cobros de la sesión
    const summaryRows = await calculateSessionSummary(sessionId);

    // Guardar resumen en cash_register_summaries (upsert por si se re-cierra)
    if (summaryRows.length > 0) {
      const summaryInserts = summaryRows.map((row) => ({
        session_id: sessionId,
        area: row.area,
        currency_code: row.currency_code,
        total_cash: row.total_cash,
        total_card: row.total_card,
        total_transfer: row.total_transfer,
        total_mobile_payment: row.total_mobile_payment,
        total_gateway: row.total_gateway,
        total_amount: row.total_amount,
        transaction_count: row.transaction_count,
      }));

      const { error: summaryError } = await supabaseAdmin
        .from("cash_register_summaries")
        .upsert(summaryInserts, {
          onConflict: "session_id,area,currency_code",
        });

      if (summaryError) {
        console.error("Error al guardar resumen:", summaryError.message);
        // No bloqueante: continuamos con el cierre
      }
    }

    // Calcular diferencia de efectivo (si se proporcionó monto contado)
    const totalRow = summaryRows.find((r) => r.area === "total");
    let difference: number | null = null;
    if (closingAmount !== null && totalRow) {
      // Diferencia = efectivo contado - efectivo del sistema
      difference =
        Math.round((closingAmount - totalRow.total_cash) * 100) / 100;
    }

    // Cerrar la sesión
    const { data: closedSession, error: closeError } = await supabaseAdmin
      .from("cash_register_sessions")
      .update({
        status: "closed",
        closed_at: now,
        closed_by: user.id,
        closing_amount: closingAmount,
        difference,
        notes: notes ?? undefined,
      })
      .eq("id", sessionId)
      .select()
      .single();

    if (closeError)
      return NextResponse.json(
        { error: `Error al cerrar sesión: ${closeError.message}` },
        { status: 500 },
      );

    return NextResponse.json({
      session: closedSession,
      summary: summaryRows,
    });
  } catch (err) {
    console.error("Error in POST /api/cash-sessions/[id]/close:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
