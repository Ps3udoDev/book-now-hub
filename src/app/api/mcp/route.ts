import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { type NextRequest, NextResponse } from "next/server";
import { McpAuthError, resolveMcpContext } from "@/lib/mcp/context";
import { createBookNowMcpServer } from "@/lib/mcp/server-factory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id",
  "Access-Control-Expose-Headers": "Mcp-Session-Id",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

async function handleMcpRequest(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get("authorization");

  let ctx: import("@/lib/mcp/types").McpRequestContext;
  try {
    ctx = await resolveMcpContext(authHeader);
  } catch (err: unknown) {
    if (err instanceof McpAuthError) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: err.status === 401 ? -32001 : -32002,
            message: err.message,
            data: { errorCode: err.code },
          },
          id: null,
        },
        {
          status: err.status,
          headers: {
            ...CORS_HEADERS,
            "WWW-Authenticate": 'Bearer error="invalid_token"',
          },
        },
      );
    }

    const msg = err instanceof Error ? err.message : "Error de autenticación";
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: { code: -32000, message: msg },
        id: null,
      },
      { status: 401, headers: CORS_HEADERS },
    );
  }

  // Inicializar servidor contextualizado y transporte WebStandard
  const server = createBookNowMcpServer(ctx);
  const transport = new WebStandardStreamableHTTPServerTransport();

  await server.connect(transport);
  const response = await transport.handleRequest(request);

  // Agregar headers CORS a la respuesta del transporte
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }

  return response;
}

export async function GET(request: NextRequest) {
  return handleMcpRequest(request);
}

export async function POST(request: NextRequest) {
  return handleMcpRequest(request);
}

export async function DELETE(request: NextRequest) {
  return handleMcpRequest(request);
}
