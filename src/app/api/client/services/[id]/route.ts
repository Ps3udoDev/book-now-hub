// src/app/api/client/services/[id]/route.ts
// Detalle de un servicio + sucursal por defecto para el cliente.
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireClientCustomer } from "../../_utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireClientCustomer(request);
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;
  const admin = supabaseAdmin as any;

  const { data: service, error } = await admin
    .from("services")
    .select(
      "id, name, slug, description, category, duration_minutes, buffer_minutes, base_price, currency_code, image_url, gallery_urls, requires_specialist, is_featured, has_variants",
    )
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!service) {
    return NextResponse.json(
      { error: "Servicio no encontrado" },
      { status: 404 },
    );
  }

  // Resolver sucursal preferida del cliente; si no hay, primer branch activo del tenant
  const preferredBranchId = ctx.customer.preferred_branch_id;
  let branchId: string | null = null;

  if (preferredBranchId) {
    const { data: prefBranch } = await admin
      .from("branches")
      .select("id, name, timezone, is_active")
      .eq("id", preferredBranchId)
      .eq("tenant_id", ctx.tenant.id)
      .maybeSingle();
    if (prefBranch && (prefBranch as { is_active: boolean }).is_active) {
      branchId = (prefBranch as { id: string }).id;
    }
  }

  if (!branchId) {
    const { data: defaultBranch } = await admin
      .from("branches")
      .select("id")
      .eq("tenant_id", ctx.tenant.id)
      .eq("is_active", true)
      .order("is_main", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (defaultBranch) branchId = (defaultBranch as { id: string }).id;
  }

  // Listar todas las sucursales activas para que el cliente pueda elegir
  const { data: branches } = await admin
    .from("branches")
    .select("id, name, address, city, timezone")
    .eq("tenant_id", ctx.tenant.id)
    .eq("is_active", true)
    .order("is_main", { ascending: false })
    .order("name", { ascending: true });

  return NextResponse.json({
    service,
    default_branch_id: branchId,
    branches: branches ?? [],
  });
}
