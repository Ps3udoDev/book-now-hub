// src/app/api/cafe/menu/categories/[id]/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

async function resolveTenantAdmin(
  authUserId: string,
  tenantId: string,
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("tenant_users")
    .select("role")
    .eq("auth_user_id", authUserId)
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .single();
  return !!data && ["owner", "admin", "manager"].includes(data.role);
}

/**
 * PUT /api/cafe/menu/categories/:id
 * Body: { name?, icon?, sort_order?, is_active? }
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createServerSB();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { data: current } = await supabaseAdmin
      .from("menu_categories")
      .select("tenant_id")
      .eq("id", id)
      .single();

    if (!current) {
      return NextResponse.json(
        { error: "Categoria no encontrada" },
        { status: 404 },
      );
    }

    if (!(await resolveTenantAdmin(user.id, current.tenant_id))) {
      return NextResponse.json(
        { error: "Sin permisos para gestionar el menu" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.icon !== undefined) updates.icon = body.icon || null;
    if (body.sort_order !== undefined)
      updates.sort_order = Number(body.sort_order);
    if (body.is_active !== undefined)
      updates.is_active = Boolean(body.is_active);

    const { data: category, error } = await supabaseAdmin
      .from("menu_categories")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ category });
  } catch (err) {
    console.error("Error in PUT /api/cafe/menu/categories/[id]:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/cafe/menu/categories/:id
 * Si la categoria tiene items, los items se dejan sin categoria (FK SET NULL).
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createServerSB();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { data: current } = await supabaseAdmin
      .from("menu_categories")
      .select("tenant_id")
      .eq("id", id)
      .single();

    if (!current) {
      return NextResponse.json(
        { error: "Categoria no encontrada" },
        { status: 404 },
      );
    }

    if (!(await resolveTenantAdmin(user.id, current.tenant_id))) {
      return NextResponse.json(
        { error: "Sin permisos para gestionar el menu" },
        { status: 403 },
      );
    }

    const { error } = await supabaseAdmin
      .from("menu_categories")
      .delete()
      .eq("id", id);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error in DELETE /api/cafe/menu/categories/[id]:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
