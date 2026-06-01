// src/app/api/client/services/[id]/specialists/route.ts
// Lista especialistas que ofrecen un servicio en la sucursal indicada.
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireClientCustomer } from "../../../_utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireClientCustomer(request);
  if (ctx instanceof NextResponse) return ctx;

  const { id: serviceId } = await params;
  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branch_id");

  if (!branchId) {
    return NextResponse.json(
      { error: "branch_id es requerido" },
      { status: 400 },
    );
  }

  const admin = supabaseAdmin as any;
  const { data, error } = await admin.rpc("get_service_specialists", {
    p_tenant_id: ctx.tenant.id,
    p_branch_id: branchId,
    p_service_id: serviceId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ specialists: data ?? [] });
}
