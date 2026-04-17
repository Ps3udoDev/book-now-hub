import { type NextRequest, NextResponse } from "next/server";
import { createServerSB } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  getInventoryUserContext,
  getProductInventoryContext,
  inventoryErrorResponse,
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
      specialist_id: string;
      reference_id?: string | null;
    };

    if (!body.product_id || !body.branch_id || !body.quantity || !body.specialist_id) {
      return NextResponse.json(
        {
          error:
            "Campos requeridos: product_id, branch_id, quantity, specialist_id",
        },
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

    const userContext = await getInventoryUserContext(product.tenant_id, user.id);
    if (!userContext) {
      return NextResponse.json(
        { error: "No tienes permisos para gestionar inventario" },
        { status: 403 },
      );
    }

    const { membership, profile } = userContext;
    const isAdmin = ["owner", "admin", "manager"].includes(membership.role);

    if (!isAdmin) {
      if (!profile?.is_specialist || !profile.is_active) {
        return NextResponse.json(
          { error: "Solo especialistas activos pueden solicitar productos" },
          { status: 403 },
        );
      }

      if (body.specialist_id !== user.id) {
        return NextResponse.json(
          { error: "Solo puedes registrar retiros para tu propio usuario" },
          { status: 403 },
        );
      }

      if (profile.branch_id && body.branch_id !== profile.branch_id) {
        return NextResponse.json(
          { error: "No puedes retirar productos de otra sucursal" },
          { status: 403 },
        );
      }
    }

    const admin = supabaseAdmin as any;
    const { data, error } = await admin
      .from("inventory_movements")
      .insert({
        product_id: body.product_id,
        branch_id: body.branch_id,
        movement_type: "specialist_withdrawal",
        quantity: body.quantity,
        reason: body.reason || "Retiro por especialista",
        specialist_id: body.specialist_id,
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
    console.error("Error in POST /api/inventory/withdrawal:", error);
    return inventoryErrorResponse(error);
  }
}
