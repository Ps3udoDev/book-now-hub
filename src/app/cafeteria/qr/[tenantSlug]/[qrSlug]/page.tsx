"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, Loader2, Minus, Plus, QrCode, ReceiptText, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  usePublicCafeOrderTracking,
  usePublicCafeteriaQrContext,
} from "@/hooks/supabase/use-cafeteria-qr";
import { usePublicMenu } from "@/hooks/supabase/use-menu";
import type { MenuItemWithImages } from "@/lib/services/menu";
import type { CafeOrderStatus } from "@/types";
import {
  getCafeOrderStatusClassName,
  getCafeOrderStatusLabel,
  getMenuItemImageUrl,
} from "@/lib/utils/cafeteria";

type CartItem = {
  item: MenuItemWithImages;
  quantity: number;
  notes: string;
};

export default function PublicCafeteriaQrPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;
  const qrSlug = params.qrSlug as string;
  const { context, isLoading, error } = usePublicCafeteriaQrContext(
    tenantSlug,
    qrSlug,
  );
  const { menu, isLoading: loadingMenu } = usePublicMenu(
    context?.tenant_id ?? null,
    context?.branch_id ?? null,
  );

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItemWithImages | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemNotes, setItemNotes] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [latestOrderId, setLatestOrderId] = useState<string | null>(null);

  const { order: trackedOrder } = usePublicCafeOrderTracking(latestOrderId);

  const activeCategory = useMemo(() => {
    if (!menu.length) {
      return null;
    }

    return menu.find((category) => category.id === activeCategoryId) || menu[0];
  }, [activeCategoryId, menu]);

  useEffect(() => {
    if (!activeCategoryId && menu[0]?.id) {
      setActiveCategoryId(menu[0].id);
    }
  }, [activeCategoryId, menu]);

  const cartItems = useMemo(() => Object.values(cart), [cart]);
  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  );
  const cartTotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, entry) => sum + Number(entry.item.price) * entry.quantity,
        0,
      ),
    [cartItems],
  );

  function openItem(item: MenuItemWithImages) {
    const existing = cart[item.id];
    setSelectedItem(item);
    setItemQuantity(existing?.quantity ?? 1);
    setItemNotes(existing?.notes ?? "");
    setDetailOpen(true);
  }

  function addToCart() {
    if (!selectedItem) {
      return;
    }

    setCart((current) => ({
      ...current,
      [selectedItem.id]: {
        item: selectedItem,
        quantity: itemQuantity,
        notes: itemNotes.trim(),
      },
    }));
    setDetailOpen(false);
    setCartOpen(true);
  }

  async function submitOrder() {
    if (!context || !fullName.trim() || !email.trim() || cartItems.length === 0) {
      toast.error("Completa nombre, email y al menos un item");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/cafeteria/qr/${tenantSlug}/${qrSlug}/orders`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: fullName,
            email,
            notes: orderNotes,
            items: cartItems.map((entry) => ({
              menu_item_id: entry.item.id,
              quantity: entry.quantity,
              notes: entry.notes || null,
            })),
          }),
        },
      );

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo enviar el pedido");
      }

      setLatestOrderId(json.order.id);
      setCart({});
      setCartOpen(false);
      toast.success(`Pedido enviado #${json.order.order_number}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo enviar el pedido");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !context) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-lg">
          <CardContent className="space-y-3 p-8 text-center">
            <QrCode className="mx-auto h-10 w-10 text-muted-foreground" />
            <h1 className="text-2xl font-semibold">QR no disponible</h1>
            <p className="text-sm text-muted-foreground">
              {error || "No se pudo resolver la estación de cafetería."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f6f0e7_0%,#fffdf9_40%,#ffffff_100%)]">
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 md:px-6 md:py-10">
        <section className="rounded-[2rem] border bg-white/85 p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <Badge variant="secondary">Cafetería</Badge>
              <h1 className="text-3xl font-semibold tracking-tight">
                {context.tenant_name}
              </h1>
              <p className="text-sm text-muted-foreground">
                Estación {context.workstation_name} · {context.branch_name}
                {context.specialist_name ? ` · Especialista ${context.specialist_name}` : ""}
              </p>
            </div>
            <Button onClick={() => setCartOpen(true)}>
              <ShoppingBag className="mr-2 h-4 w-4" />
              {cartCount} item(s) · ${cartTotal.toFixed(2)}
            </Button>
          </div>
        </section>

        {trackedOrder ? (
          <section className="rounded-[2rem] border bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Pedido actual
                </p>
                <h2 className="text-3xl font-semibold">#{trackedOrder.order_number}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {trackedOrder.items.map((item) => `${item.quantity}x ${item.description}`).join(" · ")}
                </p>
                {trackedOrder.estimated_ready_at ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Estimado:{" "}
                    {new Date(trackedOrder.estimated_ready_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                ) : null}
              </div>
              <Badge
                variant="outline"
                className={getCafeOrderStatusClassName(
                  trackedOrder.status as CafeOrderStatus,
                )}
              >
                {getCafeOrderStatusLabel(trackedOrder.status as CafeOrderStatus)}
              </Badge>
            </div>
          </section>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {menu.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategoryId(category.id)}
                  className={`rounded-full border px-4 py-2 text-sm whitespace-nowrap ${
                    activeCategory?.id === category.id
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            {loadingMenu ? (
              <Card>
                <CardContent className="py-16 text-center text-muted-foreground">
                  Cargando menú...
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {(activeCategory?.items || []).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openItem(item)}
                    className="overflow-hidden rounded-[1.6rem] border bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="aspect-[4/3] bg-muted">
                      {getMenuItemImageUrl(item) ? (
                        <img
                          src={getMenuItemImageUrl(item) || ""}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          Sin foto
                        </div>
                      )}
                    </div>
                    <div className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">{item.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {item.description || "Sin descripción"}
                          </p>
                        </div>
                        <Badge variant="secondary">${Number(item.price).toFixed(2)}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3.5 w-3.5" />
                          {item.preparation_time_minutes} min
                        </span>
                        <span>Tocar para agregar</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Card className="h-fit">
            <CardContent className="space-y-4 p-5">
              <div>
                <h2 className="text-lg font-semibold">Tus datos</h2>
                <p className="text-sm text-muted-foreground">
                  Si ya existes en el tenant, te vincularemos por email.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="full-name">Nombre</Label>
                <Input
                  id="full-name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Tu nombre"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="tu@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="order-notes">Notas del pedido</Label>
                <Textarea
                  id="order-notes"
                  value={orderNotes}
                  onChange={(event) => setOrderNotes(event.target.value)}
                  placeholder='Ej: "lo retiro al terminar mi turno"'
                  rows={4}
                />
              </div>
              <Button className="w-full" onClick={() => setCartOpen(true)}>
                <ReceiptText className="mr-2 h-4 w-4" />
                Revisar carrito
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-xl">
          {selectedItem ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedItem.name}</DialogTitle>
                <DialogDescription>
                  {selectedItem.description || "Sin descripción adicional"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="overflow-hidden rounded-2xl bg-muted">
                  {getMenuItemImageUrl(selectedItem) ? (
                    <img
                      src={getMenuItemImageUrl(selectedItem) || ""}
                      alt={selectedItem.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex min-h-[260px] items-center justify-center text-muted-foreground">
                      Sin foto
                    </div>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-[160px_1fr]">
                  <div className="rounded-2xl border bg-muted/20 p-4">
                    <p className="text-sm text-muted-foreground">Precio</p>
                    <p className="text-2xl font-semibold">
                      ${Number(selectedItem.price).toFixed(2)}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <Label>Cantidad</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setItemQuantity((value) => Math.max(1, value - 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        className="w-24 text-center"
                        value={String(itemQuantity)}
                        onChange={(event) =>
                          setItemQuantity(Math.max(1, Number(event.target.value) || 1))
                        }
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setItemQuantity((value) => value + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="item-notes">Notas</Label>
                      <Textarea
                        id="item-notes"
                        value={itemNotes}
                        onChange={(event) => setItemNotes(event.target.value)}
                        rows={3}
                        placeholder='Ej: "sin azúcar", "extra hielo"'
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={addToCart}>Agregar</Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Tu pedido</SheetTitle>
          </SheetHeader>
          <div className="mt-6 flex h-full flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto">
              {cartItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed py-12 text-center text-muted-foreground">
                  El carrito está vacío.
                </div>
              ) : (
                cartItems.map((entry) => (
                  <div key={entry.item.id} className="rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {entry.quantity}x {entry.item.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          ${Number(entry.item.price).toFixed(2)} c/u
                        </p>
                        {entry.notes ? (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Nota: {entry.notes}
                          </p>
                        ) : null}
                      </div>
                      <p className="font-semibold">
                        ${(Number(entry.item.price) * entry.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-6 space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="text-xl font-semibold">${cartTotal.toFixed(2)}</span>
              </div>
              <Button
                className="w-full"
                disabled={submitting || cartItems.length === 0}
                onClick={submitOrder}
              >
                {submitting ? "Enviando..." : "Enviar pedido"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
