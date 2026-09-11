import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const DEFAULT_PKCE_VERIFIER =
  "booknow_chatgpt_pkce_verifier_secure_secret_string_1234567890";
const MAX_UPSTREAM_ATTEMPTS = 3;

export interface OAuthLogEntry {
  timestamp: string;
  type: "token";
  request: {
    contentType: string;
    authType: string;
    clientId?: string;
    hasClientSecret: boolean;
    redirectUri?: string;
    grantType?: string;
    hasCodeVerifier: boolean;
  };
  upstreamResponse: {
    status: number;
    statusText: string;
    data: unknown;
  };
}

// Buffer en memoria para diagnóstico de las últimas 20 peticiones OAuth
export const oauthTokenLogs: OAuthLogEntry[] = [];

function recordLog(entry: OAuthLogEntry) {
  oauthTokenLogs.unshift(entry);
  if (oauthTokenLogs.length > 20) {
    oauthTokenLogs.pop();
  }
}

interface SafeOAuthError {
  code?: number | string;
  error?: string;
  error_code?: string;
  error_description?: string;
  msg?: string;
}

function parseSafeOAuthError(body: string): SafeOAuthError {
  try {
    const value = JSON.parse(body) as SafeOAuthError;
    return {
      code: value.code,
      error: value.error,
      error_code: value.error_code,
      error_description: value.error_description,
      msg: value.msg,
    };
  } catch {
    return {};
  }
}

function isTransientUpstreamFailure(body: string) {
  return (
    body.includes("Cloudflare") ||
    body.includes("Could not find host") ||
    body.includes("Error 1018")
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(req: NextRequest) {
  let body = await req.text();
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://rrnysepngbycvuciodoj.supabase.co";

  const contentType =
    req.headers.get("content-type") || "application/x-www-form-urlencoded";

  let clientId: string | null = null;
  let clientSecret: string | null = null;
  let redirectUri: string | undefined;
  let grantType: string | undefined;
  let hasClientVerifier = false;

  // 1. Extraer credenciales desde Authorization header si viene Basic Auth
  const incomingAuthHeader = req.headers.get("authorization");
  let authType = "none";

  if (incomingAuthHeader?.startsWith("Basic ")) {
    authType = "basic";
    try {
      const decoded = Buffer.from(
        incomingAuthHeader.replace("Basic ", "").trim(),
        "base64",
      ).toString("utf-8");
      const colonIdx = decoded.indexOf(":");
      if (colonIdx !== -1) {
        clientId = decoded.slice(0, colonIdx);
        clientSecret = decoded.slice(colonIdx + 1);
      }
    } catch {
      // Ignorar error de decodificación
    }
  }

  // 2. Extraer parámetros desde el cuerpo (urlencoded o json)
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(body);
    grantType = params.get("grant_type") || undefined;
    redirectUri = params.get("redirect_uri") || undefined;

    if (!clientId && params.get("client_id")) {
      clientId = params.get("client_id");
      authType = "body_post";
    }
    if (!clientSecret && params.get("client_secret")) {
      clientSecret = params.get("client_secret");
    }

    // Inyectar code_verifier si el cliente no lo incluye
    if (params.get("code_verifier")) {
      hasClientVerifier = true;
    } else {
      params.set("code_verifier", DEFAULT_PKCE_VERIFIER);
      body = params.toString();
    }
  } else if (contentType.includes("application/json")) {
    try {
      const json = JSON.parse(body);
      grantType = json.grant_type;
      redirectUri = json.redirect_uri;

      if (!clientId && json.client_id) {
        clientId = json.client_id;
        authType = "body_json";
      }
      if (!clientSecret && json.client_secret) {
        clientSecret = json.client_secret;
      }

      if (json.code_verifier) {
        hasClientVerifier = true;
      } else {
        json.code_verifier = DEFAULT_PKCE_VERIFIER;
        body = JSON.stringify(json);
      }
    } catch {
      // Dejar body original
    }
  }

  const forwardHeaders: Record<string, string> = {
    "Content-Type": contentType,
  };

  // 3. Puente de autenticación de cliente para compatibilidad total:
  // Supabase Auth OAuth 2.1 suele requerir client_secret_basic (HTTP Basic Auth).
  // Si ChatGPT envía las credenciales en el body (solicitud POST), generamos el header Basic Auth.
  if (clientId && clientSecret) {
    const cleanId = clientId.trim();
    const cleanSecret = clientSecret.trim();
    const basicToken = Buffer.from(`${cleanId}:${cleanSecret}`).toString(
      "base64",
    );
    forwardHeaders.Authorization = `Basic ${basicToken}`;
  } else if (incomingAuthHeader) {
    forwardHeaders.Authorization = incomingAuthHeader;
  }

  let response: Response | null = null;
  let data = "";

  for (let attempt = 1; attempt <= MAX_UPSTREAM_ATTEMPTS; attempt += 1) {
    try {
      response = await fetch(`${supabaseUrl}/auth/v1/oauth/token`, {
        method: "POST",
        headers: forwardHeaders,
        body,
        cache: "no-store",
      });
      data = await response.text();

      if (
        !isTransientUpstreamFailure(data) ||
        attempt === MAX_UPSTREAM_ATTEMPTS
      ) {
        break;
      }
    } catch (error: unknown) {
      if (attempt === MAX_UPSTREAM_ATTEMPTS) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("OAuth token upstream network failure", {
          attempts: attempt,
          message,
        });

        recordLog({
          timestamp: new Date().toISOString(),
          type: "token",
          request: {
            contentType,
            authType,
            clientId: clientId || undefined,
            hasClientSecret: Boolean(clientSecret),
            redirectUri,
            grantType,
            hasCodeVerifier: hasClientVerifier,
          },
          upstreamResponse: {
            status: 503,
            statusText: "Service Unavailable",
            data: { error: message },
          },
        });

        return NextResponse.json(
          {
            error: "temporarily_unavailable",
            error_description:
              "No se pudo contactar temporalmente al servidor OAuth.",
          },
          {
            status: 503,
            headers: { ...CORS_HEADERS, "Cache-Control": "no-store" },
          },
        );
      }
    }
  }

  if (!response) {
    return NextResponse.json(
      {
        error: "temporarily_unavailable",
        error_description: "El servidor OAuth no devolvió una respuesta.",
      },
      {
        status: 503,
        headers: { ...CORS_HEADERS, "Cache-Control": "no-store" },
      },
    );
  }

  let parsedData: unknown;
  try {
    parsedData = JSON.parse(data);
  } catch {
    parsedData = data;
  }

  // Registrar en el log de diagnóstico
  recordLog({
    timestamp: new Date().toISOString(),
    type: "token",
    request: {
      contentType,
      authType,
      clientId: clientId || undefined,
      hasClientSecret: Boolean(clientSecret),
      redirectUri,
      grantType,
      hasCodeVerifier: hasClientVerifier,
    },
    upstreamResponse: {
      status: response.status,
      statusText: response.statusText,
      data: parsedData,
    },
  });

  if (!response.ok) {
    console.error("OAuth token exchange rejected", {
      status: response.status,
      ...parseSafeOAuthError(data),
      forwardedBasicAuth: Boolean(forwardHeaders.Authorization),
      clientId,
    });
  }

  return new NextResponse(data, {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("content-type") || "application/json",
      "Cache-Control": "no-store",
      ...CORS_HEADERS,
    },
  });
}
