type ExportableMovement = {
  created_at?: string | null;
  movement_type: string;
  quantity: number;
  reason?: string | null;
  product?: {
    name?: string | null;
    sku?: string | null;
  } | null;
  branch?: {
    name?: string | null;
  } | null;
  specialist?: {
    full_name?: string | null;
  } | null;
};

function escapeCell(value: string | number | null | undefined) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function formatMovementType(value: string) {
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

export function exportInventoryMovementsToCSV(movements: ExportableMovement[]) {
  const headers = [
    "Fecha",
    "Producto",
    "SKU",
    "Sucursal",
    "Tipo",
    "Cantidad",
    "Especialista",
    "Motivo",
  ];

  const rows = movements.map((movement) => [
    movement.created_at
      ? new Date(movement.created_at).toLocaleString("es-EC")
      : "",
    movement.product?.name || "",
    movement.product?.sku || "",
    movement.branch?.name || "",
    formatMovementType(movement.movement_type),
    movement.quantity,
    movement.specialist?.full_name || "",
    movement.reason || "",
  ]);

  return "\uFEFF" + [headers, ...rows]
    .map((row) => row.map((cell) => escapeCell(cell)).join(","))
    .join("\n");
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
