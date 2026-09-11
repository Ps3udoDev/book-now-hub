export interface McpRequestContext {
  authUserId: string;
  tenantId: string;
  tenantSlug: string;
  role: "owner" | "admin" | "manager";
  oauthClientId: string;
  connectionId: string;
  scopes: ReadonlySet<string>;
  requestId: string;
  auditRetentionDays: number;
}

export interface McpConnectionRecord {
  id: string;
  tenant_id: string;
  auth_user_id: string;
  oauth_client_id: string;
  client_name: string | null;
  scopes: string[];
  status: "active" | "revoked";
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export interface McpAppointmentDraftRecord {
  id: string;
  tenant_id: string;
  connection_id: string;
  actor_auth_user_id: string;
  customer_id: string;
  service_id: string;
  service_variant_id: string | null;
  branch_id: string;
  specialist_id: string | null;
  scheduled_at: string;
  ends_at: string;
  duration_minutes: number;
  estimated_price: number | null;
  currency_code: string | null;
  customer_notes: string | null;
  status: "draft" | "confirmed" | "expired" | "cancelled";
  idempotency_key: string;
  expires_at: string;
  confirmed_appointment_id: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type McpToolRiskLevel = "read" | "write" | "sensitive" | "destructive";
export type McpToolStatus = "started" | "succeeded" | "failed" | "denied";
