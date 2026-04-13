// src/app/api/cash-sessions/[id]/movements/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/cash-sessions/:id/movements
 * Lista los movimientos (egresos/ingresos) de una sesión.
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

    const { data: session } = await supabaseAdmin
      .from("cash_register_sessions")
      .select("id, tenant_id")
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

    const { data: movements, error } = await supabaseAdmin
      .from("cash_register_movements")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at");

    if (error)
      return NextResponse.json(
        { error: `Error al obtener movimientos: ${error.message}` },
        { status: 500 },
      );

    return NextResponse.json({ movements: movements ?? [] });
  } catch (err) {
    console.error("Error in GET /api/cash-sessions/[id]/movements:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/cash-sessions/:id/movements
 * Registra un egreso o ingreso manual en la sesión activa.
 *
 * Body: { movement_type: 'expense'|'income', amount, description, reference? }
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

    // Verificar sesión abierta
    const { data: session } = await supabaseAdmin
      .from("cash_register_sessions")
      .select("id, tenant_id, cash_register_id, status")
      .eq("id", sessionId)
      .single();

    if (!session)
      return NextResponse.json(
        { error: "Sesión no encontrada" },
        { status: 404 },
      );

    if (session.status !== "open")
      return NextResponse.json(
        { error: "Solo se pueden registrar movimientos en una sesión abierta" },
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

    const body = await request.json();
    const {
      movement_type,
      amount,
      description,
      reference,
    }: {
      movement_type: "expense" | "income";
      amount: number;
      description: string;
      reference?: string | null;
    } = body;

    if (!movement_type || !["expense", "income"].includes(movement_type))
      return NextResponse.json(
        { error: "movement_type debe ser 'expense' o 'income'" },
        { status: 400 },
      );

    if (!amount || Number(amount) <= 0)
      return NextResponse.json(
        { error: "El monto debe ser mayor a 0" },
        { status: 400 },
      );

    if (!description?.trim())
      return NextResponse.json(
        { error: "La descripción es obligatoria" },
        { status: 400 },
      );

    const { data: movement, error: insertError } = await supabaseAdmin
      .from("cash_register_movements")
      .insert({
        cash_register_id: session.cash_register_id,
        session_id: sessionId,
        movement_type,
        amount: Number(amount),
        description: description.trim(),
        reference: reference || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError)
      return NextResponse.json(
        { error: `Error al registrar movimiento: ${insertError.message}` },
        { status: 500 },
      );

    return NextResponse.json({ movement }, { status: 201 });
  } catch (err) {
    console.error("Error in POST /api/cash-sessions/[id]/movements:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
