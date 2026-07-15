// src/hooks/supabase/use-dashboard.ts
import useSWR from "swr";
import {
  type DashboardAppointment,
  type DashboardKpis,
  dashboardService,
  type RevenuePoint,
  type StatusSlice,
  type TopProduct,
  type TopService,
} from "@/lib/services/dashboard";

const OPTS = { revalidateOnFocus: false, dedupingInterval: 60000 };

export function useDashboardKpis(tenantId: string | null) {
  const { data, error, isLoading } = useSWR<DashboardKpis>(
    tenantId ? `dashboard:kpis:${tenantId}` : null,
    () =>
      tenantId
        ? dashboardService.getKpis(tenantId)
        : {
            appointmentsToday: 0,
            totalCustomers: 0,
            activeServices: 0,
            revenueToday: 0,
          },
    OPTS,
  );
  return { kpis: data, isLoading, error: error?.message || null };
}

export function useTodayAppointments(tenantId: string | null) {
  const { data, error, isLoading } = useSWR<DashboardAppointment[]>(
    tenantId ? `dashboard:today:${tenantId}` : null,
    () => (tenantId ? dashboardService.getTodayAppointments(tenantId) : []),
    OPTS,
  );
  return { appointments: data || [], isLoading, error: error?.message || null };
}

export function useRevenueLast7Days(tenantId: string | null) {
  const { data, error, isLoading } = useSWR<RevenuePoint[]>(
    tenantId ? `dashboard:revenue7:${tenantId}` : null,
    () => (tenantId ? dashboardService.getRevenueLast7Days(tenantId) : []),
    OPTS,
  );
  return { revenue: data || [], isLoading, error: error?.message || null };
}

export function useStatusBreakdown(tenantId: string | null) {
  const { data, error, isLoading } = useSWR<StatusSlice[]>(
    tenantId ? `dashboard:status:${tenantId}` : null,
    () => (tenantId ? dashboardService.getStatusBreakdown(tenantId) : []),
    OPTS,
  );
  return { slices: data || [], isLoading, error: error?.message || null };
}

export function useTopServices(tenantId: string | null) {
  const { data, error, isLoading } = useSWR<TopService[]>(
    tenantId ? `dashboard:topservices:${tenantId}` : null,
    () => (tenantId ? dashboardService.getTopServices(tenantId) : []),
    OPTS,
  );
  return { services: data || [], isLoading, error: error?.message || null };
}

export function useTopProducts(tenantId: string | null) {
  const { data, error, isLoading } = useSWR<TopProduct[]>(
    tenantId ? `dashboard:topproducts:${tenantId}` : null,
    () => (tenantId ? dashboardService.getTopProducts(tenantId) : []),
    OPTS,
  );
  return { products: data || [], isLoading, error: error?.message || null };
}
