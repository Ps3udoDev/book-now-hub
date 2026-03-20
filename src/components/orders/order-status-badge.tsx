// src/components/orders/order-status-badge.tsx
import { Badge } from "@/components/ui/badge";
import { type OrderStatus, ordersService } from "@/lib/services/orders";

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

const statusVariant: Record<
  OrderStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "outline",
  sent: "default",
  paid: "secondary",
  cancelled: "destructive",
};

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  return (
    <Badge variant={statusVariant[status]}>
      {ordersService.getStatusLabel(status)}
    </Badge>
  );
}
