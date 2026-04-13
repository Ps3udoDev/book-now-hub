import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const INVENTORY_ADMIN_ROLES = ["owner", "admin", "manager"];

export async function getProductInventoryContext(productId: string) {
  const admin = supabaseAdmin as any;

  const { data, error } = await admin
    .from("products")
    .select("id, tenant_id, branch_id, stock_quantity, name")
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as {
    id: string;
    tenant_id: string;
    branch_id: string;
    stock_quantity: number;
    name: string;
  } | null;
}

export async function getTenantUserRole(tenantId: string, userId: string) {
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

export async function requireInventoryAdmin(tenantId: string, userId: string) {
  const membership = await getTenantUserRole(tenantId, userId);

  if (!membership || !INVENTORY_ADMIN_ROLES.includes(membership.role)) {
    return NextResponse.json(
      { error: "No tienes permisos para gestionar inventario" },
      { status: 403 },
    );
  }

  return membership;
}

export function inventoryErrorResponse(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Error interno del servidor";

  if (
    message.toLowerCase().includes("stock insuficiente") ||
    message.toLowerCase().includes("insuficiente")
  ) {
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ error: message }, { status: 500 });
}
