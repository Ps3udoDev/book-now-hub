import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://rrnysepngbycvuciodoj.supabase.co";

  const forwardHeaders: Record<string, string> = {
    "Content-Type":
      req.headers.get("content-type") || "application/x-www-form-urlencoded",
  };

  // Reenviar header Authorization para compatibilidad con client_secret_basic (HTTP Basic Auth)
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    forwardHeaders.Authorization = authHeader;
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/oauth/token`, {
    method: "POST",
    headers: forwardHeaders,
    body,
  });

  const data = await response.text();
  return new NextResponse(data, {
    status: response.status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}
