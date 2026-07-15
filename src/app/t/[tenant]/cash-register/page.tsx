// src/app/t/[tenant]/cash-register/page.tsx
"use client";

import { Bell, BellOff, History, Lock, RefreshCw, Wallet } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { OrderCard, OrderDetailSheet } from "@/components/orders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActiveBranches } from "@/hooks/supabase/use-branches";
import { useOrdersByBranch } from "@/hooks/supabase/use-orders";
import type { OrderWithItems } from "@/lib/services/orders";
import { useAuthStore } from "@/lib/stores/auth-store";
import { createBrowserSB } from "@/lib/supabase/client";

export default function CajaPage() {
  const { tenant } = useAuthStore();
  const basePath = `/t/${tenant?.slug ?? ""}`;
  const { branches, isLoading: loadingBranches } = useActiveBranches(
    tenant?.id ?? null,
  );
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(
    null,
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cuando cargan las sucursales, pre-seleccionar la primera
  useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  const {
    orders: sentOrders,
    isLoading: loadingSent,
    mutate: mutateSent,
  } = useOrdersByBranch(selectedBranchId || null, "sent");
  const {
    orders: paidOrders,
    isLoading: loadingPaid,
    mutate: mutatePaid,
  } = useOrdersByBranch(selectedBranchId || null, "paid");

  const handleNewOrder = useCallback(() => {
    mutateSent();
    // Notificación sonora (si el navegador lo permite)
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(
          "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFhISLkZKUl5ufoaSoqqussbO2ubzAwsXHyszP0dTV19nb3N7g4uTm5+np6uvs7e7v8PHy8/T19vf4+fr7/P3+",
        );
      }
      audioRef.current.play().catch(() => {});
    } catch {}
    toast("¡Nueva comanda recibida!", {
      description: "Hay una nueva comanda esperando en caja.",
      duration: 6000,
    });
  }, [mutateSent]);

  // Suscripción Realtime a nuevas comandas enviadas
  useEffect(() => {
    if (!selectedBranchId) return;

    const supabase = createBrowserSB();
    const channel = supabase
      .channel(`caja:orders:${selectedBranchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `branch_id=eq.${selectedBranchId}`,
        },
        (payload) => {
          const newRow = payload.new as { status?: string } | null;
          const oldRow = payload.old as { status?: string } | null;

          // Notificar solo cuando pasa a estado "sent"
          if (newRow?.status === "sent" && oldRow?.status !== "sent") {
            handleNewOrder();
          } else {
            // Refrescar para otros cambios (paid, cancelled)
            mutateSent();
            mutatePaid();
          }
        },
      )
      .subscribe((status) => {
        setRealtimeConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
      setRealtimeConnected(false);
    };
  }, [selectedBranchId, handleNewOrder, mutateSent, mutatePaid]);

  function handleViewDetail(order: OrderWithItems) {
    setSelectedOrder(order);
    setSheetOpen(true);
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Panel de caja</h1>
          <p className="text-sm text-muted-foreground">
            Comandas recibidas en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Indicador Realtime */}
          <div className="flex items-center gap-1.5 text-xs">
            {realtimeConnected ? (
              <>
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-600">En vivo</span>
                <Bell className="h-3.5 w-3.5 text-green-600" />
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                <span className="text-muted-foreground">Desconectado</span>
                <BellOff className="h-3.5 w-3.5 text-muted-foreground" />
              </>
            )}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              mutateSent();
              mutatePaid();
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Accesos de caja (antes en el sidebar) */}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`${basePath}/cash-register/open`}>
            <Wallet className="mr-2 h-4 w-4" />
            Apertura de caja
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`${basePath}/cash-register/close`}>
            <Lock className="mr-2 h-4 w-4" />
            Cierre de caja
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`${basePath}/cash-register/closures`}>
            <History className="mr-2 h-4 w-4" />
            Historial de cierres
          </Link>
        </Button>
      </div>

      {/* Selector de sucursal */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground shrink-0">
          Sucursal:
        </span>
        <Select
          value={selectedBranchId}
          onValueChange={setSelectedBranchId}
          disabled={loadingBranches}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Selecciona sucursal" />
          </SelectTrigger>
          <SelectContent>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs: pendientes / cobradas */}
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="gap-1.5">
            Pendientes
            {sentOrders.length > 0 && (
              <Badge className="h-4.5 min-w-4.5 px-1 text-xs">
                {sentOrders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="paid">Cobradas hoy</TabsTrigger>
        </TabsList>

        {/* Comandas enviadas (pendientes de cobro) */}
        <TabsContent value="pending" className="mt-4">
          {!selectedBranchId ? (
            <p className="text-center text-muted-foreground py-12">
              Selecciona una sucursal para ver las comandas
            </p>
          ) : loadingSent ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {["sk1", "sk2", "sk3"].map((k) => (
                <Skeleton key={k} className="h-48 rounded-lg" />
              ))}
            </div>
          ) : sentOrders.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">Sin comandas pendientes</p>
              <p className="text-sm mt-1">
                Las nuevas comandas aparecerán aquí automáticamente.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sentOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  cashierMode
                  onViewDetail={handleViewDetail}
                  onProceedToPayment={handleViewDetail}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Comandas ya cobradas */}
        <TabsContent value="paid" className="mt-4">
          {!selectedBranchId ? (
            <p className="text-center text-muted-foreground py-12">
              Selecciona una sucursal para ver las comandas
            </p>
          ) : loadingPaid ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {["sk1", "sk2"].map((k) => (
                <Skeleton key={k} className="h-44 rounded-lg" />
              ))}
            </div>
          ) : paidOrders.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              No hay cobros registrados hoy.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paidOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onViewDetail={handleViewDetail}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Sheet de detalle (modo caja) */}
      <OrderDetailSheet
        order={selectedOrder}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onOrderChanged={() => {
          mutateSent();
          mutatePaid();
          setSheetOpen(false);
        }}
        cashierMode
      />
    </div>
  );
}
