import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";
import { requireTenantAccess } from "../_utils";

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
    const status = searchParams.get("status"); // all | active | inactive
    const dateFrom = searchParams.get("date_from"); // YYYY-MM-DD
    const dateTo = searchParams.get("date_to"); // YYYY-MM-DD
    const category = searchParams.get("category");
    const branchId = searchParams.get("branch_id");
    const includeStock = searchParams.get("include_stock") === "true";

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenant_id es requerido" },
        { status: 400 },
      );
    }

    const access = await requireTenantAccess(tenantId, user.id);
    if (access instanceof NextResponse) return access;

    // biome-ignore lint/suspicious/noExplicitAny: Supabase client sin tipos generados para vistas
    const admin = supabaseAdmin as any;

    let query = admin
      .from("products")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (status === "active") query = query.eq("is_active", true);
    if (status === "inactive") query = query.eq("is_active", false);
    if (category) query = query.eq("category", category);
    if (branchId) query = query.eq("branch_id", branchId);
    if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00`);
    if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59`);

    const { data: products, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Nombres de sucursal para el Excel.
    const { data: branches } = await admin
      .from("branches")
      .select("id, name")
      .eq("tenant_id", tenantId);
    const branchNames = new Map<string, string>(
      (branches || []).map((b: { id: string; name: string }) => [b.id, b.name]),
    );

    let stockByProduct = new Map<string, unknown>();
    const movementTotals = new Map<
      string,
      { entries: number; exits: number }
    >();

    if (includeStock && (products || []).length) {
      const productIds = (products || []).map((p: { id: string }) => p.id);

      const [{ data: stockRows }, { data: movements }] = await Promise.all([
        admin
          .from("v_product_stock_summary")
          .select("*")
          .in("product_id", productIds),
        admin
          .from("inventory_movements")
          .select("product_id, movement_type, quantity")
          .in("product_id", productIds),
      ]);

      stockByProduct = new Map(
        (stockRows || []).map((s: { product_id: string }) => [s.product_id, s]),
      );

      for (const movement of movements || []) {
        const key = movement.product_id as string;
        const current = movementTotals.get(key) || { entries: 0, exits: 0 };
        if (movement.movement_type === "entry") {
          current.entries += Number(movement.quantity) || 0;
        } else if (movement.movement_type === "exit") {
          current.exits += Number(movement.quantity) || 0;
        }
        movementTotals.set(key, current);
      }
    }

    const rows = (products || []).map((product: Record<string, unknown>) => {
      const stock = stockByProduct.get(product.id as string) as
        | { calculated_stock?: number; is_low_stock?: boolean }
        | undefined;
      const totals = movementTotals.get(product.id as string);

      return {
        ...product,
        branch_name: branchNames.get(product.branch_id as string) || "",
        ...(includeStock
          ? {
              calculated_stock:
                stock?.calculated_stock ?? product.stock_quantity,
              is_low_stock: stock?.is_low_stock ?? false,
              total_entries: totals?.entries ?? 0,
              total_exits: totals?.exits ?? 0,
            }
          : {}),
      };
    });

    return NextResponse.json({ products: rows });
  } catch (error) {
    console.error("Error in GET /api/products/export:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
