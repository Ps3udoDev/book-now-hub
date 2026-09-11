import { mcpDb } from "./db";
import { sanitizeSafeSummary } from "./formatters";
import type {
  McpRequestContext,
  McpToolRiskLevel,
  McpToolStatus,
} from "./types";

export interface LogToolCallParams {
  context: McpRequestContext;
  toolName: string;
  riskLevel?: McpToolRiskLevel;
  status: McpToolStatus;
  args?: unknown;
  errorCode?: string;
  durationMs?: number;
}

/**
 * Registra una llamada a tool en la tabla mcp_tool_calls de forma sanitizada.
 */
export async function logToolCall(params: LogToolCallParams): Promise<void> {
  const {
    context,
    toolName,
    riskLevel = "read",
    status,
    args,
    errorCode,
    durationMs,
  } = params;

  try {
    const safeSummary = sanitizeSafeSummary(args);

    await mcpDb.from("mcp_tool_calls").insert({
      tenant_id: context.tenantId,
      connection_id: context.connectionId,
      actor_auth_user_id: context.authUserId,
      oauth_client_id: context.oauthClientId,
      request_id: context.requestId,
      tool_name: toolName,
      risk_level: riskLevel,
      safe_summary: safeSummary as import("@/types").Json,
      status: status,
      error_code: errorCode || null,
      duration_ms: durationMs || null,
    });
  } catch (err) {
    console.error("Error registrando auditoría MCP:", err);
  }
}
