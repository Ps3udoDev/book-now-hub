"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  type ExportProductRow,
  exportProductsToXlsx,
} from "@/lib/xlsx/export-products";
import type { Branch } from "@/types";

interface ExportProductsDialogProps {
  tenantId: string;
  tenantSlug: string;
  categories: string[];
  branches: Branch[];
}

/**
 * Dialog de exportación del inventario a Excel con filtros
 * (respaldo completo o parcial).
 */
export function ExportProductsDialog({
  tenantId,
  tenantSlug,
  categories,
  branches,
}: ExportProductsDialogProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [category, setCategory] = useState("all");
  const [branchId, setBranchId] = useState("all");
  const [includeStock, setIncludeStock] = useState(true);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ tenant_id: tenantId, status });
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      if (category !== "all") params.set("category", category);
      if (branchId !== "all") params.set("branch_id", branchId);
      if (includeStock) params.set("include_stock", "true");

      const response = await fetch(
        `/api/products/export?${params.toString()}`,
        { credentials: "include" },
      );
      const json = await response.json();

      if (!response.ok) {
        toast.error(json.error || "No se pudo exportar el inventario");
        return;
      }

      const rows = (json.products || []) as ExportProductRow[];
      if (!rows.length) {
        toast.warning("No hay productos con esos filtros");
        return;
      }

      const today = new Date().toISOString().slice(0, 10);
      exportProductsToXlsx(
        rows,
        `inventario-${tenantSlug}-${today}.xlsx`,
        includeStock,
      );
      toast.success(`${rows.length} productos exportados`);
      setOpen(false);
    } catch {
      toast.error("Error inesperado al exportar");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar inventario</DialogTitle>
          <DialogDescription>
            Descarga un Excel con tus productos como respaldo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as typeof status)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Solo activos</SelectItem>
                <SelectItem value="inactive">Solo inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="export-date-from">Creado desde</Label>
              <Input
                id="export-date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="export-date-to">Creado hasta</Label>
              <Input
                id="export-date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Categoría</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Sucursal</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="export-include-stock"
              checked={includeStock}
              onCheckedChange={(checked) => setIncludeStock(checked === true)}
            />
            <Label htmlFor="export-include-stock" className="font-normal">
              Incluir stock calculado y resumen de movimientos
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={exporting}
          >
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Exportar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
