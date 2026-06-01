// src/app/auth/callback/route.ts
// Callback generico para flujos auth de Supabase:
// - Email confirm (signup) → ?code=...
// - Magic link / password reset → ?code=...
// - Google OAuth → ?code=...
//
// Si viene `tenant` en el query, despues del intercambio aseguramos
// que existe un customer vinculado en ese tenant via get_or_create_customer_for_user.
// El parametro `next` define la URL final (default: home del cliente del tenant).
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tenantSlug = searchParams.get("tenant");
  const next = searchParams.get("next") || "/";

  if (!code) {
    return NextResponse.redirect(new URL(`/?error=missing_code`, request.url));
  }

  const supabase = await createServerSB();

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session?.user) {
    return NextResponse.redirect(
      new URL(
        `/?error=${encodeURIComponent(error?.message ?? "auth_failed")}`,
        request.url,
      ),
    );
  }

  const user = data.session.user;

  // Si trae tenant, garantizar customer vinculado para ese tenant.
  if (tenantSlug) {
    const admin = supabaseAdmin as any;
    const { data: tenant } = await admin
      .from("tenants")
      .select("id, slug, status")
      .eq("slug", tenantSlug)
      .maybeSingle();

    if (tenant && ["active", "trial"].includes(tenant.status)) {
      const fullName =
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        user.email ||
        "Cliente";

      await admin.rpc("get_or_create_customer_for_user", {
        p_tenant_id: tenant.id,
        p_user_id: user.id,
        p_email: user.email ?? "",
        p_full_name: fullName,
        p_phone: null,
      });
    }
  }

  const redirectUrl = next.startsWith("/")
    ? `${origin}${next}`
    : `${origin}/${next}`;

  return NextResponse.redirect(redirectUrl);
}
