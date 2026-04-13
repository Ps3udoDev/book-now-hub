import { type NextRequest, NextResponse } from "next/server";
import { createServerSB } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getProductWithTenant, requireProductWriteAccess } from "../../../_utils";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; imageId: string }> },
) {
  try {
    const supabase = await createServerSB();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id, imageId } = await context.params;
    const productBase = await getProductWithTenant(id);

    if (!productBase) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 },
      );
    }

    const access = await requireProductWriteAccess(productBase.tenant_id, user.id);
    if (access instanceof NextResponse) return access;

    const admin = supabaseAdmin as any;
    const { data: image, error: imageError } = await admin
      .from("product_images")
      .select("storage_path, thumbnail_path")
      .eq("id", imageId)
      .eq("product_id", id)
      .maybeSingle();

    if (imageError) {
      return NextResponse.json({ error: imageError.message }, { status: 500 });
    }

    if (!image) {
      return NextResponse.json(
        { error: "Imagen no encontrada" },
        { status: 404 },
      );
    }

    const paths = [image.storage_path, image.thumbnail_path].filter(Boolean);
    if (paths.length) {
      const { error: storageError } = await admin.storage
        .from("product-images")
        .remove(paths);

      if (storageError) {
        console.warn("No se pudo eliminar archivo de storage:", storageError.message);
      }
    }

    const { error } = await admin
      .from("product_images")
      .delete()
      .eq("id", imageId)
      .eq("product_id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/products/[id]/images/[imageId]:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
