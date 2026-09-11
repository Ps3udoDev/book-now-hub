import { NextResponse } from "next/server";
import { oauthTokenLogs } from "../token/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://rrnysepngbycvuciodoj.supabase.co";

  let oidcStatus = "unknown";
  let jwksStatus = "unknown";

  try {
    const oidcRes = await fetch(
      `${supabaseUrl}/auth/v1/.well-known/openid-configuration`,
      { cache: "no-store" },
    );
    oidcStatus = oidcRes.ok
      ? "reachable (200 OK)"
      : `error (${oidcRes.status})`;
  } catch (err: unknown) {
    oidcStatus = `failed: ${err instanceof Error ? err.message : String(err)}`;
  }

  try {
    const jwksRes = await fetch(
      `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
      { cache: "no-store" },
    );
    jwksStatus = jwksRes.ok
      ? "reachable (200 OK)"
      : `error (${jwksRes.status})`;
  } catch (err: unknown) {
    jwksStatus = `failed: ${err instanceof Error ? err.message : String(err)}`;
  }

  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    endpoints: {
      authorizeProxy: "https://book-now-hub.vercel.app/api/oauth/authorize",
      tokenProxy: "https://book-now-hub.vercel.app/api/oauth/token",
      upstreamSupabase: supabaseUrl,
    },
    upstreamHealth: {
      openidConfiguration: oidcStatus,
      jwks: jwksStatus,
    },
    recentOAuthTokenAttempts: oauthTokenLogs,
    instructionsForChatGPT: {
      authType: "OAuth",
      authorizationUrl: "https://book-now-hub.vercel.app/api/oauth/authorize",
      tokenUrl: "https://book-now-hub.vercel.app/api/oauth/token",
      scope: "openid profile email offline_access",
      tokenExchangeMethod:
        "Both 'Predeterminado (POST)' and 'Cabecera de autorización básica' are supported",
    },
  });
}
