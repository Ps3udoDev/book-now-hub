// src/app/auth/callback/route.ts
// Callback generico para flujos auth de Supabase:
// - Email confirm (signup) → ?code=...
// - Magic link / password reset → ?code=...
// - Google OAuth → ?code=...
//
// Si viene `tenant` en el query, despues del intercambio aseguramos
// que existe un customer vinculado en ese tenant.
// El parametro `next` define la URL final (default: home del cliente del tenant).
import { type NextRequest, NextResponse } from "next/server";
import { captureAuthError } from "@/lib/monitoring/auth-errors";
import { ensureClientCustomer } from "@/lib/services/client-customer";
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
    // Los links expirados/reusados llegan como 4xx y se descartan;
    // solo alerta si Supabase fallo de verdad.
    captureAuthError(
      error ?? new Error("Sesion vacia tras exchangeCodeForSession"),
      {
        flow: "auth-callback",
        tenantSlug,
      },
    );
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
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id, slug, status")
      .eq("slug", tenantSlug)
      .maybeSingle();

    if (
      tenant &&
      tenant.status &&
      ["active", "trial"].includes(tenant.status)
    ) {
      const fullName =
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        user.email ||
        "Cliente";

      try {
        await ensureClientCustomer({
          tenantId: tenant.id,
          userId: user.id,
          email: user.email ?? null,
          fullName,
        });
      } catch (linkError) {
        // El usuario ya se autentico; que falle el vinculo del customer es
        // una falla de acceso real y debe alertar.
        captureAuthError(linkError, { flow: "auth-callback", tenantSlug });
        throw linkError;
      }
    }
  }

  const redirectUrl = next.startsWith("/")
    ? `${origin}${next}`
    : `${origin}/${next}`;

  return NextResponse.redirect(redirectUrl);
}
