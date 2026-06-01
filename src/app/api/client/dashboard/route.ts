// src/app/api/client/dashboard/route.ts
// Devuelve el dashboard consolidado del cliente desde v_customer_dashboard.
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireClientCustomer } from "../_utils";

export async function GET(request: NextRequest) {
  const ctx = await requireClientCustomer(request);
  if (ctx instanceof NextResponse) return ctx;

  const admin = supabaseAdmin as any;

  const { data: dashboard, error } = await admin
    .from("v_customer_dashboard")
    .select("*")
    .eq("customer_id", ctx.customer.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Cargar favoritos en paralelo (count rapido para badge en UI).
  const { count: favoritesCount } = await admin
    .from("customer_favorites")
    .select("*", { count: "exact", head: true })
    .eq("customer_id", ctx.customer.id);

  return NextResponse.json({
    dashboard: dashboard ?? null,
    favorites_count: favoritesCount ?? 0,
  });
}
