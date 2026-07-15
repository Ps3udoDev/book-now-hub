// src/app/api/campaigns/[id]/send/route.ts
import { type NextRequest, NextResponse } from "next/server";
import {
  CAMPAIGN_WRITE_ROLES,
  requireTenantAccess,
} from "@/lib/api/tenant-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/campaigns/[id]/send  (STUB)
 * Recorre los destinatarios en cola, los marca como enviados y actualiza
 * stats + estado de la campaña. NO realiza envío real.
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

    if (campaign.status !== "ready" && campaign.status !== "queued") {
      return NextResponse.json(
        { error: "La campaña debe estar materializada (lista) para enviarse" },
        { status: 400 },
      );
    }

    const nowIso = new Date().toISOString();

    // Destinatarios en cola de esta campaña
    const { data: queued, error: qErr } = await supabaseAdmin
      .from("campaign_recipients")
      .select("id")
      .eq("campaign_id", id)
      .eq("status", "queued");
    if (qErr)
      return NextResponse.json({ error: qErr.message }, { status: 500 });

    // TODO: conectar envío real (Twilio/Resend) aquí. Por cada destinatario
    // se enviaría el rendered_message por el canal correspondiente y se
    // marcaría 'sent' o 'failed' según el resultado. Por ahora: stub → sent.
    const { error: updRcpErr } = await supabaseAdmin
      .from("campaign_recipients")
      .update({ status: "sent", sent_at: nowIso })
      .eq("campaign_id", id)
      .eq("status", "queued");
    if (updRcpErr)
      return NextResponse.json({ error: updRcpErr.message }, { status: 500 });

    const sentCount = queued?.length ?? 0;
    const prevStats = (campaign.stats as Record<string, number>) || {};
    const stats = {
      ...prevStats,
      total: prevStats.total ?? sentCount,
      queued: 0,
      sent: (prevStats.sent ?? 0) + sentCount,
      failed: prevStats.failed ?? 0,
      skipped: prevStats.skipped ?? 0,
    };

    const { data: updated, error: updErr } = await supabaseAdmin
      .from("campaigns")
      .update({ status: "sent", sent_at: nowIso, stats })
      .eq("id", id)
      .select()
      .single();

    if (updErr)
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    return NextResponse.json({ campaign: updated });
  } catch (err) {
    console.error("Error en POST /api/campaigns/[id]/send:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
