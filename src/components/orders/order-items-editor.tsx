// src/components/orders/order-items-editor.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useProducts } from "@/hooks/supabase/use-products";
import { useActiveServices } from "@/hooks/supabase/use-services";
import {
  type OrderItem,
  type OrderItemType,
  ordersService,
} from "@/lib/services/orders";

const itemSchema = z.object({
  type: z.enum(["service", "product", "cafeteria"]),
  description: z.string().min(1, "La descripción es requerida"),
  quantity: z.coerce.number().min(1, "Mínimo 1"),
  unit_price: z.coerce.number().min(0, "Precio no puede ser negativo"),
  notes: z.string().optional(),
  item_id: z.string().optional(),
  buyer_type: z.enum(["customer", "specialist"]).optional(),
});

type ItemForm = z.infer<typeof itemSchema>;

const itemTypeLabels: Record<OrderItemType, string> = {
  service: "Servicio",
  product: "Producto",
  cafeteria: "Cafetería",
};

interface OrderItemsEditorProps {
  orderId: string;
  currencyCode: string;
  items: OrderItem[];
  onItemAdded: () => void;
  onItemRemoved: () => void;
  disabled?: boolean;
  tenantId?: string;
}

export function OrderItemsEditor({
  orderId,
  currencyCode,
  items,
  onItemAdded,
  onItemRemoved,
  disabled = false,
  tenantId,
}: OrderItemsEditorProps) {
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { services, isLoading: loadingServices } = useActiveServices(
    tenantId ?? null,
  );
  const { products, isLoading: loadingProducts } = useProducts(
    tenantId ?? null,
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ItemForm>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      type: "service",
      quantity: 1,
      unit_price: 0,
      buyer_type: "customer",
    },
  });

  const selectedType = watch("type");

  // Limpiar descripción, precio y buyer_type al cambiar el tipo
  // biome-ignore lint/correctness/useExhaustiveDependencies: selectedType es la señal de cambio, no se usa en el cuerpo
  useEffect(() => {
    setValue("description", "");
    setValue("unit_price", 0);
    setValue("item_id", "");
    setValue("buyer_type", "customer");
  }, [selectedType, setValue]);

  const quantity = watch("quantity") || 0;
  const unitPrice = watch("unit_price") || 0;
  const subtotal = quantity * unitPrice;

  async function onSubmit(values: ItemForm) {
    setAdding(true);
    try {
      await ordersService.addItem(orderId, {
        type: values.type,
        item_id: values.item_id || null,
        description: values.description,
        quantity: values.quantity,
        unit_price: values.unit_price,
        currency_code: currencyCode,
        notes: values.notes || null,
        buyer_type:
          values.type === "product"
            ? values.buyer_type || "customer"
            : undefined,
      });
      toast.success("Ítem agregado");
      reset({
        type: "service",
        quantity: 1,
        unit_price: 0,
        buyer_type: "customer",
      });
      setShowForm(false);
      onItemAdded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al agregar ítem");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(itemId: string) {
    setRemovingId(itemId);
    try {
      await ordersService.removeItem(orderId, itemId);
      toast.success("Ítem eliminado");
      onItemRemoved();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al eliminar ítem",
      );
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {/* Lista de ítems */}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No hay ítems en la comanda
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-2 rounded-md border p-2 text-sm"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                    {itemTypeLabels[item.type]}
                  </span>
                  {item.buyer_type === "specialist" && (
                    <Badge
                      variant="destructive"
                      className="text-[10px] px-1 py-0"
                    >
                      Consumo especialista
                    </Badge>
                  )}
                  <span className="font-medium truncate">
                    {item.description}
                  </span>
                </div>
                {item.notes && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {item.notes}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.quantity} × {currencyCode} {item.unit_price.toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-semibold">
                  {currencyCode} {item.subtotal.toFixed(2)}
                </span>
                {!disabled && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => handleRemove(item.id)}
                    disabled={removingId === item.id}
                  >
                    {removingId === item.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Total */}
      {items.length > 0 && (
        <>
          <Separator />
          <div className="flex justify-between font-semibold text-sm">
            <span>Total</span>
            <span>
              {currencyCode}{" "}
              {items.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2)}
            </span>
          </div>
        </>
      )}

      {/* Formulario para agregar ítem */}
      {!disabled &&
        (showForm ? (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="border rounded-md p-3 space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              {/* Tipo */}
              <div className="col-span-2 space-y-1">
                <Label>Tipo</Label>
                <Select
                  defaultValue="service"
                  onValueChange={(v) => setValue("type", v as OrderItemType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.entries(itemTypeLabels) as [
                        OrderItemType,
                        string,
                      ][]
                    ).map(([val, label]) => (
                      <SelectItem key={val} value={val}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Descripción / Selección de servicio o producto */}
              <div className="col-span-2 space-y-1">
                <Label>
                  {selectedType === "service"
                    ? "Servicio"
                    : selectedType === "product"
                      ? "Producto"
                      : "Descripción"}
                </Label>
                {selectedType === "service" ? (
                  <Select
                    disabled={loadingServices}
                    onValueChange={(serviceId) => {
                      const svc = services.find((s) => s.id === serviceId);
                      if (svc) {
                        setValue("description", svc.name);
                        setValue("unit_price", svc.base_price);
                        setValue("item_id", svc.id);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          loadingServices
                            ? "Cargando servicios..."
                            : "Selecciona un servicio"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((svc) => (
                        <SelectItem key={svc.id} value={svc.id}>
                          {svc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : selectedType === "product" ? (
                  <Select
                    disabled={loadingProducts}
                    onValueChange={(productId) => {
                      const prod = products.find((p) => p.id === productId);
                      if (prod) {
                        setValue("description", prod.name);
                        setValue("unit_price", prod.price);
                        setValue("item_id", prod.id);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          loadingProducts
                            ? "Cargando productos..."
                            : "Selecciona un producto"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((prod) => (
                        <SelectItem key={prod.id} value={prod.id}>
                          {prod.name}{" "}
                          {prod.stock_summary?.calculated_stock != null && (
                            <span className="text-muted-foreground">
                              (Stock: {prod.stock_summary.calculated_stock})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    {...register("description")}
                    placeholder="Nombre del artículo"
                  />
                )}
                {errors.description && (
                  <p className="text-xs text-destructive">
                    {errors.description.message}
                  </p>
                )}
              </div>

              {/* Toggle compra del especialista (solo para productos) */}
              {selectedType === "product" && (
                <div className="col-span-2 flex items-center justify-between rounded-md border p-2">
                  <div>
                    <Label
                      className="text-xs cursor-pointer"
                      htmlFor="buyer-toggle"
                    >
                      Compra del especialista
                    </Label>
                    <p className="text-[10px] text-muted-foreground">
                      Se descontará de sus comisiones
                    </p>
                  </div>
                  <Switch
                    id="buyer-toggle"
                    checked={watch("buyer_type") === "specialist"}
                    onCheckedChange={(checked) =>
                      setValue(
                        "buyer_type",
                        checked ? "specialist" : "customer",
                      )
                    }
                  />
                </div>
              )}

              {/* Cantidad */}
              <div className="space-y-1">
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  {...register("quantity")}
                />
                {errors.quantity && (
                  <p className="text-xs text-destructive">
                    {errors.quantity.message}
                  </p>
                )}
              </div>

              {/* Precio unitario */}
              <div className="space-y-1">
                <Label>Precio ({currencyCode})</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  {...register("unit_price")}
                />
                {errors.unit_price && (
                  <p className="text-xs text-destructive">
                    {errors.unit_price.message}
                  </p>
                )}
              </div>

              {/* Notas */}
              <div className="col-span-2 space-y-1">
                <Label>Notas (opcional)</Label>
                <Input
                  {...register("notes")}
                  placeholder="Observaciones del ítem"
                />
              </div>

              {/* Subtotal preview */}
              <div className="col-span-2 flex justify-between text-sm font-medium">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>
                  {currencyCode} {subtotal.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={adding}
                className="flex-1"
              >
                {adding && (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                )}
                Agregar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowForm(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Agregar ítem
          </Button>
        ))}
    </div>
  );
}
