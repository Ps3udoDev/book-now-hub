import { type NextRequest, NextResponse } from "next/server";
import { createServerSB } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  getProductInventoryContext,
  inventoryErrorResponse,
  requireInventoryAdmin,
} from "../_utils";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSB();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = (await request.json()) as {
      product_id: string;
      branch_id: string;
      new_quantity: number;
      reason?: string | null;
      reference_id?: string | null;
    };

    if (!body.product_id || !body.branch_id || body.new_quantity === undefined) {
      return NextResponse.json(
        { error: "Campos requeridos: product_id, branch_id, new_quantity" },
        { status: 400 },
      );
    }

    if (body.new_quantity < 0) {
      return NextResponse.json(
        { error: "La nueva cantidad no puede ser negativa" },
        { status: 400 },
      );
    }

    const product = await getProductInventoryContext(body.product_id);
    if (!product) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 },
      );
    }

    const access = await requireInventoryAdmin(product.tenant_id, user.id);
    if (access instanceof NextResponse) return access;

    const adjustmentDelta = body.new_quantity - (product.stock_quantity || 0);

    if (adjustmentDelta === 0) {
      return NextResponse.json(
        { error: "La nueva cantidad es igual al stock actual" },
        { status: 400 },
      );
    }

    const admin = supabaseAdmin as any;
    const { data, error } = await admin
      .from("inventory_movements")
      .insert({
        product_id: body.product_id,
        branch_id: body.branch_id,
        movement_type: "adjustment",
        quantity: adjustmentDelta,
        reason: body.reason || `Ajuste manual a ${body.new_quantity}`,
        reference_id: body.reference_id || null,
        created_by: user.id,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(
      {
        movement: data,
        previous_quantity: product.stock_quantity || 0,
        new_quantity: body.new_quantity,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error in POST /api/inventory/adjustment:", error);
    return inventoryErrorResponse(error);
  }
}
