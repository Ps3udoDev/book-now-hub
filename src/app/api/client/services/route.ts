// src/app/api/client/services/route.ts
// Catalogo de servicios activos del tenant para la app del cliente.
// Devuelve los servicios + agrupacion por categoria.
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireClientCustomer } from "../_utils";

export async function GET(request: NextRequest) {
  const ctx = await requireClientCustomer(request);
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || null;
  const category = searchParams.get("category");

  const admin = supabaseAdmin as any;

  let query = admin
    .from("services")
    .select(
      "id, name, slug, description, category, duration_minutes, base_price, currency_code, image_url, is_featured, requires_specialist",
    )
    .eq("tenant_id", ctx.tenant.id)
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (category) query = query.eq("category", category);
  if (search) query = query.ilike("name", `%${search}%`);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Agrupar por categoria
  const grouped: Record<string, unknown[]> = {};
  for (const service of (data ?? []) as Array<{ category: string | null }>) {
    const key = service.category ?? "other";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(service);
  }

  return NextResponse.json({
    services: data ?? [],
    grouped,
  });
}
