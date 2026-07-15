// src/app/api/tenant/account/route.ts
// Actualiza el perfil del propio usuario del panel (tenant_users). El registro
// objetivo se deriva de la sesión (auth_user_id) — nunca de un id del cliente —
// y solo se escriben campos whitelisted. role/email/permissions/tenant_id/
// is_active jamás se modifican desde aquí.
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantUser } from "@/lib/api/tenant-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { accountProfileSchema } from "@/lib/validations/account";

export async function PATCH(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const tenantId = typeof body.tenant_id === "string" ? body.tenant_id : null;
  const auth = await requireTenantUser(tenantId);
  if (!auth.ok || !auth.tenantUser) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = accountProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const { full_name, phone, city, address, position } = parsed.data;

  const { data, error } = await supabaseAdmin
    .from("tenant_users")
    .update({
      full_name: full_name.trim(),
      phone: phone?.trim() || null,
      city: city?.trim() || null,
      address: address?.trim() || null,
      position: position?.trim() || null,
    })
    .eq("id", auth.tenantUser.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tenantUser: data });
}
