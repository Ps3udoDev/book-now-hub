// src/app/api/cafe/orders/[id]/status/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";
import type { CafeOrderStatus } from "@/types";

type Params = { params: Promise<{ id: string }> };

const CAFE_ORDER_WITH_RELATIONS = `
  *,
  items:cafe_order_items(*),
  client:customers!cafe_orders_client_id_fkey(id, first_name, last_name, full_name),
  specialist:profiles!cafe_orders_specialist_id_fkey(id, full_name, avatar_url),
  workstation:workstations(id, name, code, cafeteria_qr_slug)
` as const;

const ALLOWED_TRANSITIONS: Record<CafeOrderStatus, CafeOrderStatus[]> = {
  pending: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

/**
 * PATCH /api/cafe/orders/:id/status
 * Avanza el estado del pedido. Cuando llega a `delivered` dispara la
 * integracion con cobros/comisiones (tarea 2.5):
 *   - charge_to_commissions=true & specialist_id → crea specialist_consumption
 *   - resto → crea orders + order_items (type=cafeteria) en estado 'sent'
 *     para que la caja lo cobre por el flujo normal.
 * Body: { status: CafeOrderStatus }
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createServerSB();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const body = await request.json();
    const nextStatus = body.status as CafeOrderStatus;

    if (!nextStatus) {
      return NextResponse.json(
        { error: "status es requerido" },
        { status: 400 },
      );
    }

    const { data: order, error: fetchError } = await supabaseAdmin
      .from("cafe_orders")
      .select("*, items:cafe_order_items(*)")
      .eq("id", id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 },
      );
    }

    const allowed = ALLOWED_TRANSITIONS[order.status as CafeOrderStatus] || [];
    if (!allowed.includes(nextStatus)) {
      return NextResponse.json(
        {
          error: `Transicion invalida: ${order.status} -> ${nextStatus}`,
        },
        { status: 400 },
      );
    }

    const { data: tenantUser } = await supabaseAdmin
      .from("tenant_users")
      .select("role")
      .eq("auth_user_id", user.id)
      .eq("tenant_id", order.tenant_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!tenantUser) {
      return NextResponse.json(
        { error: "Sin permisos para cambiar estado" },
        { status: 403 },
      );
    }

    // Aplicar el cambio de estado (timestamps los setea un trigger)
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("cafe_orders")
      .update({ status: nextStatus })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // ============================================================
    // TAREA 2.5: al delivered, generar comanda/consumo de cobro
    // ============================================================
    if (nextStatus === "delivered") {
      try {
        const items = (
          order as unknown as {
            items: {
              id: string;
              description: string;
              quantity: number;
              unit_price: number;
              subtotal: number;
              menu_item_id: string | null;
              notes: string | null;
            }[];
          }
        ).items;

        const total = items.reduce((s, it) => s + Number(it.subtotal), 0);

        if (order.charge_to_commissions && order.specialist_id && total > 0) {
          // Cargar a comisiones del especialista
          const description =
            items.length === 1
              ? `Cafeteria: ${items[0].description}`
              : `Cafeteria (${items.length} items) — Pedido #${order.order_number}`;

          const { data: consumption, error: consError } = await supabaseAdmin
            .from("specialist_consumptions")
            .insert({
              tenant_id: order.tenant_id,
              specialist_id: order.specialist_id,
              description,
              quantity: 1,
              unit_cost: total,
              currency_code: order.currency_iso,
              deduct_from_commission: true,
              registered_by: user.id,
              date: new Date().toISOString().slice(0, 10),
              notes: `cafe_order:${id}`,
            })
            .select()
            .single();

          if (consError) {
            console.error(
              "Error creando specialist_consumption para cafe_order",
              id,
              consError,
            );
          } else {
            await supabaseAdmin
              .from("cafe_orders")
              .update({
                specialist_consumption_id: consumption.id,
                billed_at: new Date().toISOString(),
              })
              .eq("id", id);
          }
        } else if (total > 0) {
          // Crear comanda (orders) + order_items con type='cafeteria'
          // Para orders.specialist_id NOT NULL: si no hay specialist en el
          // cafe_order, usamos al usuario que marca delivered (cajero/barista)
          // siempre que tenga profile en el tenant.
          let billingSpecialistId: string | null = order.specialist_id;
          if (!billingSpecialistId) {
            const { data: ownProfile } = await supabaseAdmin
              .from("profiles")
              .select("id")
              .eq("tenant_id", order.tenant_id)
              .eq("email", user.email || "")
              .eq("is_active", true)
              .maybeSingle();
            billingSpecialistId = ownProfile?.id ?? null;
          }

          if (!billingSpecialistId) {
            // Sin specialist resoluble no podemos crear la comanda,
            // pero dejamos el cafe_order en delivered (el cajero puede
            // facturar manualmente).
            console.warn(
              "cafe_order delivered sin specialist disponible; omitiendo creacion de orders",
              id,
            );
          } else {
            const { data: newOrder, error: orderError } = await supabaseAdmin
              .from("orders")
              .insert({
                tenant_id: order.tenant_id,
                branch_id: order.branch_id,
                specialist_id: billingSpecialistId,
                customer_id: order.client_id || null,
                currency_code: order.currency_iso,
                status: "sent",
                notes: order.notes
                  ? `[Cafeteria #${order.order_number}] ${order.notes}`
                  : `Cafeteria #${order.order_number}`,
              })
              .select()
              .single();

            if (orderError || !newOrder) {
              console.error(
                "Error creando orders para cafe_order",
                id,
                orderError,
              );
            } else {
              const orderItems = items.map((it) => ({
                order_id: newOrder.id,
                type: "cafeteria" as const,
                item_id: it.menu_item_id,
                description: it.description,
                quantity: it.quantity,
                unit_price: it.unit_price,
                currency_code: order.currency_iso,
                notes: it.notes,
                buyer_type: order.client_id ? "customer" : "customer",
              }));

              const { error: itemsErr } = await supabaseAdmin
                .from("order_items")
                .insert(orderItems);

              if (itemsErr) {
                await supabaseAdmin
                  .from("orders")
                  .delete()
                  .eq("id", newOrder.id);
                console.error(
                  "Error insertando order_items cafeteria",
                  id,
                  itemsErr,
                );
              } else {
                await supabaseAdmin
                  .from("cafe_orders")
                  .update({
                    order_id: newOrder.id,
                    billed_at: new Date().toISOString(),
                  })
                  .eq("id", id);
              }
            }
          }
        }
      } catch (integrationErr) {
        // La integracion de cobro no debe bloquear el cambio de estado;
        // se loguea y sigue.
        console.error(
          "Error en integracion delivered->cobro para cafe_order",
          id,
          integrationErr,
        );
      }
    }

    // Regresar pedido con relaciones actualizadas
    const { data: complete } = await supabaseAdmin
      .from("cafe_orders")
      .select(CAFE_ORDER_WITH_RELATIONS)
      .eq("id", id)
      .single();

    return NextResponse.json({ order: complete || updated });
  } catch (err) {
    console.error("Error in PATCH /api/cafe/orders/[id]/status:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
