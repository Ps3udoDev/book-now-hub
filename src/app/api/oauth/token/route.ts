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

  // Inyectar code_verifier si el cliente no lo incluye en el body
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(body);
    if (!params.get("code_verifier")) {
      params.set("code_verifier", DEFAULT_PKCE_VERIFIER);
      body = params.toString();
    }
  } else if (contentType.includes("application/json")) {
    try {
      const json = JSON.parse(body);
      if (!json.code_verifier) {
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

  // Reenviar header Authorization para compatibilidad con client_secret_basic (HTTP Basic Auth)
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    forwardHeaders.Authorization = authHeader;
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

  if (!response.ok) {
    console.error("OAuth token exchange rejected", {
      status: response.status,
      ...parseSafeOAuthError(data),
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
