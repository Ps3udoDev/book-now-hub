import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";
import { slugifyWorkstationQr } from "@/lib/utils/cafeteria-qr";

type Params = { params: Promise<{ id: string }> };

async function buildUniqueSlug(baseSlug: string, excludeId: string) {
  const normalizedBase = slugifyWorkstationQr(baseSlug) || `estacion-${Date.now()}`;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate =
      attempt === 0 ? normalizedBase : `${normalizedBase}-${attempt + 1}`;

    const { data } = await supabaseAdmin
      .from("workstations")
      .select("id")
      .eq("cafeteria_qr_slug", candidate)
      .maybeSingle();

    if (!data || data.id === excludeId) {
      return candidate;
    }
  }

  return `${normalizedBase}-${Date.now()}`;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createServerSB();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const enabled = Boolean(body.enabled);
    const requestedSlug =
      typeof body.slug === "string" ? slugifyWorkstationQr(body.slug) : null;

    const { data: workstation, error: workstationError } = await supabaseAdmin
      .from("workstations")
      .select("*")
      .eq("id", id)
      .single();

    if (workstationError || !workstation) {
      return NextResponse.json(
        { error: "Estación no encontrada" },
        { status: 404 },
      );
    }

    const { data: tenantUser } = await supabaseAdmin
      .from("tenant_users")
      .select("role")
      .eq("tenant_id", workstation.tenant_id)
      .eq("auth_user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!tenantUser || !["owner", "admin", "manager"].includes(tenantUser.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("tenant_id", workstation.tenant_id)
      .eq("email", user.email || "")
      .eq("is_active", true)
      .maybeSingle();

    const nextSlug = enabled
      ? await buildUniqueSlug(
          requestedSlug || workstation.cafeteria_qr_slug || workstation.name,
          workstation.id,
        )
      : workstation.cafeteria_qr_slug;

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("workstations")
      .update({
        cafeteria_qr_enabled: enabled,
        cafeteria_qr_slug: nextSlug,
        cafeteria_qr_last_generated_at: enabled
          ? new Date().toISOString()
          : workstation.cafeteria_qr_last_generated_at,
        cafeteria_qr_updated_by: profile?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workstation.id)
      .select("*")
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: updateError?.message || "No se pudo actualizar la estación" },
        { status: 500 },
      );
    }

    return NextResponse.json({ workstation: updated });
  } catch (error) {
    console.error(
      "Error in PATCH /api/cafeteria/settings/workstations/[id]/qr",
      error,
    );
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
