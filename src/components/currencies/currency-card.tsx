"use client";

// src/components/currencies/currency-card.tsx
import { AlertTriangle, Clock, Edit2, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isRateStale } from "@/lib/utils/currency";
import type { Currency, ExchangeRate } from "@/types";

interface CurrencyCardProps {
  currency: Currency;
  /** Tasa desde la moneda base HACIA esta moneda (ej: USD → VES) */
  rateFromBase: ExchangeRate | null;
  isBase: boolean;
  onEdit: (currency: Currency) => void;
}

/**
 * Tarjeta que muestra el estado de una moneda y su tasa respecto a la base.
 */
export function CurrencyCard({
  currency,
  rateFromBase,
  isBase,
  onEdit,
}: CurrencyCardProps) {
  const stale = rateFromBase ? isRateStale(rateFromBase.valid_from) : false;
  const hasRate = isBase || rateFromBase !== null;

  const updatedLabel = rateFromBase
    ? new Date(rateFromBase.valid_from).toLocaleString("es-VE", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <Card
      className={`relative transition-all ${
        !hasRate && !isBase ? "border-dashed border-muted-foreground/40" : ""
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          {/* Código + nombre */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
              {currency.symbol}
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-1.5">
                {currency.code}
                {isBase && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    </TooltipTrigger>
                    <TooltipContent>Moneda base del sistema</TooltipContent>
                  </Tooltip>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{currency.name}</p>
            </div>
          </div>

          {/* Badges de estado */}
          <div className="flex flex-col items-end gap-1">
            {isBase ? (
              <Badge variant="secondary" className="text-xs">
                Base
              </Badge>
            ) : hasRate ? (
              <Badge
                variant="outline"
                className="text-xs text-green-600 border-green-300"
              >
                Configurada
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-xs text-muted-foreground"
              >
                Sin tasa
              </Badge>
            )}
            {stale && (
              <Badge variant="destructive" className="text-xs gap-1">
                <AlertTriangle className="h-3 w-3" />
                +24h sin actualizar
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Tasa actual */}
        {isBase ? (
          <p className="text-sm text-muted-foreground">
            Moneda de referencia del sistema. Todos los cobros se consolidan en{" "}
            <strong>{currency.code}</strong>.
          </p>
        ) : rateFromBase ? (
          <div className="rounded-lg bg-muted/60 px-3 py-2 text-sm font-mono">
            {/* Aquí asumimos que el código de la moneda base es la otra moneda */}
            <span className="font-medium">
              {rateFromBase.rate.toLocaleString("es-VE")}
            </span>
            <span className="text-muted-foreground ml-1">
              {currency.symbol} por 1 unidad base
            </span>
          </div>
        ) : (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Sin tasa configurada. Esta moneda no estará disponible en el cobro
            hasta que se defina una tasa.
          </p>
        )}

        {/* Última actualización */}
        {updatedLabel && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Actualizado: {updatedLabel}
          </div>
        )}

        {/* Acción */}
        {!isBase && (
          <Button
            size="sm"
            variant={rateFromBase ? "outline" : "default"}
            className="w-full"
            onClick={() => onEdit(currency)}
          >
            <Edit2 className="mr-1.5 h-3.5 w-3.5" />
            {rateFromBase ? "Editar tasa" : "Configurar tasa"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
