import { type VerifiedMcpToken, verifyMcpToken } from "./auth";
import { mcpDb } from "./db";
import type { McpRequestContext } from "./types";

export class McpAuthError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 401,
  ) {
    super(message);
    this.name = "McpAuthError";
  }
}

const ALLOWED_ROLES = new Set(["owner", "admin", "manager"]);

/**
 * Resuelve el contexto completo de una llamada MCP a partir del header Authorization Bearer.
 */
export async function resolveMcpContext(
  authHeader: string | null | undefined,
): Promise<McpRequestContext> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new McpAuthError(
      "UNAUTHORIZED",
      "Falta el header Authorization con formato 'Bearer <token>'.",
      401,
    );
  }

  const token = authHeader.replace("Bearer ", "").trim();
  let verified: VerifiedMcpToken;
  try {
    verified = await verifyMcpToken(token);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new McpAuthError(
      "INVALID_TOKEN",
      `Token de autorización inválido o expirado: ${msg}`,
      401,
    );
  }

  // 1. Resolver conexión activa en mcp_connections
  const { data: connection, error: connError } = await mcpDb
    .from("mcp_connections")
    .select("id, tenant_id, auth_user_id, oauth_client_id, scopes, status")
    .eq("auth_user_id", verified.sub)
    .eq("oauth_client_id", verified.clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (connError || !connection) {
    throw new McpAuthError(
      "MCP_CONNECTION_NOT_FOUND",
      "No existe una conexión activa autorizada para este usuario y cliente MCP. Por favor completa el flujo de consentimiento.",
      403,
    );
  }

  if (connection.status !== "active") {
    throw new McpAuthError(
      "MCP_CONNECTION_REVOKED",
      "Esta conexión MCP ha sido revocada.",
      403,
    );
  }

  const tenantId = connection.tenant_id as string;

  // 2. Verificar datos y estado del tenant
  const { data: tenant, error: tenantError } = await mcpDb
    .from("tenants")
    .select("id, slug, status")
    .eq("id", tenantId)
    .maybeSingle();

  if (tenantError || !tenant || tenant.status !== "active") {
    throw new McpAuthError(
      "TENANT_INACTIVE",
      "El tenant asociado a la conexión no existe o no está activo.",
      403,
    );
  }

  // 3. Verificar membresía y rol activo en tenant_users
  const { data: tenantUser, error: tuError } = await mcpDb
    .from("tenant_users")
    .select("role, is_active")
    .eq("tenant_id", tenantId)
    .eq("auth_user_id", verified.sub)
    .maybeSingle();

  if (tuError || !tenantUser || tenantUser.is_active === false) {
    throw new McpAuthError(
      "MEMBER_INACTIVE",
      "El usuario no tiene membresía activa en este tenant.",
      403,
    );
  }

  const role = String(tenantUser.role);
  if (!ALLOWED_ROLES.has(role)) {
    throw new McpAuthError(
      "ROLE_FORBIDDEN",
      `El rol '${role}' no tiene permisos para acceder a las herramientas MCP (roles permitidos: owner, admin, manager).`,
      403,
    );
  }

  // 4. Verificar que el addon business-mcp esté habilitado para el tenant
  const { data: moduleData, error: modError } = await mcpDb
    .from("tenant_modules")
    .select("is_enabled, config, modules!inner(slug)")
    .eq("tenant_id", tenantId)
    .eq("modules.slug", "business-mcp")
    .maybeSingle();

  if (modError || !moduleData || !moduleData.is_enabled) {
    throw new McpAuthError(
      "MODULE_DISABLED",
      "El módulo BookNow Business MCP no está habilitado para este tenant.",
      403,
    );
  }

  // Actualizar last_used_at sin esperar
  mcpDb
    .from("mcp_connections")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", connection.id as string)
    .then();

  const config = moduleData.config as { audit_retention_days?: number } | null;
  const auditRetentionDays =
    config?.audit_retention_days &&
    typeof config.audit_retention_days === "number"
      ? config.audit_retention_days
      : 90;

  return {
    authUserId: verified.sub,
    tenantId,
    tenantSlug: String(tenant.slug),
    role: role as "owner" | "admin" | "manager",
    oauthClientId: verified.clientId,
    connectionId: connection.id as string,
    scopes: new Set(
      Array.isArray(connection.scopes) ? (connection.scopes as string[]) : [],
    ),
    requestId: crypto.randomUUID(),
    auditRetentionDays,
  };
}
