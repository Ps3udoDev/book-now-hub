// src/lib/utils/currency.ts

export interface ConversionResult {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  convertedAmount: number;
}

/**
 * Convierte un monto entre monedas usando la tasa provista.
 * La tasa debe pasarse explícitamente — representa el snapshot del momento del cobro,
 * no la tasa vigente en consultas posteriores.
 *
 * Casos edge:
 * - Misma moneda: retorna el monto sin cambio (rate = 1)
 * - Tasa 0 o inválida: retorna null
 * - Decimales: preserva hasta 8 decimales internamente
 */
export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rate: number,
): ConversionResult | null {
  if (fromCurrency === toCurrency) {
    return {
      amount,
      fromCurrency,
      toCurrency,
      rate: 1,
      convertedAmount: amount,
    };
  }

  if (!rate || rate <= 0 || !Number.isFinite(rate)) return null;
  if (!Number.isFinite(amount) || amount < 0) return null;

  const convertedAmount = parseFloat((amount * rate).toFixed(8));

  return { amount, fromCurrency, toCurrency, rate, convertedAmount };
}

/**
 * Formatea un monto con símbolo de moneda según locale venezolano.
 */
export function formatCurrency(
  amount: number,
  symbol: string,
  decimalPlaces = 2,
): string {
  const formatted = amount.toLocaleString("es-VE", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });
  return `${symbol}${formatted}`;
}

/**
 * Indica si una tasa lleva más de N horas sin actualizarse.
 */
export function isRateStale(updatedAt: string, hours = 24): boolean {
  return Date.now() - new Date(updatedAt).getTime() > hours * 3_600_000;
}

/**
 * Formatea una tasa de cambio para mostrar (ej: "1 USD = 36,500.00 Bs")
 */
export function formatRate(
  rate: number,
  fromSymbol: string,
  toSymbol: string,
  toDecimalPlaces = 2,
): string {
  const formatted = rate.toLocaleString("es-VE", {
    minimumFractionDigits: toDecimalPlaces,
    maximumFractionDigits: toDecimalPlaces,
  });
  return `1 ${fromSymbol} = ${toSymbol}${formatted}`;
}
