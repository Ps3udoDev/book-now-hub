import { type NextRequest, NextResponse } from "next/server";
import { getBusinessSnapshotCapability } from "@/lib/capabilities/analytics";
import {
  getScheduleSummaryCapability,
  listAppointmentsCapability,
  listAvailableSlotsCapability,
} from "@/lib/capabilities/appointments";
import { searchCustomersCapability } from "@/lib/capabilities/customers";
import {
  confirmAppointmentDraftCapability,
  createAppointmentDraftCapability,
} from "@/lib/capabilities/drafts";
import { logToolCall } from "@/lib/mcp/audit";
import { McpAuthError, resolveMcpContext } from "@/lib/mcp/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

async function executeAction(
  tool: string,
  // biome-ignore lint/suspicious/noExplicitAny: Argumentos dinámicos por tool
  params: Record<string, any>,
  req: NextRequest,
) {
  const authHeader = req.headers.get("authorization");
  let ctx: import("@/lib/mcp/types").McpRequestContext;
  try {
    ctx = await resolveMcpContext(authHeader);
  } catch (err: unknown) {
    if (err instanceof McpAuthError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status, headers: CORS_HEADERS },
      );
    }
    const msg = err instanceof Error ? err.message : "Error de autenticación";
    return NextResponse.json(
      { error: msg },
      { status: 401, headers: CORS_HEADERS },
    );
  }

  const start = Date.now();
  try {
    let result: unknown;
    let riskLevel: "read" | "write" = "read";

    switch (tool) {
      case "get_business_snapshot":
        result = await getBusinessSnapshotCapability(ctx);
        break;
      case "get_schedule_summary":
        result = await getScheduleSummaryCapability(ctx, {
          startDate: params.startDate,
          endDate: params.endDate,
          branchId: params.branchId,
          specialistId: params.specialistId,
        });
        break;
      case "list_available_slots":
        result = await listAvailableSlotsCapability(ctx, {
          serviceId: params.serviceId,
          branchId: params.branchId,
          date: params.date,
          specialistId: params.specialistId,
        });
        break;
      case "list_appointments":
        result = await listAppointmentsCapability(ctx, {
          startDate: params.startDate,
          endDate: params.endDate,
          status: params.status,
          page: params.page ? Number(params.page) : undefined,
          limit: params.limit ? Number(params.limit) : undefined,
        });
        break;
      case "search_customers":
        result = await searchCustomersCapability(ctx, {
          query: params.query,
          limit: params.limit ? Number(params.limit) : undefined,
        });
        break;
      case "create_appointment_draft":
        riskLevel = "write";
        result = await createAppointmentDraftCapability(ctx, {
          customer_id: params.customer_id,
          service_id: params.service_id,
          service_variant_id: params.service_variant_id,
          branch_id: params.branch_id,
          scheduled_at: params.scheduled_at,
          specialist_id: params.specialist_id,
          customer_notes: params.customer_notes,
          idempotency_key: params.idempotency_key || crypto.randomUUID(),
        });
        break;
      case "confirm_appointment_draft":
        riskLevel = "write";
        result = await confirmAppointmentDraftCapability(ctx, {
          draft_id: params.draft_id,
          idempotency_key: params.idempotency_key || crypto.randomUUID(),
        });
        break;
      default:
        return NextResponse.json(
          { error: `Herramienta desconocida: '${tool}'` },
          { status: 404, headers: CORS_HEADERS },
        );
    }

    await logToolCall({
      context: ctx,
      toolName: tool,
      riskLevel,
      status: "succeeded",
      args: params,
      durationMs: Date.now() - start,
    });

    return NextResponse.json(result, { headers: CORS_HEADERS });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await logToolCall({
      context: ctx,
      toolName: tool,
      riskLevel: "read",
      status: "failed",
      args: params,
      errorCode: errorMsg,
      durationMs: Date.now() - start,
    });
    return NextResponse.json(
      { error: errorMsg },
      { status: 400, headers: CORS_HEADERS },
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tool: string }> },
) {
  const { tool } = await params;
  const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
  return executeAction(tool, searchParams, req);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tool: string }> },
) {
  const { tool } = await params;
  let body = {};
  try {
    body = await req.json();
  } catch {
    // Si no hay body se usa objeto vacío
  }
  return executeAction(tool, body, req);
}
