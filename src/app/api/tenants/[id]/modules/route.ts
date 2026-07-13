// src/app/api/tenants/[id]/modules/route.ts
// Activar/desactivar un módulo addon de un tenant. Solo global admin.
import { type NextRequest, NextResponse } from "next/server";
import { requireGlobalAdmin } from "@/lib/api/tenant-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id: tenantId } = await params;

    const access = await requireGlobalAdmin();
    if (!access.ok)
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );

    const { moduleId, enabled } = await request.json();
    if (!moduleId || typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "moduleId y enabled son requeridos" },
        { status: 400 },
      );
    }

    // Los módulos core no se pueden desactivar
    const { data: mod } = await supabaseAdmin
      .from("modules")
      .select("is_core")
      .eq("id", moduleId)
      .single();
    if (!mod)
      return NextResponse.json({ error: "Módulo no existe" }, { status: 404 });
    if (mod.is_core && !enabled) {
      return NextResponse.json(
        { error: "Los módulos core no se pueden desactivar" },
        { status: 400 },
      );
    }

    // Upsert manual (sin depender de constraint): existe → update; si no → insert
    const { data: existing } = await supabaseAdmin
      .from("tenant_modules")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("module_id", moduleId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin
        .from("tenant_modules")
        .update({
          is_enabled: enabled,
          enabled_at: enabled ? new Date().toISOString() : null,
          enabled_by: enabled ? access.globalUserId : null,
        })
        .eq("id", existing.id);
      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await supabaseAdmin.from("tenant_modules").insert({
        tenant_id: tenantId,
        module_id: moduleId,
        is_enabled: enabled,
        enabled_at: enabled ? new Date().toISOString() : null,
        enabled_by: enabled ? access.userId : null,
      });
      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error en PATCH /api/tenants/[id]/modules:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
