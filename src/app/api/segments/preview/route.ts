// src/app/api/segments/preview/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantAccess } from "@/lib/api/tenant-auth";
import { previewSegment, SegmentValidationError } from "@/lib/segments/engine";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** POST /api/segments/preview  body: { tenant_id, rules } → { count, sample } */
export async function POST(request: NextRequest) {
  try {
    const { tenant_id, rules } = await request.json();

    const access = await requireTenantAccess(tenant_id);
    if (!access.ok)
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );

    const result = await previewSegment(supabaseAdmin, tenant_id, rules);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof SegmentValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Error en POST /api/segments/preview:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
