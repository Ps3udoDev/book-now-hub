// src/app/api/campaigns/[id]/route.ts
import { type NextRequest, NextResponse } from "next/server";
import {
  CAMPAIGN_WRITE_ROLES,
  requireTenantAccess,
} from "@/lib/api/tenant-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

async function loadCampaign(id: string) {
  const { data } = await supabaseAdmin
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .single();
  return data;
}

/** GET /api/campaigns/[id] */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const campaign = await loadCampaign(id);
    if (!campaign)
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    const access = await requireTenantAccess(campaign.tenant_id);
    if (!access.ok)
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );

    return NextResponse.json({ campaign });
  } catch (err) {
    console.error("Error en GET /api/campaigns/[id]:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/** PATCH /api/campaigns/[id] */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const campaign = await loadCampaign(id);
    if (!campaign)
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    const access = await requireTenantAccess(
      campaign.tenant_id,
      CAMPAIGN_WRITE_ROLES,
    );
    if (!access.ok)
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );

    const body = await request.json();
    const update: Record<string, unknown> = {};
    for (const key of [
      "name",
      "description",
      "campaign_type",
      "channel",
      "segment_id",
      "rules_snapshot",
      "message_template",
      "status",
    ]) {
      if (body[key] !== undefined) update[key] = body[key];
    }
    if (typeof update.name === "string") update.name = update.name.trim();

    const { data, error } = await supabaseAdmin
      .from("campaigns")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ campaign: data });
  } catch (err) {
    console.error("Error en PATCH /api/campaigns/[id]:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/** DELETE /api/campaigns/[id] */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const campaign = await loadCampaign(id);
    if (!campaign)
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    const access = await requireTenantAccess(
      campaign.tenant_id,
      CAMPAIGN_WRITE_ROLES,
    );
    if (!access.ok)
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );

    const { error } = await supabaseAdmin
      .from("campaigns")
      .delete()
      .eq("id", id);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error en DELETE /api/campaigns/[id]:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
