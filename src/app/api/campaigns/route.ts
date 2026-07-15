// src/app/api/campaigns/route.ts
import { type NextRequest, NextResponse } from "next/server";
import {
  CAMPAIGN_WRITE_ROLES,
  requireTenantAccess,
} from "@/lib/api/tenant-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** GET /api/campaigns?tenant_id=X */
export async function GET(request: NextRequest) {
  try {
    const tenantId = new URL(request.url).searchParams.get("tenant_id");
    const access = await requireTenantAccess(tenantId);
    if (!access.ok)
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );

    const { data, error } = await supabaseAdmin
      .from("campaigns")
      .select("*")
      .eq("tenant_id", tenantId as string)
      .order("created_at", { ascending: false });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ campaigns: data });
  } catch (err) {
    console.error("Error en GET /api/campaigns:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/** POST /api/campaigns */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenant_id,
      name,
      description,
      campaign_type,
      channel,
      segment_id,
      rules_snapshot,
      message_template,
    } = body;

    const access = await requireTenantAccess(tenant_id, CAMPAIGN_WRITE_ROLES);
    if (!access.ok)
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );

    if (!name?.trim())
      return NextResponse.json(
        { error: "El nombre es requerido" },
        { status: 400 },
      );
    if (!message_template?.trim())
      return NextResponse.json(
        { error: "La plantilla de mensaje es requerida" },
        { status: 400 },
      );

    const { data: campaign, error } = await supabaseAdmin
      .from("campaigns")
      .insert({
        tenant_id,
        name: name.trim(),
        description: description || null,
        campaign_type: campaign_type || "custom",
        channel: channel || "whatsapp",
        segment_id: segment_id || null,
        rules_snapshot: rules_snapshot || null,
        message_template,
        status: "draft",
        stats: {},
        created_by: access.userId,
      })
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (err) {
    console.error("Error en POST /api/campaigns:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
