"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Loader2,
  PackagePlus,
  RefreshCw,
  SlidersHorizontal,
  Wrench,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useProducts } from "@/hooks/supabase/use-products";
import { useActiveSpecialists } from "@/hooks/supabase/use-specialists";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
  downloadCSV,
  exportInventoryMovementsToCSV,
} from "@/lib/utils/inventory-export";

type MovementItem = {
  id: string;
  movement_type: "entry" | "exit" | "adjustment" | "specialist_withdrawal";
  quantity: number;
  reason: string | null;
  created_at: string | null;
  product: {
    id: string;
    name: string;
    sku: string | null;
    tenant_id: string;
  } | null;
  branch: {
    id: string;
    name: string;
  } | null;
  specialist: {
    id: string;
    full_name: string;
  } | null;
};

function formatMovementType(value: MovementItem["movement_type"]) {
  switch (value) {
    case "entry":
      return "Entrada";
    case "exit":
      return "Salida";
    case "adjustment":
      return "Ajuste";
    case "specialist_withdrawal":
      return "Retiro especialista";
    default:
      return value;
  }
}

function getMovementVariant(value: MovementItem["movement_type"]) {
  switch (value) {
    case "entry":
      return "text-emerald-600";
    case "adjustment":
      return "text-amber-600";
    case "specialist_withdrawal":
    case "exit":
      return "text-rose-600";
    default:
      return "text-foreground";
  }
}

export default function InventoryMovementsPage() {
  const { tenant, tenantUser } = useAuthStore();
  const canManageInventory = ["owner", "admin", "manager"].includes(
    tenantUser?.role ?? "",
  );

  const { products, isLoading: productsLoading } = useProducts(tenant?.id || null);
  const { specialists, isLoading: specialistsLoading } = useActiveSpecialists(
    tenant?.id || null,
  );

  const activeProducts = useMemo(
    () => products.filter((product) => product.is_active),
    [products],
  );

  const [movements, setMovements] = useState<MovementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    movementType: "all",
    specialistId: "all",
    productId: "all",
    dateFrom: "",
    dateTo: "",
  });
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [submittingEntry, setSubmittingEntry] = useState(false);
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false);
  const [entryForm, setEntryForm] = useState({
    productId: "",
    quantity: "1",
    reason: "",
  });
  const [adjustmentForm, setAdjustmentForm] = useState({
    productId: "",
    newQuantity: "0",
    reason: "",
  });

  const loadMovements = async () => {
    if (!tenant?.id) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({ tenant_id: tenant.id });

      if (filters.movementType !== "all") params.set("movement_type", filters.movementType);
      if (filters.specialistId !== "all") params.set("specialist_id", filters.specialistId);
      if (filters.productId !== "all") params.set("product_id", filters.productId);
      if (filters.dateFrom) params.set("date_from", `${filters.dateFrom}T00:00:00`);
      if (filters.dateTo) params.set("date_to", `${filters.dateTo}T23:59:59`);

      const response = await fetch(`/api/inventory/movements?${params.toString()}`, {
        credentials: "include",
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "No se pudo cargar el historial");
      }

      setMovements(json.movements || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error cargando movimientos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovements();
  }, [tenant?.id, filters]);

  const totals = useMemo(
    () =>
      movements.reduce(
        (acc, movement) => {
          acc.total += 1;
          if (movement.movement_type === "entry") acc.entries += movement.quantity;
          if (movement.movement_type === "adjustment") acc.adjustments += 1;
          if (movement.movement_type === "specialist_withdrawal") {
            acc.withdrawals += movement.quantity;
          }
          return acc;
        },
        { total: 0, entries: 0, withdrawals: 0, adjustments: 0 },
      ),
    [movements],
  );

  const selectedEntryProduct = activeProducts.find(
    (product) => product.id === entryForm.productId,
  );
  const selectedAdjustmentProduct = activeProducts.find(
    (product) => product.id === adjustmentForm.productId,
  );

  const handleExport = () => {
    const csv = exportInventoryMovementsToCSV(movements);
    downloadCSV(csv, `inventario-movimientos-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleEntrySubmit = async () => {
    if (!selectedEntryProduct) {
      toast.error("Selecciona un producto");
      return;
    }

    const parsedQuantity = Number(entryForm.quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      toast.error("La cantidad debe ser mayor a cero");
      return;
    }

    setSubmittingEntry(true);
    try {
      const response = await fetch("/api/inventory/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          product_id: selectedEntryProduct.id,
          branch_id: selectedEntryProduct.branch_id,
          quantity: parsedQuantity,
          reason: entryForm.reason || "Entrada de mercancia",
        }),
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "No se pudo registrar la entrada");
      }

      toast.success("Entrada registrada");
      setEntryDialogOpen(false);
      setEntryForm({ productId: "", quantity: "1", reason: "" });
      loadMovements();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error registrando entrada");
    } finally {
      setSubmittingEntry(false);
    }
  };

  const handleAdjustmentSubmit = async () => {
    if (!selectedAdjustmentProduct) {
      toast.error("Selecciona un producto");
      return;
    }

    const newQuantity = Number(adjustmentForm.newQuantity);
    if (!Number.isFinite(newQuantity) || newQuantity < 0) {
      toast.error("La nueva cantidad debe ser cero o mayor");
      return;
    }

    setSubmittingAdjustment(true);
    try {
      const response = await fetch("/api/inventory/adjustment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          product_id: selectedAdjustmentProduct.id,
          branch_id: selectedAdjustmentProduct.branch_id,
          new_quantity: newQuantity,
          reason:
            adjustmentForm.reason || `Ajuste manual a ${newQuantity} unidades`,
        }),
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "No se pudo registrar el ajuste");
      }

      toast.success("Ajuste registrado");
      setAdjustmentDialogOpen(false);
      setAdjustmentForm({ productId: "", newQuantity: "0", reason: "" });
      loadMovements();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error registrando ajuste");
    } finally {
      setSubmittingAdjustment(false);
    }
  };

  if (!canManageInventory) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h1 className="text-xl font-semibold">Movimientos de inventario</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta seccion esta disponible para owner, admin y manager.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Movimientos de inventario</h1>
          <p className="text-sm text-muted-foreground">
            Historial de entradas, ajustes y retiros por especialista.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEntryDialogOpen(true)}>
            <PackagePlus className="mr-2 h-4 w-4" />
            Registrar entrada
          </Button>
          <Button variant="outline" onClick={() => setAdjustmentDialogOpen(true)}>
            <Wrench className="mr-2 h-4 w-4" />
            Ajuste de inventario
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={movements.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Movimientos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totals.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Entradas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-emerald-600">{totals.entries}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Retiros especialistas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-rose-600">{totals.withdrawals}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Ajustes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-amber-600">{totals.adjustments}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select
              value={filters.movementType}
              onValueChange={(value) =>
                setFilters((current) => ({ ...current, movementType: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="entry">Entrada</SelectItem>
                <SelectItem value="adjustment">Ajuste</SelectItem>
                <SelectItem value="specialist_withdrawal">
                  Retiro especialista
                </SelectItem>
                <SelectItem value="exit">Salida</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Especialista</Label>
            <Select
              value={filters.specialistId}
              onValueChange={(value) =>
                setFilters((current) => ({ ...current, specialistId: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {specialists.map((specialist) => (
                  <SelectItem key={specialist.id} value={specialist.id}>
                    {specialist.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Producto</Label>
            <Select
              value={filters.productId}
              onValueChange={(value) =>
                setFilters((current) => ({ ...current, productId: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {activeProducts.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Desde</Label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(event) =>
                setFilters((current) => ({ ...current, dateFrom: event.target.value }))
              }
            />
          </div>

          <div className="space-y-1">
            <Label>Hasta</Label>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(event) =>
                setFilters((current) => ({ ...current, dateTo: event.target.value }))
              }
            />
          </div>

          <div className="md:col-span-5">
            <Button
              variant="ghost"
              onClick={() =>
                setFilters({
                  movementType: "all",
                  specialistId: "all",
                  productId: "all",
                  dateFrom: "",
                  dateTo: "",
                })
              }
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Limpiar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {loading || productsLoading || specialistsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : movements.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              No hay movimientos con los filtros actuales.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Especialista</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {movement.created_at
                        ? new Date(movement.created_at).toLocaleString("es-EC")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{movement.product?.name || "Producto"}</div>
                      <div className="text-xs text-muted-foreground">
                        {movement.product?.sku || movement.branch?.name || "Sin referencia"}
                      </div>
                    </TableCell>
                    <TableCell className={getMovementVariant(movement.movement_type)}>
                      {formatMovementType(movement.movement_type)}
                    </TableCell>
                    <TableCell>{movement.quantity}</TableCell>
                    <TableCell>{movement.specialist?.full_name || "-"}</TableCell>
                    <TableCell className="max-w-[320px] whitespace-normal text-sm text-muted-foreground">
                      {movement.reason || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar entrada</DialogTitle>
            <DialogDescription>
              Selecciona el producto, la cantidad y el motivo de la entrada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Producto</Label>
              <Select
                value={entryForm.productId}
                onValueChange={(value) =>
                  setEntryForm((current) => ({ ...current, productId: value }))
                }
              >
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
                value={entryForm.quantity}
                onChange={(event) =>
                  setEntryForm((current) => ({ ...current, quantity: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Motivo</Label>
              <Textarea
                rows={3}
                placeholder="Compra, reposicion, ingreso por ajuste operativo..."
                value={entryForm.reason}
                onChange={(event) =>
                  setEntryForm((current) => ({ ...current, reason: event.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEntrySubmit} disabled={submittingEntry}>
              {submittingEntry && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar entrada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adjustmentDialogOpen} onOpenChange={setAdjustmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajuste de inventario</DialogTitle>
            <DialogDescription>
              Define la nueva cantidad total del producto y documenta el motivo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Producto</Label>
              <Select
                value={adjustmentForm.productId}
                onValueChange={(value) =>
                  setAdjustmentForm((current) => ({ ...current, productId: value }))
                }
              >
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
              <Label>Nueva cantidad</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={adjustmentForm.newQuantity}
                onChange={(event) =>
                  setAdjustmentForm((current) => ({
                    ...current,
                    newQuantity: event.target.value,
                  }))
                }
              />
              {selectedAdjustmentProduct && (
                <p className="text-xs text-muted-foreground">
                  Stock actual: {selectedAdjustmentProduct.stock_summary?.calculated_stock ??
                    selectedAdjustmentProduct.stock_quantity}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Motivo</Label>
              <Textarea
                rows={3}
                placeholder="Merma, conteo fisico, correccion de sistema..."
                value={adjustmentForm.reason}
                onChange={(event) =>
                  setAdjustmentForm((current) => ({ ...current, reason: event.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustmentDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdjustmentSubmit} disabled={submittingAdjustment}>
              {submittingAdjustment && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Guardar ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
