// src/app/api/admin/tenant-modules/route.ts
// Toggle de módulos por tenant. Solo global admin. Upsert sobre tenant_modules.
import { type NextRequest, NextResponse } from "next/server";
import { requireGlobalAdmin } from "@/lib/api/tenant-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** PATCH /api/admin/tenant-modules  body: { tenant_id, module_id, is_enabled } */
export async function PATCH(request: NextRequest) {
  try {
    const access = await requireGlobalAdmin();
    if (!access.ok)
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );

    const { tenant_id, module_id, is_enabled } = await request.json();
    if (!tenant_id || !module_id || typeof is_enabled !== "boolean") {
      return NextResponse.json(
        { error: "tenant_id, module_id e is_enabled son requeridos" },
        { status: 400 },
      );
    }

    // Los módulos core no se pueden desactivar.
    const { data: mod } = await supabaseAdmin
      .from("modules")
      .select("is_core")
      .eq("id", module_id)
      .maybeSingle();
    if (!mod)
      return NextResponse.json({ error: "Módulo no existe" }, { status: 404 });
    if (mod.is_core && !is_enabled)
      return NextResponse.json(
        { error: "Los módulos core no se pueden desactivar" },
        { status: 400 },
      );

    // Buscar fila existente para decidir update vs insert.
    const { data: existing } = await supabaseAdmin
      .from("tenant_modules")
      .select("id")
      .eq("tenant_id", tenant_id)
      .eq("module_id", module_id)
      .maybeSingle();

    const payload = {
      is_enabled,
      enabled_at: is_enabled ? new Date().toISOString() : null,
      enabled_by: access.globalUserId ?? null,
    };

    const result = existing
      ? await supabaseAdmin
          .from("tenant_modules")
          .update(payload)
          .eq("id", existing.id)
          .select()
          .single()
      : await supabaseAdmin
          .from("tenant_modules")
          .insert({ tenant_id, module_id, ...payload })
          .select()
          .single();

    if (result.error)
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 },
      );
    return NextResponse.json({ tenant_module: result.data });
  } catch (err) {
    console.error("Error en PATCH /api/admin/tenant-modules:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
