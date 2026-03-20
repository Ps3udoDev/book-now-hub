// src/app/api/cash-sessions/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";

/**
 * POST /api/cash-sessions
 * Abre una nueva sesión de caja para una sucursal.
 * Valida que no haya otra sesión abierta en la misma sucursal.
 *
 * Body: { branch_id, cash_register_id, opening_amount, notes? }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSB();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { branch_id, cash_register_id, opening_amount, notes } = body;

    if (!branch_id || !cash_register_id) {
      return NextResponse.json(
        { error: "Campos requeridos: branch_id, cash_register_id" },
        { status: 400 },
      );
    }

    // Obtener tenant a partir de la sucursal
    const { data: branch } = await supabaseAdmin
      .from("branches")
      .select("id, tenant_id")
      .eq("id", branch_id)
      .single();

    if (!branch) {
      return NextResponse.json(
        { error: "Sucursal no encontrada" },
        { status: 404 },
      );
    }

    // Verificar permisos en el tenant
    const { data: tenantUser } = await supabaseAdmin
      .from("tenant_users")
      .select("role")
      .eq("auth_user_id", user.id)
      .eq("tenant_id", branch.tenant_id)
      .eq("is_active", true)
      .single();

    if (!tenantUser) {
      return NextResponse.json(
        { error: "Sin permisos en este tenant" },
        { status: 403 },
      );
    }

    // Verificar que la caja registradora existe y pertenece a la sucursal
    const { data: cashRegister } = await supabaseAdmin
      .from("cash_registers")
      .select("id, is_active")
      .eq("id", cash_register_id)
      .eq("branch_id", branch_id)
      .single();

    if (!cashRegister) {
      return NextResponse.json(
        { error: "Caja registradora no encontrada para esta sucursal" },
        { status: 400 },
      );
    }

    if (!cashRegister.is_active) {
      return NextResponse.json(
        { error: "La caja registradora está inactiva" },
        { status: 400 },
      );
    }

    // Verificar que no haya sesión abierta (el índice parcial único en BD también lo bloquea,
    // pero este check da un mensaje de error más claro al usuario)
    const { data: existingSession } = await supabaseAdmin
      .from("cash_register_sessions")
      .select("id, opened_at")
      .eq("branch_id", branch_id)
      .eq("status", "open")
      .maybeSingle();

    if (existingSession) {
      return NextResponse.json(
        {
          error:
            "Ya existe una sesión de caja abierta para esta sucursal. Ciérrala antes de abrir una nueva.",
          existing_session_id: existingSession.id,
        },
        { status: 409 },
      );
    }

    // Crear la sesión
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("cash_register_sessions")
      .insert({
        tenant_id: branch.tenant_id,
        branch_id,
        cash_register_id,
        opened_by: user.id,
        opening_amount: Number(opening_amount) || 0,
        notes: notes || null,
        status: "open",
      })
      .select()
      .single();

    if (sessionError) {
      // El índice parcial único puede lanzar un error de constraint también
      if (sessionError.code === "23505") {
        return NextResponse.json(
          { error: "Ya existe una sesión de caja abierta para esta sucursal." },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: `Error al crear sesión: ${sessionError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ session }, { status: 201 });
  } catch (err) {
    console.error("Error in POST /api/cash-sessions:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
