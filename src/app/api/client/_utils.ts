// src/app/api/client/_utils.ts
// Helpers compartidos por las rutas /api/client/* (app del cliente final).
// El cliente final es un usuario auth.users vinculado a customers via user_id.
import { type NextRequest, NextResponse } from "next/server";
import { ensureClientCustomer } from "@/lib/services/client-customer";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";
import type { Customer, Tenant } from "@/types";

export interface ClientAuthContext {
  user: { id: string; email: string | null };
  tenant: Tenant;
  customer: Customer;
}

function getUserFullName(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}) {
  const metadataName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : null;

  return metadataName?.trim() || user.email || "Cliente";
}

/**
 * Resuelve el customer del usuario autenticado para el tenant indicado.
 * El tenant se identifica por query string `?tenant=<slug>`.
 *
 * Si falta auth, tenant o el customer no existe, devuelve un NextResponse
 * con el codigo apropiado para que la ruta lo retorne directamente.
 */
export async function requireClientCustomer(
  request: NextRequest,
): Promise<ClientAuthContext | NextResponse> {
  const supabase = await createServerSB();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tenantSlug = searchParams.get("tenant");

  if (!tenantSlug) {
    return NextResponse.json(
      { error: "Parametro tenant es requerido" },
      { status: 400 },
    );
  }

  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from("tenants")
    .select("*")
    .eq("slug", tenantSlug)
    .maybeSingle();

  if (tenantError || !tenant) {
    return NextResponse.json(
      { error: "Tenant no encontrado" },
      { status: 404 },
    );
  }

  const { data: customer, error: customerError } = await supabaseAdmin
    .from("customers")
    .select("*")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (customerError) {
    return NextResponse.json({ error: customerError.message }, { status: 500 });
  }

  if (!customer) {
    try {
      const ensuredCustomer = await ensureClientCustomer({
        tenantId: tenant.id,
        userId: user.id,
        email: user.email ?? null,
        fullName: getUserFullName(user),
      });

      return {
        user: { id: user.id, email: user.email ?? null },
        tenant: tenant as Tenant,
        customer: ensuredCustomer,
      };
    } catch (error) {
      return NextResponse.json(
        {
          error:
            (error as Error).message ??
            "El usuario no tiene perfil de cliente en este tenant",
        },
        { status: 500 },
      );
    }
  }

  if (customer.is_active === false) {
    return NextResponse.json(
      { error: "El perfil de cliente esta inactivo en este tenant" },
      { status: 403 },
    );
  }

  return {
    user: { id: user.id, email: user.email ?? null },
    tenant: tenant as Tenant,
    customer: customer as Customer,
  };
}
