import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";
import {
  getProductWithTenant,
  requireProductWriteAccess,
  requireTenantAccess,
} from "../_utils";

interface UpdateProductBody {
  branch_id?: string;
  name?: string;
  description?: string | null;
  sku?: string | null;
  category?: string | null;
  brand?: string | null;
  price?: number;
  currency_iso?: string;
  min_stock_alert?: number;
  is_active?: boolean;
}

export async function GET(
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
    const productBase = await getProductWithTenant(id);

    if (!productBase) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 },
      );
    }

    const access = await requireTenantAccess(productBase.tenant_id, user.id);
    if (access instanceof NextResponse) return access;

    const admin = supabaseAdmin as any;
    const [
      { data: product, error: productError },
      { data: images, error: imagesError },
      { data: stockSummary, error: stockError },
    ] = await Promise.all([
      admin.from("products").select("*").eq("id", id).single(),
      admin
        .from("product_images")
        .select("*")
        .eq("product_id", id)
        .order("sort_order", { ascending: true }),
      admin
        .from("v_product_stock_summary")
        .select("*")
        .eq("product_id", id)
        .maybeSingle(),
    ]);

    if (productError) {
      return NextResponse.json(
        { error: productError.message },
        { status: 500 },
      );
    }
    if (imagesError) {
      return NextResponse.json({ error: imagesError.message }, { status: 500 });
    }
    if (stockError) {
      return NextResponse.json({ error: stockError.message }, { status: 500 });
    }

    return NextResponse.json({
      product: {
        ...product,
        images: images || [],
        stock_summary: stockSummary || null,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/products/[id]:", error);
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
    const body = (await request.json()) as UpdateProductBody;
    const productBase = await getProductWithTenant(id);

    if (!productBase) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 },
      );
    }

    const access = await requireProductWriteAccess(
      productBase.tenant_id,
      user.id,
    );
    if (access instanceof NextResponse) return access;

    const admin = supabaseAdmin as any;

    if (body.sku) {
      const { data: existingSku } = await admin
        .from("products")
        .select("id")
        .eq("tenant_id", productBase.tenant_id)
        .eq("sku", body.sku.trim())
        .neq("id", id)
        .maybeSingle();

      if (existingSku) {
        return NextResponse.json(
          { error: "Ya existe otro producto con ese SKU" },
          { status: 409 },
        );
      }
    }

    // stock_quantity se controla exclusivamente desde inventory_movements;
    // aceptarlo aquí dejaría el valor inconsistente con calculated_stock.
    const { stock_quantity: _ignored, ...safeBody } =
      body as UpdateProductBody & {
        stock_quantity?: number;
      };

    const { data: product, error } = await admin
      .from("products")
      .update({
        ...safeBody,
        sku:
          safeBody.sku === undefined ? undefined : safeBody.sku?.trim() || null,
        description:
          safeBody.description === undefined
            ? undefined
            : safeBody.description?.trim() || null,
        category:
          safeBody.category === undefined
            ? undefined
            : safeBody.category?.trim() || null,
        brand:
          safeBody.brand === undefined
            ? undefined
            : safeBody.brand?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Error in PUT /api/products/[id]:", error);
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
    const productBase = await getProductWithTenant(id);

    if (!productBase) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 },
      );
    }

    const access = await requireProductWriteAccess(
      productBase.tenant_id,
      user.id,
    );
    if (access instanceof NextResponse) return access;

    const admin = supabaseAdmin as any;

    // Borrar primero los archivos del bucket (el cascade en BD solo elimina
    // las filas de product_images, no los objetos de storage).
    const { data: images } = await admin
      .from("product_images")
      .select("storage_path, thumbnail_path")
      .eq("product_id", id);

    const paths = (
      (images as { storage_path: string; thumbnail_path: string | null }[]) ||
      []
    )
      .flatMap((image) => [image.storage_path, image.thumbnail_path])
      .filter((path): path is string => Boolean(path));

    if (paths.length) {
      const { error: storageError } = await admin.storage
        .from("product-images")
        .remove(paths);

      if (storageError) {
        console.warn(
          "No se pudieron eliminar archivos de storage:",
          storageError.message,
        );
      }
    }

    // Borrado físico del producto. Las FKs product_images e
    // inventory_movements tienen ON DELETE CASCADE, así que sus filas
    // se eliminan automáticamente.
    const { error } = await admin.from("products").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/products/[id]:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
