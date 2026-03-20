// src/app/api/cash-sessions/_utils.ts
// Utilidades del servidor para sesiones de caja (solo importar desde route handlers)
import { supabaseAdmin } from "@/lib/supabase/admin";

export interface SummaryRow {
  area: string;
  currency_code: string;
  total_cash: number;
  total_card: number;
  total_transfer: number;
  total_mobile_payment: number;
  total_gateway: number;
  total_amount: number;
  transaction_count: number;
}

const AREA_ORDER: Record<string, number> = {
  service: 0,
  product: 1,
  cafeteria: 2,
  total: 3,
};

/**
 * Calcula el resumen de cobros de una sesión de caja agrupando
 * invoice_payments por área (de invoice_lines), método de pago y moneda.
 *
 * Para invoices con líneas de varias áreas se distribuye el pago
 * proporcionalmente según el peso de cada área en el total de la factura.
 */
export async function calculateSessionSummary(
  sessionId: string,
): Promise<SummaryRow[]> {
  // Obtener pagos con sus facturas y líneas
  const { data: payments, error } = await supabaseAdmin
    .from("invoice_payments")
    .select(
      `
      id,
      amount,
      currency_iso,
      payment_method,
      invoice:invoices!invoice_payments_invoice_id_fkey(
        id,
        total,
        lines:invoice_lines(line_type, total)
      )
    `,
    )
    .eq("session_id", sessionId);

  if (error) throw new Error(`Error al calcular resumen: ${error.message}`);

  type RawPayment = {
    id: string;
    amount: number;
    currency_iso: string;
    payment_method: string | null;
    invoice: {
      id: string;
      total: number;
      lines: { line_type: string; total: number }[];
    } | null;
  };

  const acc: Record<string, SummaryRow> = {};

  function getRow(area: string, currency: string): SummaryRow {
    const key = `${area}::${currency}`;
    if (!acc[key]) {
      acc[key] = {
        area,
        currency_code: currency,
        total_cash: 0,
        total_card: 0,
        total_transfer: 0,
        total_mobile_payment: 0,
        total_gateway: 0,
        total_amount: 0,
        transaction_count: 0,
      };
    }
    return acc[key];
  }

  function credit(
    row: SummaryRow,
    method: string | null,
    amount: number,
    count = 1,
  ) {
    row.total_amount += amount;
    row.transaction_count += count;
    switch (method) {
      case "cash":
        row.total_cash += amount;
        break;
      case "card":
        row.total_card += amount;
        break;
      case "transfer":
        row.total_transfer += amount;
        break;
      case "mobile_payment":
        row.total_mobile_payment += amount;
        break;
      default:
        // stripe, mercadopago, desconocido
        row.total_gateway += amount;
    }
  }

  for (const p of (payments as RawPayment[]) ?? []) {
    const payAmt = Number(p.amount);
    const currency = p.currency_iso;
    const method = p.payment_method;

    // Fila de totales generales siempre se acumula íntegra
    credit(getRow("total", currency), method, payAmt, 1);

    const invoice = p.invoice;

    if (!invoice || !invoice.lines || invoice.lines.length === 0) {
      // Sin líneas: asumir área de servicio
      credit(getRow("service", currency), method, payAmt, 0);
      continue;
    }

    // Calcular peso de cada área en el total de la factura
    const linesByArea: Record<string, number> = {};
    let linesTotal = 0;
    for (const line of invoice.lines) {
      const area = line.line_type || "service";
      linesByArea[area] = (linesByArea[area] || 0) + Number(line.total);
      linesTotal += Number(line.total);
    }

    if (linesTotal === 0) {
      credit(getRow("service", currency), method, payAmt, 0);
      continue;
    }

    // Distribuir pago proporcionalmente por área
    let distributed = 0;
    const entries = Object.entries(linesByArea);
    entries.forEach(([area, areaTotal], idx) => {
      let areaAmt: number;
      if (idx === entries.length - 1) {
        // Último área recibe el resto para evitar errores de redondeo
        areaAmt = payAmt - distributed;
      } else {
        areaAmt = Math.round(((payAmt * areaTotal) / linesTotal) * 100) / 100;
        distributed += areaAmt;
      }
      credit(getRow(area, currency), method, areaAmt, 0);
    });
  }

  return Object.values(acc).sort((a, b) => {
    const oa = AREA_ORDER[a.area] ?? 99;
    const ob = AREA_ORDER[b.area] ?? 99;
    if (oa !== ob) return oa - ob;
    return a.currency_code.localeCompare(b.currency_code);
  });
}
