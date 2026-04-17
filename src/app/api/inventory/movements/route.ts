import { type NextRequest, NextResponse } from "next/server";
import { createServerSB } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getInventoryUserContext } from "../_utils";

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
    const productId = searchParams.get("product_id");
    const branchId = searchParams.get("branch_id");
    const movementType = searchParams.get("movement_type");
    const specialistId = searchParams.get("specialist_id");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenant_id es requerido" },
        { status: 400 },
      );
    }

    const userContext = await getInventoryUserContext(tenantId, user.id);
    if (!userContext) {
      return NextResponse.json(
        { error: "Sin permisos en este tenant" },
        { status: 403 },
      );
    }

    const { membership, profile } = userContext;
    const isAdmin = ["owner", "admin", "manager"].includes(membership.role);

    const admin = supabaseAdmin as any;
    let query = admin
      .from("inventory_movements")
      .select(
        "*, product:products(id, name, sku, tenant_id), branch:branches(id, name), specialist:profiles!inventory_movements_specialist_id_fkey(id, full_name)",
      )
      .order("created_at", { ascending: false });

    if (productId) query = query.eq("product_id", productId);
    if (branchId) query = query.eq("branch_id", branchId);
    if (movementType) query = query.eq("movement_type", movementType);
    if (specialistId) query = query.eq("specialist_id", specialistId);
    if (dateFrom) query = query.gte("created_at", dateFrom);
    if (dateTo) query = query.lte("created_at", dateTo);

    if (!isAdmin) {
      if (!profile?.is_specialist) {
        return NextResponse.json(
          { error: "Solo especialistas pueden ver sus retiros" },
          { status: 403 },
        );
      }

      query = query
        .eq("movement_type", "specialist_withdrawal")
        .eq("specialist_id", user.id);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const movements = (data || []).filter((movement: any) => {
      return movement.product?.tenant_id === tenantId;
    });

    return NextResponse.json({ movements });
  } catch (error) {
    console.error("Error in GET /api/inventory/movements:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
