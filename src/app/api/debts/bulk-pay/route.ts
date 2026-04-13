// src/app/api/debts/bulk-pay/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";

/**
 * POST /api/debts/bulk-pay
 * Pago masivo de deudas pendientes al liquidar comisiones.
 * Deduce hasta max_amount de las deudas más antiguas primero.
 *
 * Body: { specialist_id, tenant_id, max_amount }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSB();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { specialist_id, tenant_id, max_amount } = await request.json();

    if (!specialist_id || !tenant_id || max_amount == null) {
      return NextResponse.json(
        { error: "specialist_id, tenant_id y max_amount son requeridos" },
        { status: 400 },
      );
    }

    // Verificar permisos (solo admin/owner)
    const { data: tenantUser } = await supabaseAdmin
      .from("tenant_users")
      .select("role")
      .eq("auth_user_id", user.id)
      .eq("tenant_id", tenant_id)
      .eq("is_active", true)
      .single();

    if (!tenantUser || !["owner", "admin"].includes(tenantUser.role)) {
      return NextResponse.json(
        { error: "Sin permisos para liquidar deudas" },
        { status: 403 },
      );
    }

    // Obtener deudas pendientes ordenadas por antigüedad
    const { data: debts } = await supabaseAdmin
      .from("specialist_debts")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("specialist_id", specialist_id)
      .gt("remaining_amount", 0)
      .is("settled_at", null)
      .order("created_at", { ascending: true });

    if (!debts || debts.length === 0) {
      return NextResponse.json({ total_deducted: 0 });
    }

    let remainingBudget = Number(max_amount);
    let totalDeducted = 0;

    for (const debt of debts) {
      if (remainingBudget <= 0) break;

      const debtRemaining = Number(debt.remaining_amount);
      const payment = Math.min(remainingBudget, debtRemaining);
      const newRemaining = Math.round((debtRemaining - payment) * 100) / 100;

      // Registrar pago
      await supabaseAdmin.from("specialist_debt_payments").insert({
        debt_id: debt.id,
        amount: payment,
        notes: "Retención automática en liquidación de comisiones",
        created_by: user.id,
      });

      // Actualizar deuda
      const updateData: Record<string, unknown> = {
        remaining_amount: newRemaining,
      };
      if (newRemaining <= 0) {
        updateData.settled_at = new Date().toISOString();
      }

      await supabaseAdmin
        .from("specialist_debts")
        .update(updateData)
        .eq("id", debt.id);

      remainingBudget -= payment;
      totalDeducted += payment;
    }

    return NextResponse.json({
      total_deducted: Math.round(totalDeducted * 100) / 100,
    });
  } catch (err) {
    console.error("Error in POST /api/debts/bulk-pay:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
