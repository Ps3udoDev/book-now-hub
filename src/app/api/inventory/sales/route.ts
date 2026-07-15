import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";
import { inventoryErrorResponse, requireInventoryAdmin } from "../_utils";

interface SaleLineInput {
  product_id: string;
  branch_id: string;
  quantity: number;
  unit_price: number;
  sold_at?: string | null;
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

    const body = (await request.json()) as { lines?: SaleLineInput[] };
    const lines = Array.isArray(body.lines) ? body.lines : [];
    if (lines.length === 0) {
      return NextResponse.json(
        { error: "No hay líneas de venta para registrar" },
        { status: 400 },
      );
    }

    const admin = supabaseAdmin as any;

    // Cargar los productos involucrados (moneda, tenant y sucursal reales).
    const productIds = [...new Set(lines.map((l) => l.product_id))];
    const { data: products, error: prodErr } = await admin
      .from("products")
      .select("id, tenant_id, branch_id, currency_iso")
      .in("id", productIds);
    if (prodErr) throw new Error(prodErr.message);

    const productMap = new Map<
      string,
      { id: string; tenant_id: string; branch_id: string; currency_iso: string }
    >();
    for (const p of products ?? []) productMap.set(p.id, p);

    // Todas las líneas deben pertenecer al mismo tenant. Los productos no
    // encontrados no abortan el lote: se registran como error por línea más
    // abajo, en el loop principal.
    const tenantIds = new Set<string>();
    for (const l of lines) {
      const p = productMap.get(l.product_id);
      if (!p) continue;
      tenantIds.add(p.tenant_id);
    }
    if (tenantIds.size === 0) {
      return NextResponse.json(
        { error: "Ningún producto válido" },
        { status: 400 },
      );
    }
    if (tenantIds.size !== 1) {
      return NextResponse.json(
        { error: "Las ventas deben pertenecer a un solo negocio" },
        { status: 400 },
      );
    }
    const tenantId = [...tenantIds][0];

    const access = await requireInventoryAdmin(tenantId, user.id);
    if (access instanceof NextResponse) return access;

    const registered: unknown[] = [];
    const errors: { product_id: string; error: string }[] = [];

    for (const line of lines) {
      const product = productMap.get(line.product_id);
      if (!product) {
        errors.push({
          product_id: line.product_id,
          error: "Producto no encontrado",
        });
        continue;
      }

      const quantity = Number(line.quantity);
      const unitPrice = Number(line.unit_price);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        errors.push({
          product_id: line.product_id,
          error: "Cantidad inválida",
        });
        continue;
      }
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        errors.push({ product_id: line.product_id, error: "Precio inválido" });
        continue;
      }

      // Parseo defensivo de la fecha: si viene malformada, se registra como
      // error de línea en vez de lanzar y abortar todo el lote.
      let soldAt: string;
      if (line.sold_at) {
        const parsed = Date.parse(line.sold_at);
        if (Number.isNaN(parsed)) {
          errors.push({ product_id: line.product_id, error: "Fecha inválida" });
          continue;
        }
        soldAt = new Date(parsed).toISOString();
      } else {
        soldAt = new Date().toISOString();
      }

      // 1) Movimiento de salida: descuenta stock vía trigger. Puede fallar por
      //    "Stock insuficiente" (trigger prevent_negative_inventory).
      const { data: movement, error: movErr } = await admin
        .from("inventory_movements")
        .insert({
          product_id: product.id,
          branch_id: product.branch_id,
          movement_type: "exit",
          quantity,
          reason: "Venta registrada",
          created_by: user.id,
          created_at: soldAt,
        })
        .select("id")
        .single();

      if (movErr) {
        errors.push({ product_id: line.product_id, error: movErr.message });
        continue;
      }

      // 2) Registro de la venta (snapshot de precio/moneda/total).
      const total = Math.round(quantity * unitPrice * 100) / 100;
      const { data: sale, error: saleErr } = await admin
        .from("product_sales")
        .insert({
          tenant_id: tenantId,
          product_id: product.id,
          branch_id: product.branch_id,
          quantity,
          unit_price: unitPrice,
          currency_iso: product.currency_iso,
          total,
          sold_at: soldAt,
          movement_id: movement.id,
          created_by: user.id,
        })
        .select("*")
        .single();

      if (saleErr) {
        // Rollback: borrar el movimiento restaura el stock (trigger AFTER DELETE).
        const { error: rollbackErr } = await admin
          .from("inventory_movements")
          .delete()
          .eq("id", movement.id);
        if (rollbackErr) {
          console.error("Rollback de movimiento falló:", rollbackErr.message);
        }
        errors.push({ product_id: line.product_id, error: saleErr.message });
        continue;
      }

      registered.push(sale);
    }

    const status = registered.length === 0 && errors.length > 0 ? 400 : 201;
    return NextResponse.json(
      { registered: registered.length, sales: registered, errors },
      { status },
    );
  } catch (error) {
    console.error("Error in POST /api/inventory/sales:", error);
    return inventoryErrorResponse(error);
  }
}
