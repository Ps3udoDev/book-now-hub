// src/app/api/debts/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";

/**
 * GET /api/debts?tenant_id=...&specialist_id=...
 * Lista deudas de un especialista
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
    const specialistId = searchParams.get("specialist_id");

    if (!tenantId)
      return NextResponse.json(
        { error: "tenant_id es requerido" },
        { status: 400 },
      );

    let query = supabaseAdmin
      .from("specialist_debts")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (specialistId) {
      query = query.eq("specialist_id", specialistId);
    }

    const { data, error } = await query;

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ debts: data });
  } catch (err) {
    console.error("Error in GET /api/debts:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
