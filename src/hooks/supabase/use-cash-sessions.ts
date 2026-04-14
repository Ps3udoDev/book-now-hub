// src/hooks/supabase/use-cash-sessions.ts
import useSWR from "swr";
import {
  type CashRegisterMovement,
  cashSessionsService,
  type EnrichedSession,
  type SessionWithDetails,
  type SummaryRow,
} from "@/lib/services/cash-sessions";
import type { CashRegisterSession } from "@/types";

/** Retorna la sesión activa (status='open') de la sucursal, o null si no hay ninguna. */
export function useActiveSession(branchId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<CashRegisterSession | null>(
    branchId ? `cash-sessions:active:${branchId}` : null,
    () => cashSessionsService.getActiveSession(branchId!),
    { revalidateOnFocus: false, dedupingInterval: 15000 },
  );

  return {
    activeSession: data ?? null,
    hasOpenSession: !!data,
    isLoading,
    error: error?.message || null,
    mutate,
  };
}

/** Retorna el historial de sesiones cerradas de una sucursal con datos enriquecidos. */
export function useClosedSessions(
  branchId: string | null,
  filters?: { from?: string; to?: string },
) {
  const filterKey = filters ? `${filters.from ?? ""}:${filters.to ?? ""}` : "";
  const { data, error, isLoading, mutate } = useSWR<EnrichedSession[]>(
    branchId ? `cash-sessions:closed:${branchId}:${filterKey}` : null,
    () => cashSessionsService.getClosedSessions(branchId!, filters),
    { revalidateOnFocus: false, dedupingInterval: 30000 },
  );

  return {
    sessions: data || [],
    isLoading,
    error: error?.message || null,
    mutate,
  };
}

/** Detalle completo de una sesión para el reporte de cierre. */
export function useSessionWithDetails(sessionId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<SessionWithDetails | null>(
    sessionId ? `cash-sessions:detail:${sessionId}` : null,
    () => cashSessionsService.getSessionWithDetails(sessionId!),
    { revalidateOnFocus: false, dedupingInterval: 60000 },
  );

  return {
    sessionDetail: data ?? null,
    isLoading,
    error: error?.message || null,
    mutate,
  };
}

/** Movimientos (egresos/ingresos) de una sesión en tiempo real. */
export function useSessionMovements(sessionId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<CashRegisterMovement[]>(
    sessionId ? `cash-sessions:movements:${sessionId}` : null,
    () => cashSessionsService.getSessionMovements(sessionId!),
    { revalidateOnFocus: false, dedupingInterval: 15000 },
  );

  return {
    movements: data ?? [],
    isLoading,
    error: error?.message || null,
    mutate,
  };
}

/** Resumen calculado en tiempo real de los cobros de una sesión. */
export function useSessionSummary(sessionId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<{
    session: CashRegisterSession;
    summary: SummaryRow[];
  }>(
    sessionId ? `cash-sessions:summary:${sessionId}` : null,
    () => cashSessionsService.getSessionSummary(sessionId!),
    { revalidateOnFocus: false, refreshInterval: 30000 },
  );

  return {
    sessionData: data ?? null,
    summary: data?.summary ?? [],
    isLoading,
    error: error?.message || null,
    mutate,
  };
}
