import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const PRODUCT_WRITE_ROLES = ["owner", "admin", "manager"];

export async function getTenantMembership(tenantId: string, userId: string) {
  const admin = supabaseAdmin as any;

  const { data, error } = await admin
    .from("tenant_users")
    .select("role, is_active")
    .eq("tenant_id", tenantId)
    .eq("auth_user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as { role: string; is_active: boolean } | null;
}

export async function requireTenantAccess(tenantId: string, userId: string) {
  const membership = await getTenantMembership(tenantId, userId);

  if (!membership) {
    return NextResponse.json(
      { error: "Sin permisos en este tenant" },
      { status: 403 },
    );
  }

  return membership;
}

export async function requireProductWriteAccess(
  tenantId: string,
  userId: string,
) {
  const membership = await getTenantMembership(tenantId, userId);

  if (!membership || !PRODUCT_WRITE_ROLES.includes(membership.role)) {
    return NextResponse.json(
      { error: "No tienes permisos para modificar productos" },
      { status: 403 },
    );
  }

  return membership;
}

export async function getProductWithTenant(productId: string) {
  const admin = supabaseAdmin as any;

  const { data, error } = await admin
    .from("products")
    .select("id, tenant_id, branch_id, is_active")
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as {
    id: string;
    tenant_id: string;
    branch_id: string;
    is_active: boolean;
  } | null;
}
