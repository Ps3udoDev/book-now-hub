"use client";

import { Loader2, Users } from "lucide-react";
import { useSegmentPreview } from "@/hooks/supabase/use-segments";
import type { SegmentRules } from "@/types";

interface SegmentPreviewProps {
  tenantId: string | null;
  rules: SegmentRules;
}

/** Muestra el conteo en vivo + una muestra de clientes del segmento. */
export function SegmentPreview({ tenantId, rules }: SegmentPreviewProps) {
  const { count, sample, isLoading, error, hasConditions } = useSegmentPreview(
    tenantId,
    rules,
  );

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Users className="h-4 w-4 text-primary" />
          Clientes que califican
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          <span className="text-2xl font-bold tabular-nums">
            {hasConditions ? count : "—"}
          </span>
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      {!hasConditions && (
        <p className="mt-2 text-xs text-muted-foreground">
          Agrega condiciones para ver el conteo.
        </p>
      )}

      {hasConditions && sample.length > 0 && (
        <div className="mt-3 space-y-1">
          <p className="text-xs text-muted-foreground">Muestra:</p>
          <ul className="flex flex-wrap gap-1">
            {sample.map((c) => (
              <li
                key={c.id}
                className="rounded-full bg-background px-2 py-0.5 text-xs"
              >
                {c.full_name || `${c.first_name} ${c.last_name}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasConditions && !isLoading && count === 0 && !error && (
        <p className="mt-2 text-xs text-muted-foreground">
          Ningún cliente cumple estas condiciones.
        </p>
      )}
    </div>
  );
}
