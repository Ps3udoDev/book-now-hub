// src/lib/api/tenant-auth.ts
// Helpers de autorización para API routes scoped por tenant.
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";
import type { TenantUser } from "@/types";

export interface TenantAccess {
  ok: boolean;
  status: number;
  error?: string;
  userId?: string;
  role?: string;
  /** id de la fila en global_users (solo en contexto global admin). */
  globalUserId?: string;
}

/**
 * Verifica que exista un usuario autenticado y que pertenezca al `tenantId`.
 * Si se pasan `roles`, además exige que el rol del usuario esté incluido.
 */
export async function requireTenantAccess(
  tenantId: string | null | undefined,
  roles?: string[],
): Promise<TenantAccess> {
  if (!tenantId) {
    return { ok: false, status: 400, error: "tenant_id es requerido" };
  }

  const supabase = await createServerSB();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, status: 401, error: "No autenticado" };
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .eq("tenant_id", tenantId)
    .single();

  if (!profile) {
    return { ok: false, status: 403, error: "Sin acceso a este tenant" };
  }

  if (roles && !roles.includes(profile.role)) {
    return { ok: false, status: 403, error: "Sin permisos suficientes" };
  }

  return { ok: true, status: 200, userId: user.id, role: profile.role };
}

/** Roles con permiso de escritura sobre campañas/segmentos. */
export const CAMPAIGN_WRITE_ROLES = ["owner", "admin", "manager"];

/**
 * Verifica que el usuario autenticado sea un global admin activo
 * (tabla global_users). Usado por rutas del panel de administración.
 */
export async function requireGlobalAdmin(): Promise<TenantAccess> {
  const supabase = await createServerSB();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, status: 401, error: "No autenticado" };
  }

  const { data: globalUser } = await supabaseAdmin
    .from("global_users")
    .select("id, role, is_active")
    .eq("auth_user_id", user.id)
    .single();

  if (!globalUser || globalUser.is_active === false) {
    return { ok: false, status: 403, error: "Requiere global admin" };
  }

  return {
    ok: true,
    status: 200,
    userId: user.id,
    role: globalUser.role,
    globalUserId: globalUser.id,
  };
}

export interface TenantUserResult {
  ok: boolean;
  status: number;
  error?: string;
  tenantUser?: TenantUser;
}

/**
 * Resuelve la fila de `tenant_users` del usuario autenticado para el tenant
 * dado. Garantiza que un usuario solo pueda operar sobre su propio registro
 * (la fila se deriva de la sesión, nunca de un id enviado por el cliente).
 */
export async function requireTenantUser(
  tenantId: string | null | undefined,
): Promise<TenantUserResult> {
  if (!tenantId) {
    return { ok: false, status: 400, error: "tenant_id es requerido" };
  }

  const supabase = await createServerSB();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, status: 401, error: "No autenticado" };
  }

  const { data: tenantUser } = await supabaseAdmin
    .from("tenant_users")
    .select("*")
    .eq("auth_user_id", user.id)
    .eq("tenant_id", tenantId)
    .single();

  if (!tenantUser) {
    return { ok: false, status: 403, error: "Sin acceso a este tenant" };
  }

  return { ok: true, status: 200, tenantUser };
}
