import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Verifier / Challenge para clientes (como ChatGPT Actions) que no envían PKCE
export const DEFAULT_PKCE_VERIFIER =
  "booknow_chatgpt_pkce_verifier_secure_secret_string_1234567890";
export const DEFAULT_PKCE_CHALLENGE =
  "padONAkPjSGNl4xJGxCJsm7D1ZPv8mJlw5h4rFuMIks";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const searchParams = new URLSearchParams(url.searchParams);
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://rrnysepngbycvuciodoj.supabase.co";

  // Si el cliente (como ChatGPT) no envía code_challenge, inyectamos PKCE para Supabase OAuth 2.1
  if (!searchParams.get("code_challenge")) {
    searchParams.set("code_challenge", DEFAULT_PKCE_CHALLENGE);
    searchParams.set("code_challenge_method", "S256");
  }

  const supabaseAuthUrl = `${supabaseUrl}/auth/v1/oauth/authorize?${searchParams.toString()}`;
  return NextResponse.redirect(supabaseAuthUrl, 302);
}
