import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantSlug = searchParams.get("tenant_slug");
    const { id } = await context.params;

    if (!tenantSlug) {
      return NextResponse.json(
        { error: "tenant_slug es requerido" },
        { status: 400 },
      );
    }

    const admin = supabaseAdmin;
    const [{ data: storefrontRows, error: storefrontError }, { data: product, error: productError }] =
      await Promise.all([
        admin.rpc("get_public_ecommerce_storefront", {
          p_tenant_slug: tenantSlug,
        }),
        admin
          .from("v_ecommerce_products_public")
          .select("*")
          .eq("tenant_slug", tenantSlug)
          .eq("product_id", id)
          .maybeSingle(),
      ]);

    if (storefrontError) {
      return NextResponse.json({ error: storefrontError.message }, { status: 500 });
    }

    return NextResponse.json({
      storefront: storefrontRows?.[0] ?? null,
      product,
    });
  } catch (error) {
    console.error("Error in GET /api/public/products/[id]:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
