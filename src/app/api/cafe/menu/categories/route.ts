// src/app/api/cafe/menu/categories/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";

/**
 * GET /api/cafe/menu/categories?tenant_id=...&branch_id=...
 * Lista categorias del menu (incluye inactivas para admin).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenant_id");
    const branchId = searchParams.get("branch_id");

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenant_id es requerido" },
        { status: 400 },
      );
    }

    let query = supabaseAdmin
      .from("menu_categories")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (branchId) {
      query = query.or(`branch_id.is.null,branch_id.eq.${branchId}`);
    }

    const { data, error } = await query;
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ categories: data });
  } catch (err) {
    console.error("Error in GET /api/cafe/menu/categories:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/cafe/menu/categories
 * Body: { tenant_id, branch_id?, name, icon?, sort_order?, is_active? }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSB();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const body = await request.json();
    const { tenant_id, branch_id, name, icon, sort_order, is_active } = body;

    if (!tenant_id || !name) {
      return NextResponse.json(
        { error: "tenant_id y name son requeridos" },
        { status: 400 },
      );
    }

    // Permisos: owner/admin/manager
    const { data: tenantUser } = await supabaseAdmin
      .from("tenant_users")
      .select("role")
      .eq("auth_user_id", user.id)
      .eq("tenant_id", tenant_id)
      .eq("is_active", true)
      .single();

    if (
      !tenantUser ||
      !["owner", "admin", "manager"].includes(tenantUser.role)
    ) {
      return NextResponse.json(
        { error: "Sin permisos para gestionar el menu" },
        { status: 403 },
      );
    }

    const { data: category, error } = await supabaseAdmin
      .from("menu_categories")
      .insert({
        tenant_id,
        branch_id: branch_id || null,
        name: String(name).trim(),
        icon: icon || null,
        sort_order: Number(sort_order) || 0,
        is_active: is_active !== undefined ? Boolean(is_active) : true,
      })
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    console.error("Error in POST /api/cafe/menu/categories:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
