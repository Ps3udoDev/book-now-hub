import { NextResponse } from "next/server";

export async function GET() {
  const resourceUrl =
    process.env.MCP_PUBLIC_URL || "https://book-now-hub.vercel.app/api/mcp";
  const issuerUrl =
    process.env.MCP_OAUTH_ISSUER ||
    `${process.env.NEXT_PUBLIC_SUPABASE_URL || "https://rrnysepngbycvuciodoj.supabase.co"}/auth/v1`;

  const metadata = {
    resource: resourceUrl,
    authorization_servers: [issuerUrl],
    scopes_supported: [
      "openid",
      "profile",
      "appointments:read",
      "appointments:write",
      "analytics:read",
      "customers:read",
    ],
    bearer_methods_supported: ["header"],
  };

  return NextResponse.json(metadata, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
