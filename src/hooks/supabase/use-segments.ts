// src/hooks/supabase/use-segments.ts
import { useEffect, useState } from "react";
import useSWR from "swr";
import {
  type SegmentPreviewResult,
  segmentsService,
} from "@/lib/services/segments";
import type { CustomerSegment, SegmentRules } from "@/types";

/** Lista de segmentos del tenant. */
export function useSegments(tenantId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<CustomerSegment[]>(
    tenantId ? `segments:${tenantId}` : null,
    () => (tenantId ? segmentsService.list(tenantId) : []),
    { revalidateOnFocus: false, dedupingInterval: 30000 },
  );

  return {
    segments: data || [],
    isLoading,
    error: error?.message || null,
    mutate,
  };
}

/** Un segmento por id. */
export function useSegment(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<CustomerSegment | null>(
    id ? `segment:${id}` : null,
    () => (id ? segmentsService.get(id) : null),
    { revalidateOnFocus: false },
  );

  return {
    segment: data || null,
    isLoading,
    error: error?.message || null,
    mutate,
  };
}

/**
 * Preview en vivo de un segmento con debounce. Devuelve conteo real + muestra.
 * Sólo consulta cuando hay al menos una condición.
 */
export function useSegmentPreview(
  tenantId: string | null,
  rules: SegmentRules,
  debounceMs = 500,
) {
  const [debouncedKey, setDebouncedKey] = useState<string>("");

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedKey(JSON.stringify(rules));
    }, debounceMs);
    return () => clearTimeout(handle);
  }, [rules, debounceMs]);

  const enabled =
    !!tenantId && rules.conditions.length > 0 && debouncedKey.length > 0;

  const { data, error, isLoading } = useSWR<SegmentPreviewResult>(
    enabled ? `segment-preview:${tenantId}:${debouncedKey}` : null,
    () => segmentsService.preview(tenantId as string, JSON.parse(debouncedKey)),
    { revalidateOnFocus: false, keepPreviousData: true },
  );

  return {
    count: data?.count ?? 0,
    sample: data?.sample ?? [],
    isLoading: enabled && isLoading,
    error: error?.message || null,
    hasConditions: rules.conditions.length > 0,
  };
}
