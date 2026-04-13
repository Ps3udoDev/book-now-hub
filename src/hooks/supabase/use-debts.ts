// src/hooks/supabase/use-debts.ts
import useSWR from "swr";
import type { DebtBalance } from "@/lib/services/debts";
import { debtsService } from "@/lib/services/debts";
import type { SpecialistDebt } from "@/types";

/** Deudas de un especialista específico */
export function useSpecialistDebts(
  tenantId: string | null,
  specialistId: string | null,
) {
  const { data, error, isLoading, mutate } = useSWR(
    tenantId && specialistId ? `debts:${tenantId}:${specialistId}` : null,
    () => debtsService.getBySpecialist(tenantId!, specialistId!),
    { dedupingInterval: 15000, revalidateOnFocus: false },
  );

  return {
    debts: (data ?? []) as SpecialistDebt[],
    isLoading,
    error,
    mutate,
  };
}

/** Deudas pendientes (remaining > 0) de un especialista */
export function useOutstandingDebts(
  tenantId: string | null,
  specialistId: string | null,
) {
  const { data, error, isLoading, mutate } = useSWR(
    tenantId && specialistId
      ? `debts:outstanding:${tenantId}:${specialistId}`
      : null,
    () => debtsService.getOutstandingDebts(tenantId!, specialistId!),
    { dedupingInterval: 15000, revalidateOnFocus: false },
  );

  return {
    debts: (data ?? []) as SpecialistDebt[],
    isLoading,
    error,
    mutate,
  };
}

/** Balance de deudas de todos los especialistas de un tenant */
export function useDebtBalances(tenantId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    tenantId ? `debts:balances:${tenantId}` : null,
    () => debtsService.getBalanceByTenant(tenantId!),
    { dedupingInterval: 30000, revalidateOnFocus: false },
  );

  return {
    balances: (data ?? []) as DebtBalance[],
    isLoading,
    error,
    mutate,
  };
}
