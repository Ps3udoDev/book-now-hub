import { type NextRequest, NextResponse } from "next/server";
import { createServerSB } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireProductWriteAccess, requireTenantAccess } from "./_utils";

interface CreateProductBody {
  tenant_id: string;
  branch_id: string;
  name: string;
  description?: string | null;
  sku?: string | null;
  category?: string | null;
  brand?: string | null;
  price: number;
  currency_iso?: string;
  stock_quantity?: number;
  min_stock_alert?: number;
  is_active?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSB();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenant_id");
    const branchId = searchParams.get("branch_id");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const isActive = searchParams.get("is_active");
    const page = Number(searchParams.get("page") || "1");
    const pageSize = Number(searchParams.get("page_size") || "20");

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenant_id es requerido" },
        { status: 400 },
      );
    }

    const access = await requireTenantAccess(tenantId, user.id);
    if (access instanceof NextResponse) return access;

    const from = (Math.max(page, 1) - 1) * Math.max(pageSize, 1);
    const to = from + Math.max(pageSize, 1) - 1;
    const admin = supabaseAdmin as any;

    let query = admin
      .from("products")
      .select("*", { count: "exact" })
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (branchId) query = query.eq("branch_id", branchId);
    if (category) query = query.eq("category", category);
    if (isActive === "true" || isActive === "false") {
      query = query.eq("is_active", isActive === "true");
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
    }

    const { data: products, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const productIds = (products || []).map((product: { id: string }) => product.id);
    const adminImages = supabaseAdmin as any;
    const adminStock = supabaseAdmin as any;

    const [
      { data: images, error: imagesError },
      { data: stockRows, error: stockError },
    ] = await Promise.all([
      productIds.length
        ? adminImages
            .from("product_images")
            .select("*")
            .in("product_id", productIds)
            .order("is_primary", { ascending: false })
            .order("sort_order", { ascending: true })
        : Promise.resolve({ data: [] }),
      productIds.length
        ? adminStock
            .from("v_product_stock_summary")
            .select("*")
            .in("product_id", productIds)
        : Promise.resolve({ data: [] }),
    ]);

    if (imagesError) {
      return NextResponse.json({ error: imagesError.message }, { status: 500 });
    }

    if (stockError) {
      return NextResponse.json({ error: stockError.message }, { status: 500 });
    }

    const imagesByProduct = new Map<string, unknown[]>();
    for (const image of images || []) {
      const key = (image as { product_id: string }).product_id;
      const current = imagesByProduct.get(key) || [];
      current.push(image);
      imagesByProduct.set(key, current);
    }

    const stockByProduct = new Map<string, unknown>();
    for (const stock of stockRows || []) {
      stockByProduct.set((stock as { product_id: string }).product_id, stock);
    }

    const enrichedProducts = (products || []).map((product: { id: string }) => {
      const productImages = (imagesByProduct.get(product.id) || []) as Array<{
        id: string;
        storage_path: string;
        thumbnail_path: string | null;
        is_primary: boolean | null;
        sort_order: number | null;
      }>;
      const primaryImage =
        productImages.find((image) => image.is_primary) || productImages[0] || null;
      const stockSummary = stockByProduct.get(product.id) || null;

      return {
        ...product,
        primary_image: primaryImage,
        images: productImages,
        stock_summary: stockSummary,
      };
    });

    return NextResponse.json({
      products: enrichedProducts,
      pagination: {
        page,
        page_size: pageSize,
        total: count || 0,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/products:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSB();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = (await request.json()) as CreateProductBody;

    if (!body.tenant_id || !body.branch_id || !body.name || body.price === undefined) {
      return NextResponse.json(
        { error: "Campos requeridos: tenant_id, branch_id, name, price" },
        { status: 400 },
      );
    }

    const access = await requireProductWriteAccess(body.tenant_id, user.id);
    if (access instanceof NextResponse) return access;

    const admin = supabaseAdmin as any;

    if (body.sku) {
      const { data: existingSku } = await admin
        .from("products")
        .select("id")
        .eq("tenant_id", body.tenant_id)
        .eq("sku", body.sku.trim())
        .maybeSingle();

      if (existingSku) {
        return NextResponse.json(
          { error: "Ya existe un producto con ese SKU en este tenant" },
          { status: 409 },
        );
      }
    }

    const { data: product, error } = await admin
      .from("products")
      .insert({
        tenant_id: body.tenant_id,
        branch_id: body.branch_id,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        sku: body.sku?.trim() || null,
        category: body.category?.trim() || null,
        brand: body.brand?.trim() || null,
        price: body.price,
        currency_iso: body.currency_iso || "USD",
        stock_quantity: body.stock_quantity ?? 0,
        min_stock_alert: body.min_stock_alert ?? 0,
        is_active: body.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/products:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
