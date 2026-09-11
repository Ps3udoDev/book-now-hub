import { createRemoteJWKSet, jwtVerify } from "jose";

export interface VerifiedMcpToken {
  sub: string;
  clientId: string;
  scopes: string[];
  issuer: string;
  expiresAt?: number;
}

let cachedJWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!cachedJWKS) {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "https://rrnysepngbycvuciodoj.supabase.co";
    const jwksUrl = new URL("/auth/v1/.well-known/jwks.json", supabaseUrl);
    cachedJWKS = createRemoteJWKSet(jwksUrl);
  }
  return cachedJWKS;
}

/**
 * Valida un token JWT Bearer contra el endpoint JWKS público de Supabase Auth.
 */
export async function verifyMcpToken(token: string): Promise<VerifiedMcpToken> {
  const jwks = getJWKS();
  const expectedIssuer =
    process.env.MCP_OAUTH_ISSUER ||
    `${process.env.NEXT_PUBLIC_SUPABASE_URL || "https://rrnysepngbycvuciodoj.supabase.co"}/auth/v1`;

  const { payload } = await jwtVerify(token, jwks, {
    issuer: expectedIssuer,
  });

  const sub = payload.sub;
  if (!sub) {
    throw new Error("Token inválido: falta claim 'sub'.");
  }

  // En OAuth 2.1 el client_id puede venir en 'client_id' o 'azp'
  const clientId =
    (payload.client_id as string) ||
    (payload.azp as string) ||
    "unknown_client";

  let scopes: string[] = [];
  if (typeof payload.scope === "string") {
    scopes = payload.scope.split(" ").filter(Boolean);
  } else if (Array.isArray(payload.scopes)) {
    scopes = payload.scopes as string[];
  }

  return {
    sub,
    clientId,
    scopes,
    issuer: payload.iss || expectedIssuer,
    expiresAt: payload.exp,
  };
}
