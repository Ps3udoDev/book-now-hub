// src/app/api/tenants/[id]/client-app/route.ts
// PATCH para que el staff (owner/admin) habilite o deshabilite el
// app del cliente final (/c/[tenant]/...) del tenant.
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

const WRITE_ROLES = ["owner", "admin"];

interface PatchBody {
  client_app_enabled?: boolean;
  template_slug?: string;
  theme_mode?: string;
  brand_name?: string | null;
  logo_url?: string | null;
  hero_image_url?: string | null;
  welcome_title?: string | null;
  welcome_subtitle?: string | null;
  google_login_enabled?: boolean;
  show_google_login_preview?: boolean;
  custom_tokens?: Json;
  custom_sections?: Json;
}

const ALLOWED_TEMPLATES = new Set([
  "beauty",
  "dental",
  "wellness",
  "barber",
  "studio",
]);
const ALLOWED_MODES = new Set(["light", "dark", "system"]);

function hasSettingsPayload(body: PatchBody) {
  return [
    "template_slug",
    "theme_mode",
    "brand_name",
    "logo_url",
    "hero_image_url",
    "welcome_title",
    "welcome_subtitle",
    "google_login_enabled",
    "show_google_login_preview",
    "custom_tokens",
    "custom_sections",
  ].some((key) => key in body);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createServerSB();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id: tenantId } = await params;
    const body = (await request.json()) as PatchBody;

    if (
      "client_app_enabled" in body &&
      typeof body.client_app_enabled !== "boolean"
    ) {
      return NextResponse.json(
        { error: "client_app_enabled debe ser boolean" },
        { status: 400 },
      );
    }

    if (body.template_slug && !ALLOWED_TEMPLATES.has(body.template_slug)) {
      return NextResponse.json(
        { error: "template_slug no es valido" },
        { status: 400 },
      );
    }

    if (body.theme_mode && !ALLOWED_MODES.has(body.theme_mode)) {
      return NextResponse.json(
        { error: "theme_mode no es valido" },
        { status: 400 },
      );
    }

    const admin = supabaseAdmin as any;

    const { data: membership } = await admin
      .from("tenant_users")
      .select("role, is_active")
      .eq("tenant_id", tenantId)
      .eq("auth_user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (
      !membership ||
      !WRITE_ROLES.includes((membership as { role: string }).role)
    ) {
      return NextResponse.json(
        { error: "Solo owners y admins pueden cambiar esta configuracion" },
        { status: 403 },
      );
    }

    let tenantQuery = admin
      .from("tenants")
      .select("id, slug, client_app_enabled")
      .eq("id", tenantId)
      .single();

    if ("client_app_enabled" in body) {
      tenantQuery = admin
        .from("tenants")
        .update({ client_app_enabled: body.client_app_enabled })
        .eq("id", tenantId)
        .select("id, slug, client_app_enabled")
        .single();
    }

    const { data: tenant, error } = await tenantQuery;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let settings = null;

    if (hasSettingsPayload(body)) {
      const settingsPayload = {
        tenant_id: tenantId,
        ...(body.template_slug !== undefined && {
          template_slug: body.template_slug,
        }),
        ...(body.theme_mode !== undefined && { theme_mode: body.theme_mode }),
        ...(body.brand_name !== undefined && { brand_name: body.brand_name }),
        ...(body.logo_url !== undefined && { logo_url: body.logo_url }),
        ...(body.hero_image_url !== undefined && {
          hero_image_url: body.hero_image_url,
        }),
        ...(body.welcome_title !== undefined && {
          welcome_title: body.welcome_title,
        }),
        ...(body.welcome_subtitle !== undefined && {
          welcome_subtitle: body.welcome_subtitle,
        }),
        ...(body.google_login_enabled !== undefined && {
          google_login_enabled: body.google_login_enabled,
        }),
        ...(body.show_google_login_preview !== undefined && {
          show_google_login_preview: body.show_google_login_preview,
        }),
        ...(body.custom_tokens !== undefined && {
          custom_tokens: body.custom_tokens,
        }),
        ...(body.custom_sections !== undefined && {
          custom_sections: body.custom_sections,
        }),
      };

      const { data: savedSettings, error: settingsError } = await admin
        .from("tenant_client_app_settings")
        .upsert(settingsPayload, { onConflict: "tenant_id" })
        .select("*")
        .single();

      if (settingsError) {
        return NextResponse.json(
          { error: settingsError.message },
          { status: 500 },
        );
      }

      settings = savedSettings;
    } else {
      const { data: currentSettings } = await admin
        .from("tenant_client_app_settings")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      settings = currentSettings;
    }

    return NextResponse.json({ tenant, settings });
  } catch (error) {
    console.error("Error in PATCH /api/tenants/[id]/client-app:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
