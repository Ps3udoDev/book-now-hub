// src/hooks/supabase/use-commissions.ts
import useSWR from "swr";
import {
  type CommissionRuleWithRelations,
  type CommissionWithRelations,
  commissionsService,
  type SpecialistBalance,
} from "@/lib/services/commissions";
import type { CommissionStatus } from "@/types";

/**
 * Reglas de comisión de todo el tenant (para admins/owners)
 */
export function useCommissionRules(tenantId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<
    CommissionRuleWithRelations[]
  >(
    tenantId ? `commission-rules:tenant:${tenantId}` : null,
    () => (tenantId ? commissionsService.getRulesByTenant(tenantId) : []),
    { revalidateOnFocus: false, dedupingInterval: 10000 },
  );

  return {
    rules: data || [],
    isLoading,
    error: error?.message || null,
    mutate,
  };
}

/**
 * Reglas de comisión de un especialista específico
 */
export function useSpecialistRules(
  tenantId: string | null,
  specialistId: string | null,
) {
  const { data, error, isLoading, mutate } = useSWR<
    CommissionRuleWithRelations[]
  >(
    tenantId && specialistId
      ? `commission-rules:specialist:${specialistId}`
      : null,
    () =>
      tenantId && specialistId
        ? commissionsService.getRulesBySpecialist(tenantId, specialistId)
        : [],
    { revalidateOnFocus: false, dedupingInterval: 10000 },
  );

  return {
    rules: data || [],
    isLoading,
    error: error?.message || null,
    mutate,
  };
}

/**
 * Comisiones del tenant con filtros opcionales
 */
export function useCommissions(
  tenantId: string | null,
  options?: {
    specialistId?: string;
    status?: CommissionStatus;
    from?: string;
    to?: string;
  },
) {
  const key = tenantId
    ? `commissions:${tenantId}:${options?.specialistId || "all"}:${options?.status || "all"}:${options?.from || ""}:${options?.to || ""}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<CommissionWithRelations[]>(
    key,
    () =>
      tenantId ? commissionsService.getCommissions(tenantId, options) : [],
    { revalidateOnFocus: false, dedupingInterval: 15000 },
  );

  return {
    commissions: data || [],
    isLoading,
    error: error?.message || null,
    mutate,
  };
}

/**
 * Comisiones propias del especialista con filtro de mes
 */
export function useMyCommissions(
  tenantId: string | null,
  specialistId: string | null,
  options?: { year?: number; month?: number },
) {
  const key =
    tenantId && specialistId
      ? `commissions:my:${specialistId}:${options?.year || "all"}:${options?.month || "all"}`
      : null;

  const { data, error, isLoading, mutate } = useSWR<CommissionWithRelations[]>(
    key,
    () =>
      tenantId && specialistId
        ? commissionsService.getMyCommissions(tenantId, specialistId, options)
        : [],
    { revalidateOnFocus: false, dedupingInterval: 15000 },
  );

  return {
    commissions: data || [],
    isLoading,
    error: error?.message || null,
    mutate,
  };
}

/**
 * Balance de todos los especialistas para la pantalla de liquidación
 */
export function useSpecialistsBalance(
  tenantId: string | null,
  year: number,
  month: number,
  fortnight?: 1 | 2,
) {
  const key = tenantId
    ? `specialists-balance:${tenantId}:${year}-${month}:${fortnight ?? "full"}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<SpecialistBalance[]>(
    key,
    () =>
      tenantId
        ? commissionsService.getSpecialistsBalance(
            tenantId,
            year,
            month,
            fortnight,
          )
        : [],
    { revalidateOnFocus: false, dedupingInterval: 30000 },
  );

  return {
    balance: data || [],
    isLoading,
    error: error?.message || null,
    mutate,
  };
}
