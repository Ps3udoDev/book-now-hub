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
      quantity: number;
      reason?: string | null;
      reference_id?: string | null;
    };

    if (!body.product_id || !body.branch_id || !body.quantity) {
      return NextResponse.json(
        { error: "Campos requeridos: product_id, branch_id, quantity" },
        { status: 400 },
      );
    }

    if (body.quantity <= 0) {
      return NextResponse.json(
        { error: "La cantidad debe ser mayor a cero" },
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

    const admin = supabaseAdmin as any;
    const { data, error } = await admin
      .from("inventory_movements")
      .insert({
        product_id: body.product_id,
        branch_id: body.branch_id,
        movement_type: "entry",
        quantity: body.quantity,
        reason: body.reason || "Entrada de mercancía",
        reference_id: body.reference_id || null,
        created_by: user.id,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ movement: data }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/inventory/entry:", error);
    return inventoryErrorResponse(error);
  }
}
