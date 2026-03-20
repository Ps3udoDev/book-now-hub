// src/app/api/currencies/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * GET /api/currencies
 * Retorna todas las monedas activas del catálogo global.
 * No requiere tenant_id — las monedas son globales.
 */
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("currencies")
      .select("*")
      .eq("is_active", true)
      .order("is_base_currency", { ascending: false })
      .order("code");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ currencies: data });
  } catch (error) {
    console.error("Error in GET /api/currencies:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
