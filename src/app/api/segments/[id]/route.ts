// src/app/api/segments/[id]/route.ts
import { type NextRequest, NextResponse } from "next/server";
import {
  CAMPAIGN_WRITE_ROLES,
  requireTenantAccess,
} from "@/lib/api/tenant-auth";
import { validateRules } from "@/lib/segments/engine";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

async function loadSegment(id: string) {
  const { data } = await supabaseAdmin
    .from("customer_segments")
    .select("*")
    .eq("id", id)
    .single();
  return data;
}

/** GET /api/segments/[id] */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const segment = await loadSegment(id);
    if (!segment)
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const access = await requireTenantAccess(segment.tenant_id);
    if (!access.ok)
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );

    return NextResponse.json({ segment });
  } catch (err) {
    console.error("Error en GET /api/segments/[id]:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/** PATCH /api/segments/[id] */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const segment = await loadSegment(id);
    if (!segment)
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const access = await requireTenantAccess(
      segment.tenant_id,
      CAMPAIGN_WRITE_ROLES,
    );
    if (!access.ok)
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );

    const body = await request.json();
    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = String(body.name).trim();
    if (body.description !== undefined)
      update.description = body.description || null;
    if (body.is_active !== undefined) update.is_active = body.is_active;
    if (body.rules !== undefined) {
      try {
        update.rules = validateRules(body.rules);
      } catch (e) {
        return NextResponse.json(
          { error: (e as Error).message },
          { status: 400 },
        );
      }
    }

    const { data, error } = await supabaseAdmin
      .from("customer_segments")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ segment: data });
  } catch (err) {
    console.error("Error en PATCH /api/segments/[id]:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/** DELETE /api/segments/[id] */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const segment = await loadSegment(id);
    if (!segment)
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const access = await requireTenantAccess(
      segment.tenant_id,
      CAMPAIGN_WRITE_ROLES,
    );
    if (!access.ok)
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );

    const { error } = await supabaseAdmin
      .from("customer_segments")
      .delete()
      .eq("id", id);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error en DELETE /api/segments/[id]:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
