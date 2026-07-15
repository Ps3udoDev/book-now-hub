"use client";

import { Loader2, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import {
  type ProductApiItem,
  useProducts,
} from "@/hooks/supabase/use-products";
import { storageService } from "@/lib/services/storage";

interface SaleLine {
  key: string; // clave única de la línea (permite mismo producto varias veces)
  product: ProductApiItem;
  quantity: number;
  unitPrice: number;
  soldAt: string; // YYYY-MM-DD (vacío = hoy)
}

interface RegisterSalesDialogProps {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  tenantId: string;
  onSaved: () => void;
}

function stockOf(product: ProductApiItem): number {
  return product.stock_summary?.calculated_stock ?? product.stock_quantity;
}

function imageUrlOf(product: ProductApiItem): string | null {
  const img = product.primary_image;
  if (!img) return null;
  return storageService.getPublicUrl(
    img.thumbnail_path || img.storage_path,
    "product-images",
  );
}

export function RegisterSalesDialog({
  open,
  onOpenChange,
  tenantId,
  onSaved,
}: RegisterSalesDialogProps) {
  const { products, isLoading, error } = useProducts(tenantId, {
    pageSize: 1000,
    isActive: true,
  });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const activeProducts = useMemo(
    () => products.filter((p) => p.is_active),
    [products],
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of activeProducts) if (p.category) set.add(p.category);
    return [...set].sort();
  }, [activeProducts]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return activeProducts.filter((p) => {
      const matchesTerm =
        !term ||
        p.name.toLowerCase().includes(term) ||
        (p.sku ?? "").toLowerCase().includes(term);
      const matchesCat = category === "all" || p.category === category;
      return matchesTerm && matchesCat;
    });
  }, [activeProducts, search, category]);

  // Unidades ya agregadas en el carrito por producto (para leyenda y auto-cap).
  const usedByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of lines) {
      map.set(l.product.id, (map.get(l.product.id) ?? 0) + l.quantity);
    }
    return map;
  }, [lines]);

  const addLine = (product: ProductApiItem) => {
    const stock = stockOf(product);
    const alreadyUsed = usedByProduct.get(product.id) ?? 0;
    if (alreadyUsed >= stock) {
      toast.warning(
        `Sin stock disponible para agregar más de "${product.name}" (máx ${stock}).`,
      );
      return;
    }
    setLines((current) => [
      ...current,
      {
        key: `${product.id}-${Date.now()}-${current.length}`,
        product,
        quantity: 1,
        unitPrice: product.price,
        soldAt: "",
      },
    ]);
  };

  const removeLine = (key: string) => {
    setLines((current) => current.filter((l) => l.key !== key));
  };

  const updateLine = (key: string, patch: Partial<SaleLine>) => {
    setLines((current) =>
      current.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    );
  };

  // Auto-cap: la cantidad de una línea no puede hacer que el acumulado del
  // producto supere su stock. Devuelve la cantidad permitida.
  const capQuantity = (line: SaleLine, requested: number): number => {
    const stock = stockOf(line.product);
    const usedByOthers =
      (usedByProduct.get(line.product.id) ?? 0) - line.quantity;
    const maxForThisLine = Math.max(0, stock - usedByOthers);
    return Math.min(Math.max(1, requested), Math.max(1, maxForThisLine));
  };

  const totalAmount = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0),
    [lines],
  );

  const handleSubmit = async () => {
    if (lines.length === 0) {
      toast.error("Agrega al menos un producto");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/inventory/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          lines: lines.map((l) => ({
            product_id: l.product.id,
            branch_id: l.product.branch_id,
            quantity: l.quantity,
            unit_price: l.unitPrice,
            sold_at: l.soldAt ? `${l.soldAt}T12:00:00` : null,
          })),
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "No se pudieron registrar las ventas");
      }

      if (json.errors?.length) {
        toast.warning(
          `${json.registered} venta(s) registrada(s), ${json.errors.length} con error.`,
        );
      } else {
        toast.success(`${json.registered} venta(s) registrada(s)`);
      }
      setLines([]);
      setSearch("");
      setCategory("all");
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error registrando ventas",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-7xl overflow-y-auto sm:max-w-7xl">
        <DialogHeader>
          <DialogTitle>Registrar ventas</DialogTitle>
          <DialogDescription>
            Agrega los productos vendidos, su cantidad, precio y fecha. Se
            descuentan del stock y quedan en el historial de movimientos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Panel de selección */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar por nombre o SKU"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : error ? (
                <p className="py-8 text-center text-sm text-rose-600">
                  No se pudieron cargar los productos.
                </p>
              ) : filteredProducts.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Sin productos con esos filtros.
                </p>
              ) : (
                filteredProducts.map((product) => {
                  const url = imageUrlOf(product);
                  const stock = stockOf(product);
                  return (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 rounded-lg border p-2"
                    >
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded bg-muted">
                        {url ? (
                          // biome-ignore lint/performance/noImgElement: imagen de storage externa
                          <img
                            src={url}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Stock: {stock}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addLine(product)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Panel de líneas (carrito) */}
          <div className="space-y-2">
            <Label className="text-sm">
              Ventas a registrar ({lines.length})
            </Label>
            {lines.length === 0 ? (
              <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                Agrega productos desde la izquierda.
              </p>
            ) : (
              <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                {lines.map((line) => {
                  const stock = stockOf(line.product);
                  const remaining =
                    stock - (usedByProduct.get(line.product.id) ?? 0);
                  const atCap = remaining <= 0;
                  return (
                    <div
                      key={line.key}
                      className="space-y-2 rounded-lg border p-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                          {line.product.name}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => removeLine(line.key)}
                        >
                          <Trash2 className="h-4 w-4 text-rose-600" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">Cantidad</Label>
                          <Input
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={(e) =>
                              updateLine(line.key, {
                                quantity: capQuantity(
                                  line,
                                  Math.trunc(Number(e.target.value)),
                                ),
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">
                            Precio ({line.product.currency_iso})
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitPrice}
                            onChange={(e) =>
                              updateLine(line.key, {
                                unitPrice: Math.max(0, Number(e.target.value)),
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Fecha</Label>
                          <Input
                            type="date"
                            value={line.soldAt}
                            onChange={(e) =>
                              updateLine(line.key, { soldAt: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <p
                        className={
                          atCap
                            ? "text-xs font-medium text-rose-600"
                            : "text-xs text-muted-foreground"
                        }
                      >
                        {atCap
                          ? `Stock máximo alcanzado (${stock}). Ajusta el stock del producto para registrar más.`
                          : `Stock actual ${stock} → quedará ${remaining}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-muted-foreground">
            Total estimado: {totalAmount.toFixed(2)}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || lines.length === 0}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar ventas
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
