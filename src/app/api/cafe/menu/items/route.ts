// src/app/api/cafe/menu/items/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";

/**
 * POST /api/cafe/menu/items
 * Crea un item del menu. Opcionalmente adjunta una imagen (storage_path ya subido).
 * Body: {
 *   tenant_id, branch_id, category_id?, name, description?,
 *   price, currency_iso?, preparation_time_minutes?, is_available?,
 *   image?: { storage_path, thumbnail_path?, is_primary? }
 * }
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
    const {
      tenant_id,
      branch_id,
      category_id,
      name,
      description,
      price,
      currency_iso,
      preparation_time_minutes,
      is_available,
      image,
    } = body;

    if (!tenant_id || !branch_id || !name || price == null) {
      return NextResponse.json(
        { error: "tenant_id, branch_id, name y price son requeridos" },
        { status: 400 },
      );
    }

    if (Number(price) < 0) {
      return NextResponse.json(
        { error: "price no puede ser negativo" },
        { status: 400 },
      );
    }

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

    const { data: item, error } = await supabaseAdmin
      .from("menu_items")
      .insert({
        tenant_id,
        branch_id,
        category_id: category_id || null,
        name: String(name).trim(),
        description: description || null,
        price: Number(price),
        currency_iso: currency_iso || "USD",
        preparation_time_minutes: Number(preparation_time_minutes) || 0,
        is_available: is_available !== undefined ? Boolean(is_available) : true,
      })
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    // Imagen opcional (storage_path ya subido por el cliente)
    if (image?.storage_path) {
      await supabaseAdmin.from("menu_item_images").insert({
        menu_item_id: item.id,
        storage_path: image.storage_path,
        thumbnail_path: image.thumbnail_path || null,
        is_primary: image.is_primary !== undefined ? !!image.is_primary : true,
        sort_order: 0,
      });
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    console.error("Error in POST /api/cafe/menu/items:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
