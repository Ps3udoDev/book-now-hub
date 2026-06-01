// src/app/api/client/_utils.ts
// Helpers compartidos por las rutas /api/client/* (app del cliente final).
// El cliente final es un usuario auth.users vinculado a customers via user_id.
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";
import type { Customer, Tenant } from "@/types";

export interface ClientAuthContext {
  user: { id: string; email: string | null };
  tenant: Tenant;
  customer: Customer;
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

  const admin = supabaseAdmin as any;

  const { data: tenant, error: tenantError } = await admin
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

  const { data: customer, error: customerError } = await admin
    .from("customers")
    .select("*")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (customerError) {
    return NextResponse.json({ error: customerError.message }, { status: 500 });
  }

  if (!customer) {
    return NextResponse.json(
      { error: "El usuario no tiene perfil de cliente en este tenant" },
      { status: 404 },
    );
  }

  return {
    user: { id: user.id, email: user.email ?? null },
    tenant: tenant as Tenant,
    customer: customer as Customer,
  };
}
