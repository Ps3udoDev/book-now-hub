// src/components/orders/order-card.tsx
"use client";

import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronRight, Clock, Package, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import type { OrderWithItems } from "@/lib/services/orders";
import { OrderStatusBadge } from "./order-status-badge";

interface OrderCardProps {
  order: OrderWithItems;
  onViewDetail?: (order: OrderWithItems) => void;
  onProceedToPayment?: (order: OrderWithItems) => void;
  /** Modo caja: muestra botón "Proceder al cobro" */
  cashierMode?: boolean;
}

export function OrderCard({
  order,
  onViewDetail,
  onProceedToPayment,
  cashierMode = false,
}: OrderCardProps) {
  const customerName = order.customer
    ? `${order.customer.first_name} ${order.customer.last_name}`
    : "Sin cliente";
  const specialistName = order.specialist?.full_name || "Sin especialista";
  const itemCount = order.items?.length ?? 0;
  const timeAgo = order.sent_at
    ? formatDistanceToNow(new Date(order.sent_at), {
        addSuffix: true,
        locale: es,
      })
    : formatDistanceToNow(new Date(order.created_at), {
        addSuffix: true,
        locale: es,
      });

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-sm">{customerName}</span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>{specialistName}</span>
          </div>
        </div>
        <OrderStatusBadge status={order.status} />
      </CardHeader>

      <CardContent className="py-2">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Package className="h-3.5 w-3.5" />
            <span>
              {itemCount} {itemCount === 1 ? "ítem" : "ítems"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{timeAgo}</span>
          </div>
        </div>

        {/* Resumen de ítems */}
        {order.items && order.items.length > 0 && (
          <ul className="mt-2 space-y-0.5">
            {order.items.slice(0, 3).map((item) => (
              <li key={item.id} className="flex justify-between text-xs">
                <span className="truncate text-foreground">
                  {item.quantity}× {item.description}
                </span>
                <span className="text-muted-foreground ml-2 shrink-0">
                  {order.currency_code} {item.subtotal.toFixed(2)}
                </span>
              </li>
            ))}
            {order.items.length > 3 && (
              <li className="text-xs text-muted-foreground">
                +{order.items.length - 3} más...
              </li>
            )}
          </ul>
        )}

        <div className="mt-2 flex items-center justify-between border-t pt-2">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="font-semibold text-sm">
            {order.currency_code} {order.total.toFixed(2)}
          </span>
        </div>
      </CardContent>

      <CardFooter className="pt-0 gap-2">
        {onViewDetail && (
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={() => onViewDetail(order)}
          >
            Ver detalle
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        )}
        {cashierMode && onProceedToPayment && order.status === "sent" && (
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onProceedToPayment(order)}
          >
            Proceder al cobro
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
