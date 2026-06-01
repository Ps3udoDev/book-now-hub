import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Params = { params: Promise<{ tenantSlug: string; qrSlug: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { tenantSlug, qrSlug } = await params;

    const { data, error } = await supabaseAdmin.rpc(
      "get_public_cafeteria_qr_context",
      {
        p_tenant_slug: tenantSlug,
        p_qr_slug: qrSlug,
      },
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const context = data?.[0] || null;
    if (!context) {
      return NextResponse.json({ error: "QR no encontrado" }, { status: 404 });
    }

    if (!context.qr_enabled || !context.station_active) {
      return NextResponse.json(
        { error: "Este QR no está disponible" },
        { status: 403 },
      );
    }

    return NextResponse.json({ context });
  } catch (error) {
    console.error(
      "Error in GET /api/cafeteria/qr/[tenantSlug]/[qrSlug]/context",
      error,
    );
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
