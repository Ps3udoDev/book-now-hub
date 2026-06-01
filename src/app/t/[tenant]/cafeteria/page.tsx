"use client";

import {
  Clock3,
  Coffee,
  Minus,
  PercentCircle,
  Plus,
  ReceiptText,
  ShoppingBag,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useActiveBranches } from "@/hooks/supabase/use-branches";
import { useCafeOrder, useCafeOrders } from "@/hooks/supabase/use-cafe-orders";
import { usePublicMenu } from "@/hooks/supabase/use-menu";
import type { Customer, Profile } from "@/types";
import type { MenuItemWithImages } from "@/lib/services/menu";
import { cafeOrdersService } from "@/lib/services/cafe-orders";
import { createBrowserSB } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/auth-store";
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

type CafeteriaMode = "client" | "specialist" | null;

export default function CafeteriaPage() {
  const { tenant, tenantUser, user } = useAuthStore();
  const { branches } = useActiveBranches(tenant?.id ?? null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [specialistProfile, setSpecialistProfile] = useState<Profile | null>(null);
  const [identityLoading, setIdentityLoading] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItemWithImages | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemNotes, setItemNotes] = useState("");
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [submitting, setSubmitting] = useState(false);
  const [latestOrderId, setLatestOrderId] = useState<string | null>(null);
  const [chargeToCommissions, setChargeToCommissions] = useState(true);

  useEffect(() => {
    if (!selectedBranchId && branches[0]?.id) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  useEffect(() => {
    async function resolveIdentity() {
      if (!tenant?.id || !user?.id) {
        setCustomer(null);
        setSpecialistProfile(null);
        setIdentityLoading(false);
        return;
      }

      setIdentityLoading(true);
      const supabase = createBrowserSB();
      const [customerRes, profileRes] = await Promise.all([
        supabase
          .from("customers")
          .select("*")
          .eq("tenant_id", tenant.id)
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("*")
          .eq("tenant_id", tenant.id)
          .eq("email", user.email || "")
          .eq("is_active", true)
          .maybeSingle(),
      ]);

      if (customerRes.error) {
        toast.error("No se pudo resolver el cliente vinculado");
      }
      if (profileRes.error) {
        toast.error("No se pudo resolver el perfil del especialista");
      }

      setCustomer(customerRes.data || null);
      setSpecialistProfile(profileRes.data?.is_specialist ? profileRes.data : null);
      setIdentityLoading(false);
    }

    void resolveIdentity();
  }, [tenant?.id, user?.email, user?.id]);

  const mode: CafeteriaMode = customer
    ? "client"
    : specialistProfile
      ? "specialist"
      : null;

  const { menu, isLoading: loadingMenu, mutate: mutateMenu } = usePublicMenu(
    tenant?.id ?? null,
    selectedBranchId,
  );

  useEffect(() => {
    if (!activeCategoryId && menu[0]?.id) {
      setActiveCategoryId(menu[0].id);
    }
  }, [activeCategoryId, menu]);

  const startOfDay = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
  }, []);

  const filters = useMemo(
    () => ({
      tenant_id: tenant?.id ?? undefined,
      client_id: mode === "client" ? (customer?.id ?? undefined) : undefined,
      specialist_id:
        mode === "specialist" ? (specialistProfile?.id ?? undefined) : undefined,
      order_type: mode === "specialist" ? ("specialist" as const) : undefined,
      from: startOfDay,
    }),
    [customer?.id, mode, specialistProfile?.id, startOfDay, tenant?.id],
  );

  const { orders, mutate: mutateOrders } = useCafeOrders(
    filters,
    Boolean(tenant?.id && (customer?.id || specialistProfile?.id)),
  );

  const currentTrackedOrderId =
    latestOrderId ||
    orders.find((order) => ["pending", "preparing", "ready"].includes(order.status))
      ?.id ||
    orders[0]?.id ||
    null;

  const { order: trackedOrder, mutate: mutateTrackedOrder } = useCafeOrder(
    currentTrackedOrderId,
  );

  useEffect(() => {
    const filterValue =
      mode === "client" && customer?.id
        ? `client_id=eq.${customer.id}`
        : mode === "specialist" && specialistProfile?.id
          ? `specialist_id=eq.${specialistProfile.id}`
          : null;

    if (!filterValue) return;

    const supabase = createBrowserSB();
    const channel = supabase
      .channel(
        `cafeteria-${mode}-${customer?.id || specialistProfile?.id || "unknown"}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cafe_orders",
          filter: filterValue,
        },
        () => {
          void mutateOrders();
          void mutateTrackedOrder();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    customer?.id,
    mode,
    mutateOrders,
    mutateTrackedOrder,
    specialistProfile?.id,
  ]);

  const activeCategory = useMemo(
    () =>
      menu.find((category) => category.id === activeCategoryId) ||
      menu[0] ||
      null,
    [activeCategoryId, menu],
  );

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

  function openItemDetail(item: MenuItemWithImages) {
    const existing = cart[item.id];
    setSelectedItem(item);
    setItemQuantity(existing?.quantity ?? 1);
    setItemNotes(existing?.notes ?? "");
    setDetailOpen(true);
  }

  function handleAddToCart() {
    if (!selectedItem) return;

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
    toast.success(`${selectedItem.name} agregado al pedido`);
  }

  async function submitOrder() {
    if (!tenant?.id || !selectedBranchId || cartItems.length === 0) return;

    const isClient = mode === "client" && customer?.id;
    const isSpecialist = mode === "specialist" && specialistProfile?.id;
    if (!isClient && !isSpecialist) return;

    setSubmitting(true);
    try {
      const created = await cafeOrdersService.create({
        tenant_id: tenant.id,
        branch_id: selectedBranchId,
        order_type: isSpecialist ? "specialist" : "client",
        client_id: isClient ? customer.id : null,
        specialist_id: isSpecialist ? specialistProfile.id : null,
        charge_to_commissions: isSpecialist ? chargeToCommissions : false,
        items: cartItems.map((entry) => ({
          menu_item_id: entry.item.id,
          description: entry.item.name,
          quantity: entry.quantity,
          unit_price: Number(entry.item.price),
          notes: entry.notes || null,
        })),
      });

      setCart({});
      setCartOpen(false);
      setLatestOrderId(created.id);
      toast.success(`Pedido enviado #${created.order_number}`);
      await Promise.all([mutateOrders(), mutateTrackedOrder()]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo enviar el pedido",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (identityLoading) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        Cargando perfil de cafetería...
      </div>
    );
  }

  if (!mode) {
    return (
      <div className="rounded-3xl border border-dashed bg-muted/20 p-10 text-center">
        <Coffee className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Sin acceso de cafetería</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Este usuario no está vinculado ni a un cliente ni a un especialista del
          tenant actual.
        </p>
      </div>
    );
  }

  const isSpecialistMode = mode === "specialist";
  const pageTitle = isSpecialistMode
    ? "Pide a cuenta de tu jornada"
    : "Pide sin salir de la app";
  const pageDescription = isSpecialistMode
    ? "Puedes hacer pedidos de cafetería y decidir si se descuentan de tus comisiones."
    : "Selecciona sucursal, arma tu pedido y sigue el estado en tiempo real.";

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(244,238,229,1)_45%,_rgba(238,229,215,1)_100%)] p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              {isSpecialistMode ? "Cafetería especialista" : "Cafetería"}
            </Badge>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{pageTitle}</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                {pageDescription}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={selectedBranchId ?? undefined}
              onValueChange={setSelectedBranchId}
            >
              <SelectTrigger className="w-[220px] bg-white/80">
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
            <Button variant="outline" onClick={() => mutateMenu()}>
              Actualizar menú
            </Button>
          </div>
        </div>
      </section>

      {trackedOrder ? (
        <section className="rounded-3xl border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Pedido actual
              </p>
              <h2 className="text-2xl font-semibold">#{trackedOrder.order_number}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {trackedOrder.items.length} item(s) · Total $
                {Number(trackedOrder.total).toFixed(2)}
              </p>
              {isSpecialistMode ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {trackedOrder.charge_to_commissions
                    ? "Configurado para descontar de comisiones"
                    : "Se cobrará por flujo normal de caja"}
                </p>
              ) : null}
            </div>
            <Badge
              variant="outline"
              className={getCafeOrderStatusClassName(trackedOrder.status)}
            >
              {getCafeOrderStatusLabel(trackedOrder.status)}
            </Badge>
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {menu.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveCategoryId(category.id)}
              className={`rounded-full border px-4 py-2 text-sm whitespace-nowrap transition ${
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
            <CardContent className="py-12 text-center text-muted-foreground">
              Cargando menú...
            </CardContent>
          </Card>
        ) : !activeCategory ? (
          <Card>
            <CardContent className="py-12 text-center">
              Sin categorías disponibles en esta sucursal.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeCategory.items.map((item) => {
              const imageUrl = getMenuItemImageUrl(item);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openItemDetail(item)}
                  className="overflow-hidden rounded-[1.6rem] border bg-card text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="aspect-[4/3] bg-muted">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
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
                      <span>Toca para ver detalle</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Mis pedidos de hoy</h2>
          <Button variant="outline" size="sm" onClick={() => mutateOrders()}>
            Actualizar
          </Button>
        </div>
        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Aún no has enviado pedidos hoy.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">Pedido #{order.order_number}</p>
                      <Badge
                        variant="outline"
                        className={getCafeOrderStatusClassName(order.status)}
                      >
                        {getCafeOrderStatusLabel(order.status)}
                      </Badge>
                      {isSpecialistMode && order.charge_to_commissions ? (
                        <Badge variant="secondary">A comisiones</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {order.items
                        .map((item) => `${item.quantity}x ${item.description}`)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="text-sm">
                    <p className="font-semibold">${Number(order.total).toFixed(2)}</p>
                    <p className="text-muted-foreground">
                      {new Date(order.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Button
        type="button"
        onClick={() => setCartOpen(true)}
        className="fixed bottom-6 right-6 z-40 rounded-full px-5 shadow-lg"
      >
        <ShoppingBag className="mr-2 h-4 w-4" />
        {cartCount} item(s) · ${cartTotal.toFixed(2)}
      </Button>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl">
          {selectedItem ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedItem.name}</DialogTitle>
                <DialogDescription>
                  {selectedItem.description || "Sin descripción adicional"}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-5 md:grid-cols-[1fr_0.9fr]">
                <div className="overflow-hidden rounded-2xl bg-muted">
                  {getMenuItemImageUrl(selectedItem) ? (
                    <img
                      src={getMenuItemImageUrl(selectedItem) || ""}
                      alt={selectedItem.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex min-h-[280px] items-center justify-center text-muted-foreground">
                      Sin foto
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border bg-muted/20 p-4">
                    <p className="text-sm text-muted-foreground">Precio</p>
                    <p className="text-2xl font-semibold">
                      ${Number(selectedItem.price).toFixed(2)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Preparación estimada: {selectedItem.preparation_time_minutes} min
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Cantidad</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setItemQuantity((current) => Math.max(1, current - 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        value={String(itemQuantity)}
                        onChange={(event) =>
                          setItemQuantity(Math.max(1, Number(event.target.value) || 1))
                        }
                        className="w-24 text-center"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setItemQuantity((current) => current + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="item-notes">Notas</Label>
                    <Textarea
                      id="item-notes"
                      value={itemNotes}
                      onChange={(event) => setItemNotes(event.target.value)}
                      placeholder='Ej: sin azúcar, extra hielo, "llevar a recepción"...'
                      rows={4}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDetailOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="button" onClick={handleAddToCart}>
                  Agregar al pedido
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5" />
              Tu pedido
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 flex h-full flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto">
              {cartItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed py-10 text-center text-muted-foreground">
                  El carrito está vacío.
                </div>
              ) : (
                <>
                  {cartItems.map((entry) => (
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
                            <p className="mt-2 text-xs text-amber-700">
                              Nota: {entry.notes}
                            </p>
                          ) : null}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            ${(Number(entry.item.price) * entry.quantity).toFixed(2)}
                          </p>
                          <button
                            type="button"
                            className="mt-2 text-xs text-muted-foreground underline"
                            onClick={() =>
                              setCart((current) => {
                                const next = { ...current };
                                delete next[entry.item.id];
                                return next;
                              })
                            }
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {isSpecialistMode ? (
                    <div className="rounded-2xl border bg-muted/20 p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="charge-to-commissions"
                          checked={chargeToCommissions}
                          onCheckedChange={(checked) =>
                            setChargeToCommissions(Boolean(checked))
                          }
                        />
                        <div>
                          <Label
                            htmlFor="charge-to-commissions"
                            className="flex cursor-pointer items-center gap-2"
                          >
                            <PercentCircle className="h-4 w-4" />
                            Cargar a mis comisiones
                          </Label>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Si lo activas, al entregar el pedido se registrará como
                            consumo descontable de tu liquidación.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <div className="mt-6 space-y-4 border-t pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="text-xl font-semibold">${cartTotal.toFixed(2)}</span>
              </div>
              <Button
                type="button"
                className="w-full"
                size="lg"
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
