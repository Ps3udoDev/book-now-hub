// src/app/api/segments/route.ts
import { type NextRequest, NextResponse } from "next/server";
import {
  CAMPAIGN_WRITE_ROLES,
  requireTenantAccess,
} from "@/lib/api/tenant-auth";
import { validateRules } from "@/lib/segments/engine";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Json, SegmentRules } from "@/types";

/** GET /api/segments?tenant_id=X */
export async function GET(request: NextRequest) {
  try {
    const tenantId = new URL(request.url).searchParams.get("tenant_id");
    const access = await requireTenantAccess(tenantId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("customer_segments")
      .select("*")
      .eq("tenant_id", tenantId as string)
      .order("created_at", { ascending: false });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ segments: data });
  } catch (err) {
    console.error("Error en GET /api/segments:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

/** POST /api/segments */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenant_id, name, description, rules, is_active } = body;

    const access = await requireTenantAccess(tenant_id, CAMPAIGN_WRITE_ROLES);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }
    if (!name?.trim()) {
      return NextResponse.json(
        { error: "El nombre es requerido" },
        { status: 400 },
      );
    }

    // Valida las reglas antes de persistir (nunca guardamos reglas inválidas)
    let validated: SegmentRules;
    try {
      validated = validateRules(rules);
    } catch (e) {
      return NextResponse.json(
        { error: (e as Error).message },
        { status: 400 },
      );
    }

    const { data: segment, error } = await supabaseAdmin
      .from("customer_segments")
      .insert({
        tenant_id,
        name: name.trim(),
        description: description || null,
        rules: validated as unknown as Json,
        is_active: is_active ?? true,
        created_by: access.userId,
      })
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ segment }, { status: 201 });
  } catch (err) {
    console.error("Error en POST /api/segments:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
