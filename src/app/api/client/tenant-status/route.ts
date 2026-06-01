// src/app/api/client/tenant-status/route.ts
// Endpoint publico (sin auth) para que el layout de /c/[tenant]/... sepa
// si el tenant tiene el app del cliente habilitado y obtenga su nombre.
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantSlug = searchParams.get("tenant");

  if (!tenantSlug) {
    return NextResponse.json(
      { error: "Parametro tenant es requerido" },
      { status: 400 },
    );
  }

  const admin = supabaseAdmin as any;
  const { data, error } = await admin
    .from("tenants")
    .select(
      `
      id,
      name,
      slug,
      status,
      client_app_enabled,
      tenant_client_app_settings(
        template_slug,
        theme_mode,
        brand_name,
        logo_url,
        hero_image_url,
        welcome_title,
        welcome_subtitle,
        google_login_enabled,
        show_google_login_preview,
        custom_tokens,
        custom_sections
      )
      `,
    )
    .eq("slug", tenantSlug)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "Tenant no encontrado" },
      { status: 404 },
    );
  }

  const tenant = data as {
    id: string;
    name: string;
    slug: string;
    status: string;
    client_app_enabled: boolean | null;
    tenant_client_app_settings:
      | {
          template_slug: string;
          theme_mode: string;
          brand_name: string | null;
          logo_url: string | null;
          hero_image_url: string | null;
          welcome_title: string | null;
          welcome_subtitle: string | null;
          google_login_enabled: boolean;
          show_google_login_preview: boolean;
          custom_tokens: unknown;
          custom_sections: unknown;
        }
      | Array<{
          template_slug: string;
          theme_mode: string;
          brand_name: string | null;
          logo_url: string | null;
          hero_image_url: string | null;
          welcome_title: string | null;
          welcome_subtitle: string | null;
          google_login_enabled: boolean;
          show_google_login_preview: boolean;
          custom_tokens: unknown;
          custom_sections: unknown;
        }>
      | null;
  };
  const rawSettings = Array.isArray(tenant.tenant_client_app_settings)
    ? tenant.tenant_client_app_settings[0]
    : tenant.tenant_client_app_settings;

  return NextResponse.json({
    tenant_id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    enabled:
      ["active", "trial"].includes(tenant.status) &&
      (tenant.client_app_enabled ?? true),
    settings: {
      tenant_id: tenant.id,
      tenant_slug: tenant.slug,
      tenant_name: tenant.name,
      client_app_enabled: tenant.client_app_enabled ?? true,
      template_slug: rawSettings?.template_slug ?? "beauty",
      theme_mode: rawSettings?.theme_mode ?? "light",
      brand_name: rawSettings?.brand_name ?? tenant.name,
      logo_url: rawSettings?.logo_url ?? null,
      hero_image_url: rawSettings?.hero_image_url ?? null,
      welcome_title: rawSettings?.welcome_title ?? "Agenda tu proxima cita",
      welcome_subtitle:
        rawSettings?.welcome_subtitle ??
        "Explora servicios, reserva horarios y revisa tu historial desde la app.",
      google_login_enabled: rawSettings?.google_login_enabled ?? false,
      show_google_login_preview: rawSettings?.show_google_login_preview ?? true,
      custom_tokens: rawSettings?.custom_tokens ?? {},
      custom_sections: rawSettings?.custom_sections ?? {},
    },
  });
}
