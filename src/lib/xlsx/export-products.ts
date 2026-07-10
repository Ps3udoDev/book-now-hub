// src/lib/xlsx/export-products.ts
import * as XLSX from "xlsx";

export interface ExportProductRow {
  name: string;
  sku: string | null;
  category: string | null;
  brand: string | null;
  price: number;
  currency_iso: string;
  branch_name: string;
  stock_quantity: number;
  min_stock_alert: number;
  is_active: boolean;
  created_at?: string | null;
  description?: string | null;
  calculated_stock?: number;
  is_low_stock?: boolean;
  total_entries?: number;
  total_exits?: number;
}

// Genera y descarga el Excel de respaldo del inventario.
export function exportProductsToXlsx(
  rows: ExportProductRow[],
  fileName: string,
  includeStock: boolean,
): void {
  const data = rows.map((row) => ({
    Nombre: row.name,
    SKU: row.sku || "",
    Categoría: row.category || "",
    Marca: row.brand || "",
    Precio: row.price,
    Moneda: row.currency_iso,
    Sucursal: row.branch_name,
    Stock: row.stock_quantity,
    "Alerta mínima": row.min_stock_alert,
    Activo: row.is_active ? "Sí" : "No",
    Creado: row.created_at ? row.created_at.slice(0, 10) : "",
    Descripción: row.description || "",
    ...(includeStock
      ? {
          "Stock calculado": row.calculated_stock ?? row.stock_quantity,
          "Stock bajo": row.is_low_stock ? "Sí" : "No",
          "Total entradas": row.total_entries ?? 0,
          "Total salidas": row.total_exits ?? 0,
        }
      : {}),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = Object.keys(data[0] || { a: 1 }).map((key) => ({
    wch: Math.max(12, key.length + 4),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventario");
  XLSX.writeFile(wb, fileName);
}
