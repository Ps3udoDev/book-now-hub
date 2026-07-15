"use client";

import {
  ChefHat,
  Clock3,
  RefreshCw,
  TimerReset,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActiveBranches } from "@/hooks/supabase/use-branches";
import { useCafeOrdersBoard } from "@/hooks/supabase/use-cafe-orders";
import { useFullMenu } from "@/hooks/supabase/use-menu";
import type { CafeOrderStatus } from "@/types";
import { createBrowserSB } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
  getCafeOrderNextStatus,
  getCafeOrderStatusClassName,
  getCafeOrderStatusLabel,
} from "@/lib/utils/cafeteria";

const BOARD_COLUMNS: Array<{
  status: Extract<CafeOrderStatus, "pending" | "preparing" | "ready">;
  title: string;
}> = [
  { status: "pending", title: "Pendiente" },
  { status: "preparing", title: "Preparando" },
  { status: "ready", title: "Listo" },
];

function playNewOrderBeep() {
  if (typeof window === "undefined") return;
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;

  if (!AudioContextClass) return;

  const ctx = new AudioContextClass();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(880, ctx.currentTime);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.36);
}

export default function CafeteriaKitchenBoardPage() {
  const { tenant, tenantUser } = useAuthStore();
  const { branches } = useActiveBranches(tenant?.id ?? null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [highlightedOrderIds, setHighlightedOrderIds] = useState<string[]>([]);
  const seenOrdersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!selectedBranchId && branches[0]?.id) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  const { orders, isLoading, mutate } = useCafeOrdersBoard(selectedBranchId);
  const { items: menuItems } = useFullMenu(tenant?.id ?? null, selectedBranchId);

  const canOperateKitchen = ["owner", "admin", "manager", "employee"].includes(
    tenantUser?.role ?? "",
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000 * 15);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    seenOrdersRef.current = new Set(orders.map((order) => order.id));
  }, [selectedBranchId]);

  useEffect(() => {
    if (!selectedBranchId) return;

    const supabase = createBrowserSB();
    const channel = supabase
      .channel(`cafeteria-board-${selectedBranchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cafe_orders",
          filter: `branch_id=eq.${selectedBranchId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newId = String(payload.new.id);
            if (!seenOrdersRef.current.has(newId)) {
              seenOrdersRef.current.add(newId);
              setHighlightedOrderIds((current) =>
                Array.from(new Set([newId, ...current])).slice(0, 6),
              );
              playNewOrderBeep();
              toast.success(`Nuevo pedido #${payload.new.order_number}`);
              window.setTimeout(() => {
                setHighlightedOrderIds((current) =>
                  current.filter((item) => item !== newId),
                );
              }, 7000);
            }
          }
          void mutate();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [mutate, selectedBranchId]);

  const preparationTimeByItemId = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of menuItems) {
      map.set(item.id, item.preparation_time_minutes || 0);
    }
    return map;
  }, [menuItems]);

  const board = useMemo(() => {
    return BOARD_COLUMNS.map((column) => ({
      ...column,
      orders: orders.filter((order) => order.status === column.status),
    }));
  }, [orders]);

  async function advanceOrder(orderId: string, currentStatus: CafeOrderStatus) {
    const nextStatus = getCafeOrderNextStatus(currentStatus);
    if (!nextStatus) return;

    setUpdatingOrderId(orderId);
    try {
      const response = await fetch(`/api/cafe/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "No se pudo actualizar el pedido");
      }
      toast.success(`Pedido movido a ${getCafeOrderStatusLabel(nextStatus)}`);
      await mutate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo avanzar el pedido",
      );
    } finally {
      setUpdatingOrderId(null);
    }
  }

  if (!canOperateKitchen) {
    return (
      <div className="rounded-2xl border border-dashed bg-muted/20 p-10 text-center">
        <ChefHat className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Tablero de cocina restringido</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Solo el personal operativo del tenant puede usar esta vista.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cocina y barra</h1>
          <p className="text-muted-foreground">
            Kanban en tiempo real para pedidos activos de cafetería.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={selectedBranchId ?? undefined}
            onValueChange={setSelectedBranchId}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Selecciona sucursal" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => mutate()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Badge variant="secondary" className="gap-2 px-3 py-2">
            <Volume2 className="h-3.5 w-3.5" />
            Alerta sonora activa
          </Badge>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Cargando pedidos del día...
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          {board.map((column) => (
            <Card key={column.status} className="min-h-[520px]">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{column.title}</span>
                  <Badge variant="secondary">{column.orders.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                {column.orders.length === 0 ? (
                  <div className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
                    Sin pedidos en {column.title.toLowerCase()}
                  </div>
                ) : (
                  column.orders.map((order) => {
                    const elapsedMinutes = Math.max(
                      0,
                      Math.floor((now - new Date(order.created_at).getTime()) / 60000),
                    );
                    const estimatedMinutes = Math.max(
                      5,
                      order.items.reduce((max, item) => {
                        if (!item.menu_item_id) return Math.max(max, 5);
                        return Math.max(
                          max,
                          preparationTimeByItemId.get(item.menu_item_id) || 5,
                        );
                      }, 0),
                    );
                    const isDelayed = elapsedMinutes > estimatedMinutes;
                    const nextStatus = getCafeOrderNextStatus(order.status);
                    const isHighlighted = highlightedOrderIds.includes(order.id);

                    return (
                      <article
                        key={order.id}
                        className={`rounded-2xl border bg-card p-4 shadow-sm transition ${
                          isHighlighted ? "ring-2 ring-emerald-300 shadow-lg" : ""
                        } ${isDelayed ? "border-rose-200" : "border-border"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              Pedido #{order.order_number}
                            </p>
                            <h3 className="text-lg font-semibold">
                              {order.order_type === "client"
                                ? order.client?.full_name || "Cliente"
                                : order.order_type === "specialist"
                                  ? order.specialist?.full_name || "Especialista"
                                  : "Walk-in"}
                            </h3>
                          </div>
                          <Badge
                            variant="outline"
                            className={getCafeOrderStatusClassName(order.status)}
                          >
                            {getCafeOrderStatusLabel(order.status)}
                          </Badge>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full border px-2 py-1">
                            {order.order_type === "client"
                              ? "Cliente"
                              : order.order_type === "specialist"
                                ? "Especialista"
                                : "Walk-in"}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-1 ${
                              isDelayed
                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {elapsedMinutes} min / est. {estimatedMinutes} min
                          </span>
                        </div>

                        <div className="mt-4 space-y-2">
                          {order.items.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-xl bg-muted/30 px-3 py-2"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <p className="font-medium">
                                  {item.quantity}x {item.description}
                                </p>
                                <span className="text-xs text-muted-foreground">
                                  ${(Number(item.subtotal) || 0).toFixed(2)}
                                </span>
                              </div>
                              {item.notes ? (
                                <p className="mt-1 text-xs text-amber-700">
                                  Nota: {item.notes}
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>

                        {order.notes ? (
                          <div className="mt-4 rounded-xl border border-dashed px-3 py-2 text-sm text-muted-foreground">
                            {order.notes}
                          </div>
                        ) : null}

                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {isDelayed ? (
                              <TimerReset className="h-4 w-4 text-rose-500" />
                            ) : (
                              <Clock3 className="h-4 w-4" />
                            )}
                            {isDelayed
                              ? "Superó tiempo estimado"
                              : "Dentro del tiempo esperado"}
                          </div>
                          {nextStatus ? (
                            <Button
                              size="sm"
                              onClick={() => advanceOrder(order.id, order.status)}
                              disabled={updatingOrderId === order.id}
                            >
                              {updatingOrderId === order.id ? "Moviendo..." : `Pasar a ${getCafeOrderStatusLabel(nextStatus)}`}
                            </Button>
                          ) : null}
                        </div>
                      </article>
                    );
                  })
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
