// src/components/orders/receipt-dialog.tsx
"use client";

import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { OrderWithItems } from "@/lib/services/orders";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  mobile_payment: "Pago móvil",
  stripe: "Stripe",
  mercadopago: "Mercado Pago",
};

interface ReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderWithItems;
  invoiceNumber: string;
  paymentMethod: string;
  paidAt?: string;
  documentType?: "nota_debito" | "factura";
  fiscalName?: string | null;
  fiscalDocument?: string | null;
}

export function ReceiptDialog({
  open,
  onOpenChange,
  order,
  invoiceNumber,
  paymentMethod,
  paidAt,
  documentType = "nota_debito",
  fiscalName,
  fiscalDocument,
}: ReceiptDialogProps) {
  const customerName =
    fiscalName ||
    (order.customer
      ? `${order.customer.first_name} ${order.customer.last_name}`
      : "Consumidor Final");

  const docLabel = documentType === "factura" ? "FACTURA" : "NOTA DE DÉBITO";

  const date = new Date(paidAt ?? Date.now()).toLocaleString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const methodLabel = PAYMENT_METHOD_LABELS[paymentMethod] ?? paymentMethod;

  function handlePrint() {
    const receiptHtml = buildReceiptHtml({
      invoiceNumber,
      date,
      customerName,
      customerDocument: fiscalDocument || null,
      documentLabel: docLabel,
      items: order.items,
      total: order.total,
      currency: order.currency_code,
      methodLabel,
    });

    const win = window.open("", "_blank", "width=420,height=640");
    if (!win) {
      // Fallback si el navegador bloquea ventanas emergentes
      const blob = new Blob([receiptHtml], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `comprobante-${invoiceNumber}.html`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    win.document.write(receiptHtml);
    win.document.close();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Comprobante de pago</DialogTitle>
        </DialogHeader>

        {/* Vista previa del comprobante */}
        <div className="rounded-lg border bg-muted/20 p-4 font-mono text-xs space-y-2">
          <div className="text-center font-bold text-sm">{docLabel}</div>
          <Separator />

          <div className="flex justify-between">
            <span className="text-muted-foreground">N°</span>
            <span className="font-semibold">{invoiceNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fecha</span>
            <span>{date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cliente</span>
            <span className="truncate max-w-[140px] text-right">
              {customerName}
            </span>
          </div>
          {fiscalDocument && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">RIF/Cédula</span>
              <span>{fiscalDocument}</span>
            </div>
          )}

          <Separator />

          {/* Ítems */}
          <div className="space-y-1">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-2">
                <span className="truncate text-muted-foreground">
                  {item.quantity}× {item.description}
                </span>
                <span className="shrink-0">{item.subtotal.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <Separator />

          <div className="flex justify-between font-bold text-sm">
            <span>TOTAL</span>
            <span>
              {order.currency_code} {Number(order.total).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Método de pago</span>
            <span>{methodLabel}</span>
          </div>

          <Separator />
          <div className="text-center text-muted-foreground text-[10px]">
            ¡Gracias por su preferencia!
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-2">
          <Button className="flex-1 gap-2" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────────────
// Generador de HTML para ventana de impresión (estilo ticket térmico)
// ──────────────────────────────────────────────────────────────────

interface ReceiptData {
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerDocument?: string | null;
  documentLabel: string;
  items: {
    description: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }[];
  total: number;
  currency: string;
  methodLabel: string;
}

function buildReceiptHtml(data: ReceiptData): string {
  const itemsHtml = data.items
    .map(
      (item) => `
        <tr>
          <td style="padding:2px 0">${item.quantity}× ${escapeHtml(item.description)}</td>
          <td style="padding:2px 0;text-align:right">${item.subtotal.toFixed(2)}</td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(data.documentLabel)} ${data.invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      max-width: 280px;
      margin: 0 auto;
      padding: 16px 12px;
      color: #111;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #555; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; margin: 2px 0; }
    .muted { color: #555; }
    table { width: 100%; border-collapse: collapse; }
    td { vertical-align: top; }
    td:last-child { text-align: right; white-space: nowrap; padding-left: 8px; }
    .total-row td { font-weight: bold; font-size: 14px; padding-top: 4px; }
    @media print {
      @page { margin: 4mm; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="center bold" style="font-size:14px;margin-bottom:4px">${escapeHtml(data.documentLabel)}</div>
  <div class="divider"></div>
  <div class="row"><span class="muted">N°</span><span class="bold">${escapeHtml(data.invoiceNumber)}</span></div>
  <div class="row"><span class="muted">Fecha</span><span>${escapeHtml(data.date)}</span></div>
  <div class="row"><span class="muted">Cliente</span><span>${escapeHtml(data.customerName)}</span></div>
  ${data.customerDocument ? `<div class="row"><span class="muted">RIF/Cédula</span><span>${escapeHtml(data.customerDocument)}</span></div>` : ""}
  <div class="divider"></div>
  <table>
    <tbody>${itemsHtml}</tbody>
  </table>
  <div class="divider"></div>
  <table>
    <tr class="total-row">
      <td>TOTAL</td>
      <td>${escapeHtml(data.currency)} ${data.total.toFixed(2)}</td>
    </tr>
    <tr>
      <td class="muted">Método de pago</td>
      <td>${escapeHtml(data.methodLabel)}</td>
    </tr>
  </table>
  <div class="divider"></div>
  <div class="center muted" style="font-size:11px">¡Gracias por su preferencia!</div>
  <script>
    window.addEventListener('load', function() {
      window.print();
      setTimeout(function() { window.close(); }, 500);
    });
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
