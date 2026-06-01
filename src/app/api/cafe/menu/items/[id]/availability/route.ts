// src/app/api/cafe/menu/items/[id]/availability/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/cafe/menu/items/:id/availability
 * Toggle rapido de disponibilidad (ej: "se acabo el cafe"). Sin modal.
 * Body: { is_available: boolean }
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createServerSB();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { data: current } = await supabaseAdmin
      .from("menu_items")
      .select("tenant_id")
      .eq("id", id)
      .single();

    if (!current) {
      return NextResponse.json(
        { error: "Item no encontrado" },
        { status: 404 },
      );
    }

    const { data: tenantUser } = await supabaseAdmin
      .from("tenant_users")
      .select("role")
      .eq("auth_user_id", user.id)
      .eq("tenant_id", current.tenant_id)
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

    const body = await request.json();
    const isAvailable = Boolean(body.is_available);

    const { data: item, error } = await supabaseAdmin
      .from("menu_items")
      .update({ is_available: isAvailable })
      .eq("id", id)
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ item });
  } catch (err) {
    console.error(
      "Error in PATCH /api/cafe/menu/items/[id]/availability:",
      err,
    );
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
