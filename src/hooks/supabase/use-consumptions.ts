// src/hooks/supabase/use-consumptions.ts
import useSWR from "swr";
import {
  type ConsumptionWithService,
  consumptionsService,
  type SpecialistMonthStats,
} from "@/lib/services/consumptions";

export function useConsumptions(
  tenantId: string | null,
  specialistId: string | null,
  options?: { from?: string; to?: string },
) {
  const key =
    tenantId && specialistId
      ? `consumptions:${specialistId}:${options?.from || ""}:${options?.to || ""}`
      : null;

  const { data, error, isLoading, mutate } = useSWR<ConsumptionWithService[]>(
    key,
    () => consumptionsService.getBySpecialist(tenantId!, specialistId!, options),
    { revalidateOnFocus: false, dedupingInterval: 15000 },
  );

  return {
    consumptions: data || [],
    isLoading,
    error: error?.message || null,
    mutate,
  };
}

export function useMonthStats(
  tenantId: string | null,
  specialistId: string | null,
  year: number,
  month: number,
) {
  const { data, error, isLoading, mutate } = useSWR<SpecialistMonthStats>(
    tenantId && specialistId
      ? `month-stats:${specialistId}:${year}-${month}`
      : null,
    () => consumptionsService.getMonthStats(tenantId!, specialistId!, year, month),
    { revalidateOnFocus: false, dedupingInterval: 30000 },
  );

  return {
    stats: data ?? null,
    isLoading,
    error: error?.message || null,
    mutate,
  };
}
