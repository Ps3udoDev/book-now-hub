// src/components/orders/order-detail-sheet.tsx
"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, FileText, Loader2, User, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { type OrderWithItems, ordersService } from "@/lib/services/orders";
import { OrderItemsEditor } from "./order-items-editor";
import { OrderStatusBadge } from "./order-status-badge";
import { PayOrderDialog } from "./pay-order-dialog";

interface OrderDetailSheetProps {
  order: OrderWithItems | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderChanged: () => void;
  /** Modo caja: solo lectura + botón cobrar */
  cashierMode?: boolean;
}

export function OrderDetailSheet({
  order,
  open,
  onOpenChange,
  onOrderChanged,
  cashierMode = false,
}: OrderDetailSheetProps) {
  const [sendingOrder, setSendingOrder] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);

  if (!order) return null;

  const isDraft = order.status === "draft";
  const isSent = order.status === "sent";
  const customerName = order.customer
    ? `${order.customer.first_name} ${order.customer.last_name}`
    : "Sin cliente";

  async function handleSend() {
    if (!order) return;
    setSendingOrder(true);
    try {
      await ordersService.sendOrder(order.id);
      toast.success("Comanda enviada a caja");
      onOrderChanged();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al enviar comanda",
      );
    } finally {
      setSendingOrder(false);
    }
  }

  async function handleCancel() {
    if (!order || !cancelReason.trim()) return;
    setCancelling(true);
    try {
      await ordersService.cancelOrder(order.id, cancelReason);
      toast.success("Comanda cancelada");
      onOrderChanged();
      setCancelDialogOpen(false);
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al cancelar comanda",
      );
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4">
            <div className="flex items-center justify-between">
              <SheetTitle>Comanda</SheetTitle>
              <OrderStatusBadge status={order.status} />
            </div>
            <SheetDescription>
              {format(new Date(order.created_at), "dd MMM yyyy, HH:mm", {
                locale: es,
              })}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4">
            {/* Info del cliente y especialista */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="text-sm font-medium">{customerName}</p>
                  {order.customer?.phone && (
                    <p className="text-xs text-muted-foreground">
                      {order.customer.phone}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Especialista</p>
                  <p className="text-sm font-medium">
                    {order.specialist?.full_name || "Sin asignar"}
                  </p>
                </div>
              </div>
            </div>

            {/* Moneda */}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Moneda:</span>
              <span className="font-medium">{order.currency_code}</span>
            </div>

            {/* Notas de la comanda */}
            {order.notes && (
              <div className="flex items-start gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Notas</p>
                  <p>{order.notes}</p>
                </div>
              </div>
            )}

            {/* Motivo de cancelación */}
            {order.status === "cancelled" && order.cancel_reason && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm">
                <p className="font-medium text-destructive">
                  Motivo de cancelación
                </p>
                <p className="text-muted-foreground mt-0.5">
                  {order.cancel_reason}
                </p>
              </div>
            )}

            <Separator />

            {/* Ítems */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Ítems</h3>
              <OrderItemsEditor
                orderId={order.id}
                currencyCode={order.currency_code}
                items={order.items || []}
                onItemAdded={onOrderChanged}
                onItemRemoved={onOrderChanged}
                disabled={!isDraft || cashierMode}
              />
            </div>

            {/* Acciones */}
            {!cashierMode && isDraft && (
              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1"
                  onClick={handleSend}
                  disabled={sendingOrder || (order.items?.length ?? 0) === 0}
                >
                  {sendingOrder && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Enviar a caja
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="text-destructive"
                  onClick={() => setCancelDialogOpen(true)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {cashierMode && isSent && (
              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1"
                  onClick={() => setPayDialogOpen(true)}
                >
                  Proceder al cobro
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive"
                  onClick={() => setCancelDialogOpen(true)}
                >
                  Cancelar comanda
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialog de cobro */}
      <PayOrderDialog
        order={order}
        open={payDialogOpen}
        onOpenChange={setPayDialogOpen}
        onPaymentSuccess={() => {
          setPayDialogOpen(false);
          onOrderChanged();
          onOpenChange(false);
        }}
      />

      {/* Dialog de cancelación */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar comanda</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Indica el motivo de cancelación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="cancel-reason">Motivo</Label>
            <Textarea
              id="cancel-reason"
              placeholder="Ej: El cliente cambió de opinión"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleCancel}
              disabled={cancelling || !cancelReason.trim()}
            >
              {cancelling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar cancelación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
