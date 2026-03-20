// src/hooks/supabase/use-currencies.ts
import useSWR from "swr";
import { currenciesService } from "@/lib/services/currencies";
import type { Currency, ExchangeRate } from "@/types";

/**
 * Todas las monedas del sistema (activas e inactivas)
 */
export function useCurrencies() {
  const { data, error, isLoading, mutate } = useSWR<Currency[]>(
    "currencies:all",
    () => currenciesService.getAllCurrencies(),
    { revalidateOnFocus: false, dedupingInterval: 60000 },
  );

  return {
    currencies: data || [],
    isLoading,
    error: error?.message || null,
    mutate,
  };
}

/**
 * Solo monedas activas
 */
export function useActiveCurrencies() {
  const { data, error, isLoading } = useSWR<Currency[]>(
    "currencies:active",
    () => currenciesService.getActiveCurrencies(),
    { revalidateOnFocus: false, dedupingInterval: 60000 },
  );

  return {
    currencies: data || [],
    isLoading,
    error: error?.message || null,
  };
}

/**
 * Moneda base del sistema
 */
export function useBaseCurrency() {
  const { data, error, isLoading } = useSWR<Currency | null>(
    "currencies:base",
    () => currenciesService.getBaseCurrency(),
    { revalidateOnFocus: false, dedupingInterval: 300000 },
  );

  return {
    baseCurrency: data || null,
    isLoading,
    error: error?.message || null,
  };
}

/**
 * Tasas vigentes (valid_until IS NULL) de un tenant
 */
export function useExchangeRates(tenantId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<ExchangeRate[]>(
    tenantId ? `exchange-rates:tenant:${tenantId}` : null,
    () =>
      tenantId ? currenciesService.getExchangeRatesByTenant(tenantId) : [],
    { revalidateOnFocus: false, dedupingInterval: 30000 },
  );

  return {
    rates: data || [],
    isLoading,
    error: error?.message || null,
    mutate,
  };
}

/**
 * Tasa vigente entre dos monedas específicas para un tenant
 */
export function useExchangeRate(
  tenantId: string | null,
  fromCurrency: string | null,
  toCurrency: string | null,
) {
  const enabled =
    tenantId && fromCurrency && toCurrency && fromCurrency !== toCurrency;

  const { data, error, isLoading, mutate } = useSWR<ExchangeRate | null>(
    enabled ? `exchange-rate:${tenantId}:${fromCurrency}:${toCurrency}` : null,
    () =>
      tenantId && fromCurrency && toCurrency
        ? currenciesService.getExchangeRate(tenantId, fromCurrency, toCurrency)
        : null,
    { revalidateOnFocus: false, dedupingInterval: 30000 },
  );

  return {
    rate: data ?? null,
    isLoading,
    error: error?.message || null,
    mutate,
  };
}
