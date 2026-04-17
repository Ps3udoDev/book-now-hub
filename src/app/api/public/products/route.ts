import { type NextRequest, NextResponse } from "next/server";
import { sortProducts } from "@/features/ecommerce/utils";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantSlug = searchParams.get("tenant_slug");
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    if (!tenantSlug) {
      return NextResponse.json(
        { error: "tenant_slug es requerido" },
        { status: 400 },
      );
    }

    const admin = supabaseAdmin;
    const [{ data: storefrontRows, error: storefrontError }, { data: products, error: productsError }, { data: categories, error: categoriesError }] =
      await Promise.all([
        admin.rpc("get_public_ecommerce_storefront", {
          p_tenant_slug: tenantSlug,
        }),
        admin.rpc("get_public_ecommerce_products", {
          p_tenant_slug: tenantSlug,
          p_search: search || undefined,
          p_category: category || undefined,
        }),
        admin
          .from("v_ecommerce_categories_public")
          .select("category")
          .eq("tenant_slug", tenantSlug)
          .order("category", { ascending: true }),
      ]);

    if (storefrontError) {
      return NextResponse.json({ error: storefrontError.message }, { status: 500 });
    }

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 500 });
    }

    if (categoriesError) {
      return NextResponse.json({ error: categoriesError.message }, { status: 500 });
    }

    const storefront = storefrontRows?.[0] ?? null;

    if (!storefront) {
      return NextResponse.json(
        { error: "Storefront no disponible" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      storefront,
      categories:
        categories
          ?.map((item) => item.category)
          .filter((value): value is string => Boolean(value)) ?? [],
      products: sortProducts(products ?? [], storefront.product_sort),
    });
  } catch (error) {
    console.error("Error in GET /api/public/products:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
