// src/app/api/cafe/menu/items/[id]/route.ts
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
 * PUT /api/cafe/menu/items/:id
 * Edita campos del item (precio, categoria, disponibilidad, etc.).
 * Soporta reemplazar/registrar la imagen primaria con:
 * image?: { storage_path, thumbnail_path?, is_primary? }
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

    if (!(await resolveTenantAdmin(user.id, current.tenant_id))) {
      return NextResponse.json(
        { error: "Sin permisos para gestionar el menu" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.category_id !== undefined)
      updates.category_id = body.category_id || null;
    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.description !== undefined)
      updates.description = body.description || null;
    if (body.price !== undefined) {
      const p = Number(body.price);
      if (p < 0) {
        return NextResponse.json(
          { error: "price no puede ser negativo" },
          { status: 400 },
        );
      }
      updates.price = p;
    }
    if (body.currency_iso !== undefined)
      updates.currency_iso = body.currency_iso;
    if (body.preparation_time_minutes !== undefined)
      updates.preparation_time_minutes = Number(body.preparation_time_minutes);
    if (body.is_available !== undefined)
      updates.is_available = Boolean(body.is_available);
    if (body.is_active !== undefined)
      updates.is_active = Boolean(body.is_active);

    let item = null;
    if (Object.keys(updates).length > 0) {
      const { data, error } = await supabaseAdmin
        .from("menu_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });

      item = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from("menu_items")
        .select("*")
        .eq("id", id)
        .single();

      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });

      item = data;
    }

    if (body.image?.storage_path) {
      const { data: existingImages, error: existingImageError } = await supabaseAdmin
        .from("menu_item_images")
        .select("id")
        .eq("menu_item_id", id)
        .eq("is_primary", true)
        .order("sort_order", { ascending: true })
        .limit(1);

      if (existingImageError) {
        return NextResponse.json(
          { error: existingImageError.message },
          { status: 500 },
        );
      }

      const existingImage = existingImages?.[0] ?? null;

      if (existingImage?.id) {
        const { error: imageError } = await supabaseAdmin
          .from("menu_item_images")
          .update({
            storage_path: body.image.storage_path,
            thumbnail_path: body.image.thumbnail_path || null,
            is_primary:
              body.image.is_primary !== undefined ? !!body.image.is_primary : true,
            sort_order: 0,
          })
          .eq("id", existingImage.id);

        if (imageError) {
          return NextResponse.json({ error: imageError.message }, { status: 500 });
        }
      } else {
        const { error: imageError } = await supabaseAdmin
          .from("menu_item_images")
          .insert({
            menu_item_id: id,
            storage_path: body.image.storage_path,
            thumbnail_path: body.image.thumbnail_path || null,
            is_primary:
              body.image.is_primary !== undefined ? !!body.image.is_primary : true,
            sort_order: 0,
          });

        if (imageError) {
          return NextResponse.json({ error: imageError.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ item });
  } catch (err) {
    console.error("Error in PUT /api/cafe/menu/items/[id]:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/cafe/menu/items/:id
 * Soft delete: marca is_active=false y is_available=false.
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

    if (!(await resolveTenantAdmin(user.id, current.tenant_id))) {
      return NextResponse.json(
        { error: "Sin permisos para gestionar el menu" },
        { status: 403 },
      );
    }

    const { error } = await supabaseAdmin
      .from("menu_items")
      .update({ is_active: false, is_available: false })
      .eq("id", id);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error in DELETE /api/cafe/menu/items/[id]:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
