// src/app/t/[tenant]/orders/page.tsx
"use client";

import { Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { OrderCard, OrderDetailSheet } from "@/components/orders";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyOrders } from "@/hooks/supabase/use-orders";
import type { OrderStatus, OrderWithItems } from "@/lib/services/orders";
import { ordersService } from "@/lib/services/orders";
import { useAuthStore } from "@/lib/stores/auth-store";

const STATUS_OPTIONS: { value: "all" | OrderStatus; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "draft", label: "Borrador" },
  { value: "sent", label: "En caja" },
  { value: "paid", label: "Cobradas" },
  { value: "cancelled", label: "Canceladas" },
];

export default function OrdersPage() {
  const { tenant: tenantSlug } = useParams<{ tenant: string }>();
  const { tenant, tenantUser } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(
    null,
  );
  const [sheetOpen, setSheetOpen] = useState(false);

  const { orders, isLoading, mutate } = useMyOrders(
    tenant?.id ?? null,
    tenantUser?.id ?? null,
  );

  const filtered =
    statusFilter === "all"
      ? orders
      : orders.filter((o) => o.status === statusFilter);

  function handleViewDetail(order: OrderWithItems) {
    setSelectedOrder(order);
    setSheetOpen(true);
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Mis comandas</h1>
          <p className="text-muted-foreground text-sm">
            Gestiona las comandas que has creado
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => mutate()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button asChild>
            <Link href={`/t/${tenantSlug}/orders/new`}>
              <Plus className="h-4 w-4 mr-1.5" />
              Nueva comanda
            </Link>
          </Button>
        </div>
      </div>

      {/* Filtro por estado */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground shrink-0">Filtrar:</span>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as "all" | OrderStatus)}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {["sk1", "sk2", "sk3", "sk4"].map((k) => (
            <Skeleton key={k} className="h-44 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">Sin comandas</p>
          <p className="text-sm mt-1">
            {statusFilter === "all"
              ? "Aún no has creado ninguna comanda."
              : `No hay comandas en estado "${ordersService.getStatusLabel(statusFilter as OrderStatus)}".`}
          </p>
          {statusFilter === "all" && (
            <Button className="mt-4" asChild>
              <Link href={`/t/${tenantSlug}/orders/new`}>
                <Plus className="h-4 w-4 mr-1.5" />
                Crear primera comanda
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onViewDetail={handleViewDetail}
            />
          ))}
        </div>
      )}

      {/* Sheet de detalle */}
      <OrderDetailSheet
        order={selectedOrder}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onOrderChanged={() => {
          mutate();
          setSheetOpen(false);
        }}
      />
    </div>
  );
}
