// src/lib/utils/client-currency.ts
// Helpers puros para convertir y formatear precios en la moneda preferida
// del cliente (app /c/[tenant]). Reutiliza formatCurrency de utils/currency.
import type { Currency } from "@/types";

// Forma minima de una tasa vigente (solo lo necesario para convertir).
export interface RateInput {
  from_currency: string;
  to_currency: string;
  rate: number;
}

// Mapa de tasas vigentes: rateMap[from][to] = cuantas `to` por 1 `from`.
export type RateMap = Record<string, Record<string, number>>;

export function buildRateMap(rates: RateInput[]): RateMap {
  const map: RateMap = {};
  for (const r of rates) {
    if (!r.rate || r.rate <= 0) continue;
    if (!map[r.from_currency]) map[r.from_currency] = {};
    map[r.from_currency][r.to_currency] = r.rate;
  }
  return map;
}

// Multiplicador directo o inverso entre dos monedas (sin puentear por base).
function directOrInverse(
  from: string,
  to: string,
  rateMap: RateMap,
): number | null {
  if (from === to) return 1;
  const direct = rateMap[from]?.[to];
  if (direct && direct > 0) return direct;
  const inverse = rateMap[to]?.[from];
  if (inverse && inverse > 0) return 1 / inverse;
  return null;
}

/**
 * Multiplicador para convertir un monto de `from` a `to`.
 * Intenta: misma moneda → directo → inverso → puente por la moneda base.
 * Devuelve null si no hay forma de conectar ambas monedas con las tasas.
 */
export function getRateMultiplier(
  from: string,
  to: string,
  rateMap: RateMap,
  baseCode: string | null,
): number | null {
  if (from === to) return 1;

  const direct = directOrInverse(from, to, rateMap);
  if (direct !== null) return direct;

  // Puente por la moneda base (tasas suelen configurarse contra la base).
  if (baseCode && baseCode !== from && baseCode !== to) {
    const fromBase = directOrInverse(from, baseCode, rateMap);
    const baseTo = directOrInverse(baseCode, to, rateMap);
    if (fromBase !== null && baseTo !== null) return fromBase * baseTo;
  }

  return null;
}

export interface CurrencyMeta {
  symbol: string;
  decimalPlaces: number;
}

// Indexa el catalogo de monedas por code para lookup de simbolo/decimales.
export function indexCurrencies(
  currencies: Currency[],
): Record<string, CurrencyMeta> {
  const index: Record<string, CurrencyMeta> = {};
  for (const c of currencies) {
    index[c.code] = {
      symbol: c.symbol || c.code,
      decimalPlaces: c.decimal_places ?? 2,
    };
  }
  return index;
}
