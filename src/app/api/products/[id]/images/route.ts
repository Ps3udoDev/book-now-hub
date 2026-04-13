import { type NextRequest, NextResponse } from "next/server";
import { createServerSB } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getProductWithTenant, requireProductWriteAccess } from "../../_utils";

interface ProductImageInput {
  id?: string;
  storage_path: string;
  thumbnail_path?: string | null;
  is_primary?: boolean;
  sort_order?: number;
}

export async function POST(
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
    const productBase = await getProductWithTenant(id);

    if (!productBase) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 },
      );
    }

    const access = await requireProductWriteAccess(productBase.tenant_id, user.id);
    if (access instanceof NextResponse) return access;

    const body = (await request.json()) as {
      images?: ProductImageInput[];
      storage_path?: string;
      thumbnail_path?: string | null;
      is_primary?: boolean;
      sort_order?: number;
    };

    const images = body.images?.length
      ? body.images
      : body.storage_path
        ? [
            {
              storage_path: body.storage_path,
              thumbnail_path: body.thumbnail_path || null,
              is_primary: body.is_primary ?? true,
              sort_order: body.sort_order ?? 0,
            },
          ]
        : [];

    if (!images.length) {
      return NextResponse.json(
        { error: "Debes enviar al menos una imagen" },
        { status: 400 },
      );
    }

    const admin = supabaseAdmin as any;
    const payload = images.map((image, index) => ({
      product_id: id,
      storage_path: image.storage_path,
      thumbnail_path: image.thumbnail_path || null,
      is_primary: image.is_primary ?? index === 0,
      sort_order: image.sort_order ?? index,
    }));

    const { data, error } = await admin
      .from("product_images")
      .insert(payload)
      .select("*");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ images: data || [] }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/products/[id]/images:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

export async function PUT(
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
    const productBase = await getProductWithTenant(id);

    if (!productBase) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 },
      );
    }

    const access = await requireProductWriteAccess(productBase.tenant_id, user.id);
    if (access instanceof NextResponse) return access;

    const body = (await request.json()) as {
      images?: Array<Pick<ProductImageInput, "id" | "is_primary" | "sort_order">>;
    };

    if (!body.images?.length) {
      return NextResponse.json(
        { error: "Debes enviar imágenes para actualizar" },
        { status: 400 },
      );
    }

    const admin = supabaseAdmin as any;
    const results = [];

    for (const image of body.images) {
      if (!image.id) continue;

      const { data, error } = await admin
        .from("product_images")
        .update({
          is_primary: image.is_primary ?? false,
          sort_order: image.sort_order ?? 0,
        })
        .eq("id", image.id)
        .eq("product_id", id)
        .select("*")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      results.push(data);
    }

    return NextResponse.json({ images: results });
  } catch (error) {
    console.error("Error in PUT /api/products/[id]/images:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
