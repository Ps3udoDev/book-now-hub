// src/providers/client-currency-provider.tsx
// Contexto de moneda para la app del cliente (/c/[tenant]/...).
// Carga el catalogo de monedas + las tasas vigentes del tenant y expone
// `formatPrice(amount, fromCurrency)` que convierte a la moneda preferida
// del cliente y formatea con simbolo/decimales. (Tarea 3.8 - conversion FX)
"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";
import useSWR from "swr";
import { clientProfileService } from "@/lib/services/client-profile";
import {
  buildRateMap,
  type CurrencyMeta,
  getRateMultiplier,
  indexCurrencies,
} from "@/lib/utils/client-currency";
import { formatCurrency } from "@/lib/utils/currency";
import { useClientTenant } from "@/providers/client-tenant-provider";
import type { Currency } from "@/types";

interface ClientCurrencyContextValue {
  // Moneda en la que se muestran los precios al cliente.
  displayCurrency: string | null;
  // Formatea un monto convirtiendolo desde su moneda origen a la preferida.
  formatPrice: (
    amount: number | null | undefined,
    fromCurrency?: string | null,
  ) => string;
  // Catalogo de monedas activas (para el selector de moneda preferida).
  availableCurrencies: Currency[];
  isReady: boolean;
}

const ClientCurrencyContext = createContext<ClientCurrencyContextValue | null>(
  null,
);

async function fetchCurrencies(): Promise<Currency[]> {
  const res = await fetch("/api/currencies");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error al cargar monedas");
  return (data.currencies ?? []) as Currency[];
}

export function ClientCurrencyProvider({ children }: { children: ReactNode }) {
  const { tenantSlug, customer } = useClientTenant();
  const preferredCurrency = customer?.preferred_currency ?? null;

  const { data: currencies } = useSWR<Currency[]>(
    "client:currencies:catalog",
    fetchCurrencies,
    { revalidateOnFocus: false, dedupingInterval: 300_000 },
  );

  const { data: ratesData } = useSWR(
    tenantSlug ? `client:exchange-rates:${tenantSlug}` : null,
    () => clientProfileService.getExchangeRates(tenantSlug),
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  );

  const value = useMemo<ClientCurrencyContextValue>(() => {
    const catalog = currencies ?? [];
    const rates = ratesData?.rates ?? [];
    const rateMap = buildRateMap(rates);
    const metaIndex = indexCurrencies(catalog);
    const baseCode = catalog.find((c) => c.is_base_currency)?.code ?? null;

    const metaFor = (code: string): CurrencyMeta =>
      metaIndex[code] ?? { symbol: code, decimalPlaces: 2 };

    const formatPrice = (
      amount: number | null | undefined,
      fromCurrency?: string | null,
    ): string => {
      if (amount === null || amount === undefined) return "—";

      const source = fromCurrency || preferredCurrency || baseCode || "USD";
      const target = preferredCurrency || source;

      // Sin conversion necesaria (misma moneda o sin preferencia definida).
      if (source === target) {
        const meta = metaFor(source);
        return formatCurrency(amount, meta.symbol, meta.decimalPlaces);
      }

      const multiplier = getRateMultiplier(source, target, rateMap, baseCode);

      // Si no hay tasa que conecte ambas monedas, muestra en la moneda origen.
      if (multiplier === null) {
        const meta = metaFor(source);
        return formatCurrency(amount, meta.symbol, meta.decimalPlaces);
      }

      const meta = metaFor(target);
      return formatCurrency(
        amount * multiplier,
        meta.symbol,
        meta.decimalPlaces,
      );
    };

    return {
      displayCurrency: preferredCurrency,
      formatPrice,
      availableCurrencies: catalog,
      isReady: currencies !== undefined,
    };
  }, [currencies, ratesData, preferredCurrency]);

  return (
    <ClientCurrencyContext.Provider value={value}>
      {children}
    </ClientCurrencyContext.Provider>
  );
}

export function useClientCurrency(): ClientCurrencyContextValue {
  const ctx = useContext(ClientCurrencyContext);
  if (ctx) return ctx;
  // Fallback seguro para componentes fuera del provider (ej. previews).
  return {
    displayCurrency: null,
    formatPrice: (amount, fromCurrency) => {
      if (amount === null || amount === undefined) return "—";
      return `${fromCurrency ?? "USD"} ${amount.toFixed(2)}`;
    },
    availableCurrencies: [],
    isReady: false,
  };
}
