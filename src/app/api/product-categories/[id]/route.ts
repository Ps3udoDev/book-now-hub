import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";
import { requireProductWriteAccess } from "../../products/_utils";

interface UpdateCategoryBody {
  name?: string;
  icon?: string | null;
  sort_order?: number | null;
}

async function getCategory(id: string) {
  const admin = supabaseAdmin as any;
  const { data, error } = await admin
    .from("product_categories")
    .select("id, tenant_id, name")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as { id: string; tenant_id: string; name: string } | null;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createServerSB();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as UpdateCategoryBody;

    const category = await getCategory(id);
    if (!category) {
      return NextResponse.json(
        { error: "Categoría no encontrada" },
        { status: 404 },
      );
    }

    const access = await requireProductWriteAccess(category.tenant_id, user.id);
    if (access instanceof NextResponse) return access;

    const admin = supabaseAdmin as any;
    const newName = body.name?.trim();

    if (newName && newName.toLowerCase() !== category.name.toLowerCase()) {
      const { data: existing } = await admin
        .from("product_categories")
        .select("id")
        .eq("tenant_id", category.tenant_id)
        .ilike("name", newName)
        .neq("id", id)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: "Ya existe otra categoría con ese nombre" },
          { status: 409 },
        );
      }
    }

    const { data: updated, error } = await admin
      .from("product_categories")
      .update({
        name: newName ?? undefined,
        icon: body.icon === undefined ? undefined : body.icon?.trim() || null,
        sort_order: body.sort_order ?? undefined,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Si cambió el nombre, propagar a los productos que la usaban (se enlazan
    // por nombre, no por FK).
    if (newName && newName !== category.name) {
      await admin
        .from("products")
        .update({ category: newName, updated_at: new Date().toISOString() })
        .eq("tenant_id", category.tenant_id)
        .eq("category", category.name);
    }

    return NextResponse.json({ category: updated });
  } catch (error) {
    console.error("Error in PATCH /api/product-categories/[id]:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createServerSB();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await context.params;
    const category = await getCategory(id);

    if (!category) {
      return NextResponse.json(
        { error: "Categoría no encontrada" },
        { status: 404 },
      );
    }

    const access = await requireProductWriteAccess(category.tenant_id, user.id);
    if (access instanceof NextResponse) return access;

    const admin = supabaseAdmin as any;

    // Los productos que la usaban conservan su texto de categoría; solo se
    // elimina la categoría del catálogo gestionado.
    const { error } = await admin
      .from("product_categories")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/product-categories/[id]:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
