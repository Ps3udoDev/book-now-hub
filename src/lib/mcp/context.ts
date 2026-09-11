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
  let { data: connection } = await mcpDb
    .from("mcp_connections")
    .select("id, tenant_id, auth_user_id, oauth_client_id, scopes, status")
    .eq("auth_user_id", verified.sub)
    .eq("oauth_client_id", verified.clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Si no hay registro exacto para este client_id (ej: cliente dinámico como Inspector, ChatGPT o sesión directa):
  if (!connection) {
    // 1a. Buscar si el usuario ya tiene una conexión activa previa autorizada
    const { data: fallbackConn } = await mcpDb
      .from("mcp_connections")
      .select("id, tenant_id, auth_user_id, oauth_client_id, scopes, status")
      .eq("auth_user_id", verified.sub)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fallbackConn?.oauth_client_id === "mcp-client") {
      // Reparar registros creados por la versión anterior del consentimiento,
      // que guardaba un identificador genérico al ignorar la respuesta OAuth.
      const { data: migratedConn, error: migrationError } = await mcpDb
        .from("mcp_connections")
        .upsert(
          {
            auth_user_id: verified.sub,
            tenant_id: fallbackConn.tenant_id,
            oauth_client_id: verified.clientId,
            client_name: "OAuth Client",
            scopes: verified.scopes,
            status: "active",
            revoked_at: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "tenant_id,auth_user_id,oauth_client_id" },
        )
        .select("id, tenant_id, auth_user_id, oauth_client_id, scopes, status")
        .single();

      if (!migrationError && migratedConn) {
        connection = migratedConn;
      }
    }

    if (!connection) {
      // 1b. Si no tiene conexión previa, resolver tenant activo desde tenant_users
      let targetTenantId = verified.tenantId;

      if (!targetTenantId) {
        const { data: memberTenants } = await mcpDb
          .from("tenant_users")
          .select("tenant_id")
          .eq("auth_user_id", verified.sub)
          .eq("is_active", true)
          .in("role", ["owner", "admin", "manager"])
          .limit(1);

        targetTenantId = memberTenants?.[0]?.tenant_id as string | undefined;
      }

      if (!targetTenantId) {
        throw new McpAuthError(
          "MCP_CONNECTION_NOT_FOUND",
          "No se encontró un negocio activo donde este usuario tenga rol de administrador o encargado. Por favor completa el flujo de consentimiento.",
          403,
        );
      }

      // Registrar automáticamente la conexión activa para este cliente y tenant
      const { data: newConn, error: insertError } = await mcpDb
        .from("mcp_connections")
        .insert({
          auth_user_id: verified.sub,
          tenant_id: targetTenantId,
          oauth_client_id: verified.clientId,
          client_name:
            verified.clientId === "unknown_client"
              ? "Direct Session"
              : "MCP Client",
          scopes: verified.scopes,
          status: "active",
        })
        .select("id, tenant_id, auth_user_id, oauth_client_id, scopes, status")
        .single();

      if (insertError || !newConn) {
        const { data: retryConn } = await mcpDb
          .from("mcp_connections")
          .select(
            "id, tenant_id, auth_user_id, oauth_client_id, scopes, status",
          )
          .eq("auth_user_id", verified.sub)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!retryConn) {
          throw new McpAuthError(
            "MCP_CONNECTION_NOT_FOUND",
            "No existe una conexión activa autorizada para este usuario y cliente MCP. Por favor completa el flujo de consentimiento.",
            403,
          );
        }
        connection = retryConn;
      } else {
        connection = newConn;
      }
    }
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
