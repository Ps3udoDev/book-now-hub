"use client";

import { ArrowLeft, Info, Loader2, RefreshCw } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
// src/app/t/[tenant]/settings/currencies/page.tsx
import { useState } from "react";
import { CurrencyCard } from "@/components/currencies/currency-card";
import { ExchangeRateForm } from "@/components/currencies/exchange-rate-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCurrencies,
  useExchangeRates,
} from "@/hooks/supabase/use-currencies";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { Currency, ExchangeRate } from "@/types";

export default function MonedasPage() {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const { tenant } = useAuthStore();
  const tenantId = tenant?.id || null;

  const { currencies, isLoading: loadingCurrencies } = useCurrencies();
  const {
    rates,
    isLoading: loadingRates,
    mutate: mutateRates,
  } = useExchangeRates(tenantId);

  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);

  const isLoading = loadingCurrencies || loadingRates;

  // Identificar la moneda base
  const baseCurrency = currencies.find((c) => c.is_base_currency) ?? null;
  const otherCurrencies = currencies.filter((c) => !c.is_base_currency);

  // Para cada moneda no-base, buscar su tasa desde la moneda base
  function getRateFromBase(currency: Currency): ExchangeRate | null {
    if (!baseCurrency) return null;
    return (
      rates.find(
        (r) =>
          r.from_currency === baseCurrency.code &&
          r.to_currency === currency.code,
      ) ?? null
    );
  }

  // Cuántas monedas no-base tienen tasa configurada
  const configuredCount = otherCurrencies.filter(
    (c) => getRateFromBase(c) !== null,
  ).length;
  const missingCount = otherCurrencies.length - configuredCount;

  const editingRate =
    editingCurrency && baseCurrency ? getRateFromBase(editingCurrency) : null;

  function handleEditSuccess() {
    mutateRates();
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-md" />
          <div className="space-y-1">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/t/${tenantSlug}/settings`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Monedas</h1>
            <p className="text-muted-foreground">
              Configura las tasas de cambio para cobros en múltiples monedas
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => mutateRates()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* Alerta si faltan tasas */}
      {missingCount > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {missingCount === 1
              ? "Hay 1 moneda sin tasa configurada."
              : `Hay ${missingCount} monedas sin tasa configurada.`}{" "}
            Las monedas sin tasa no estarán disponibles al momento del cobro.
          </AlertDescription>
        </Alert>
      )}

      {/* Moneda base */}
      {baseCurrency && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Moneda base del sistema</CardTitle>
            <CardDescription>
              Todos los cobros se consolidan en esta moneda para el cierre de
              caja.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 rounded-lg bg-muted/60 px-4 py-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                {baseCurrency.symbol}
              </div>
              <div>
                <p className="font-semibold text-lg">{baseCurrency.code}</p>
                <p className="text-sm text-muted-foreground">
                  {baseCurrency.name}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Otras monedas */}
      <div>
        <div className="mb-4">
          <h2 className="text-base font-semibold">Tasas de cambio</h2>
          <p className="text-sm text-muted-foreground">
            {configuredCount} de {otherCurrencies.length} monedas configuradas
          </p>
        </div>

        {otherCurrencies.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Cargando monedas...
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {otherCurrencies.map((currency) => (
              <CurrencyCard
                key={currency.code}
                currency={currency}
                rateFromBase={getRateFromBase(currency)}
                isBase={false}
                onEdit={setEditingCurrency}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de edición de tasa */}
      {editingCurrency && baseCurrency && tenantId && (
        <ExchangeRateForm
          open={editingCurrency !== null}
          onOpenChange={(open) => {
            if (!open) setEditingCurrency(null);
          }}
          baseCurrency={baseCurrency}
          currency={editingCurrency}
          existingRate={editingRate}
          tenantId={tenantId}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
