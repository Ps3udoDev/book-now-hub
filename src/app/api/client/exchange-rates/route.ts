// src/app/api/client/exchange-rates/route.ts
// GET de las tasas de cambio vigentes del tenant para la app del cliente.
// Permite convertir precios a la moneda preferida del cliente (tarea 3.8).
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireClientCustomer } from "../_utils";

export async function GET(request: NextRequest) {
  const ctx = await requireClientCustomer(request);
  if (ctx instanceof NextResponse) return ctx;

  // Tasas vigentes: valid_until IS NULL (patron historico de exchange_rates).
  const { data: rates, error } = await supabaseAdmin
    .from("exchange_rates")
    .select("from_currency, to_currency, rate, valid_from")
    .eq("tenant_id", ctx.tenant.id)
    .is("valid_until", null)
    .order("from_currency");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rates: rates ?? [] });
}
