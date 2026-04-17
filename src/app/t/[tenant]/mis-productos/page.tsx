"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Package, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProducts } from "@/hooks/supabase/use-products";
import { useSpecialist } from "@/hooks/supabase/use-specialists";
import { storageService } from "@/lib/services/storage";
import { useAuthStore } from "@/lib/stores/auth-store";

type MovementItem = {
  id: string;
  quantity: number;
  reason: string | null;
  created_at: string | null;
  product: {
    id: string;
    name: string;
    sku: string | null;
  } | null;
};

export default function MyProductsPage() {
  const { tenant, user } = useAuthStore();
  const { specialist, isLoading: specialistLoading } = useSpecialist(user?.id || null);
  const { products, isLoading: productsLoading } = useProducts(
    tenant?.id || null,
    specialist?.branch_id || undefined,
  );

  const activeProducts = useMemo(
    () => products.filter((product) => product.is_active),
    [products],
  );

  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [purpose, setPurpose] = useState("Uso en servicio");
  const [submitting, setSubmitting] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [history, setHistory] = useState<MovementItem[]>([]);

  const selectedProduct = activeProducts.find((product) => product.id === selectedProductId);

  const loadHistory = async () => {
    if (!tenant?.id) return;

    setHistoryLoading(true);
    try {
      const response = await fetch(`/api/inventory/movements?tenant_id=${tenant.id}`, {
        credentials: "include",
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "No se pudo cargar tu historial");
      }

      setHistory(json.movements || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error cargando historial");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [tenant?.id]);

  const handleRequestProduct = async () => {
    if (!tenant?.id || !user?.id) {
      toast.error("No se pudo validar la sesion actual");
      return;
    }

    if (!selectedProduct) {
      toast.error("Selecciona un producto");
      return;
    }

    const parsedQuantity = Number(quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      toast.error("La cantidad debe ser mayor a cero");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/inventory/withdrawal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          product_id: selectedProduct.id,
          branch_id: selectedProduct.branch_id,
          quantity: parsedQuantity,
          reason: purpose,
          specialist_id: user.id,
        }),
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "No se pudo registrar el retiro");
      }

      toast.success("Producto solicitado");
      setWithdrawalDialogOpen(false);
      setSelectedProductId("");
      setQuantity("1");
      setPurpose("Uso en servicio");
      loadHistory();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error registrando retiro");
    } finally {
      setSubmitting(false);
    }
  };

  if (specialistLoading || productsLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!specialist) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h1 className="text-xl font-semibold">Mis productos</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta vista solo esta disponible para perfiles de especialista.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mis productos</h1>
          <p className="text-sm text-muted-foreground">
            Solicita insumos y revisa el historial de tus retiros.
          </p>
        </div>
        <Button onClick={() => setWithdrawalDialogOpen(true)}>
          <ShoppingBag className="mr-2 h-4 w-4" />
          Solicitar producto
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {activeProducts.map((product) => {
          const imageUrl = product.primary_image
            ? storageService.getPublicUrl(
                product.primary_image.thumbnail_path ||
                  product.primary_image.storage_path,
                "product-images",
              )
            : null;

          return (
            <Card key={product.id} className="overflow-hidden">
              <div className="aspect-[4/3] bg-muted/30">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Package className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{product.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {product.category || "Sin categoria"}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Precio referencia</span>
                  <span>
                    {product.currency_iso} {Number(product.price).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Disponibilidad</span>
                  <span>
                    {product.stock_summary?.calculated_stock ?? product.stock_quantity}
                  </span>
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    setSelectedProductId(product.id);
                    setWithdrawalDialogOpen(true);
                  }}
                >
                  Solicitar producto
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de mis retiros</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {historyLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : history.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              Aun no tienes retiros registrados.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {movement.created_at
                        ? new Date(movement.created_at).toLocaleString("es-EC")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{movement.product?.name || "Producto"}</div>
                      <div className="text-xs text-muted-foreground">
                        {movement.product?.sku || "Sin SKU"}
                      </div>
                    </TableCell>
                    <TableCell>{movement.quantity}</TableCell>
                    <TableCell>{movement.reason || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={withdrawalDialogOpen} onOpenChange={setWithdrawalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar producto</DialogTitle>
            <DialogDescription>
              El retiro quedara registrado como movimiento tipo specialist_withdrawal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Producto</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un producto" />
                </SelectTrigger>
                <SelectContent>
                  {activeProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Cantidad</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Motivo</Label>
              <Select value={purpose} onValueChange={setPurpose}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Uso en servicio">Uso en servicio</SelectItem>
                  <SelectItem value="Uso personal">Uso personal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawalDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRequestProduct} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar retiro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
