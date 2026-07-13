// src/app/api/campaigns/[id]/materialize/route.ts
import { type NextRequest, NextResponse } from "next/server";
import {
  CAMPAIGN_WRITE_ROLES,
  requireTenantAccess,
} from "@/lib/api/tenant-auth";
import { renderMessage } from "@/lib/campaigns/render";
import {
  resolveSegmentCustomers,
  SegmentValidationError,
} from "@/lib/segments/engine";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Customer, Json, SegmentRules } from "@/types";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/campaigns/[id]/materialize
 * Resuelve el segmento (o reglas inline), inserta campaign_recipients con
 * rendered_message por cliente, guarda rules_snapshot y actualiza stats.
 */
export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const { data: campaign } = await supabaseAdmin
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .single();
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

    if (campaign.status === "sent") {
      return NextResponse.json(
        { error: "La campaña ya fue enviada" },
        { status: 400 },
      );
    }

    // Determinar las reglas: segmento guardado tiene prioridad; si no, inline.
    let rules: SegmentRules | null = null;
    if (campaign.segment_id) {
      const { data: segment } = await supabaseAdmin
        .from("customer_segments")
        .select("rules")
        .eq("id", campaign.segment_id)
        .single();
      rules = (segment?.rules as unknown as SegmentRules) ?? null;
    } else if (campaign.rules_snapshot) {
      rules = campaign.rules_snapshot as unknown as SegmentRules;
    }

    if (!rules) {
      return NextResponse.json(
        { error: "La campaña no tiene segmento ni reglas definidas" },
        { status: 400 },
      );
    }

    // Resolver destinatarios reales
    let customers: Customer[];
    try {
      customers = await resolveSegmentCustomers(
        supabaseAdmin,
        campaign.tenant_id,
        rules,
      );
    } catch (e) {
      if (e instanceof SegmentValidationError)
        return NextResponse.json({ error: e.message }, { status: 400 });
      throw e;
    }

    // Re-materializar es idempotente: limpiamos destinatarios previos.
    await supabaseAdmin
      .from("campaign_recipients")
      .delete()
      .eq("campaign_id", id);

    const rows = customers.map((customer) => ({
      campaign_id: id,
      tenant_id: campaign.tenant_id,
      customer_id: customer.id,
      rendered_message: renderMessage(campaign.message_template, customer)
        .message,
      status: "queued" as const,
    }));

    if (rows.length > 0) {
      const { error: insErr } = await supabaseAdmin
        .from("campaign_recipients")
        .insert(rows);
      if (insErr)
        return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    const stats = {
      total: rows.length,
      queued: rows.length,
      sent: 0,
      failed: 0,
      skipped: 0,
    };

    const { data: updated, error: updErr } = await supabaseAdmin
      .from("campaigns")
      .update({
        rules_snapshot: rules as unknown as Json,
        stats,
        status: "ready",
      })
      .eq("id", id)
      .select()
      .single();

    if (updErr)
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    return NextResponse.json({ campaign: updated });
  } catch (err) {
    console.error("Error en POST /api/campaigns/[id]/materialize:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
