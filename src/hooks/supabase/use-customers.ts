// src/hooks/supabase/use-customers.ts
import useSWR from "swr";
import {
  customersService,
  type CustomerStats,
} from "@/lib/services/customers";
import type { Customer } from "@/types";

/**
 * Hook para obtener todos los clientes de un tenant
 */
export function useCustomers(tenantId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Customer[]>(
    tenantId ? `customers:tenant:${tenantId}` : null,
    () => (tenantId ? customersService.getCustomersByTenant(tenantId) : []),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    customers: data || [],
    isLoading,
    error: error?.message || null,
    mutate,
  };
}

/**
 * Hook para obtener clientes activos
 */
export function useActiveCustomers(tenantId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Customer[]>(
    tenantId ? `customers:active:${tenantId}` : null,
    () => (tenantId ? customersService.getActiveCustomers(tenantId) : []),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    customers: data || [],
    isLoading,
    error: error?.message || null,
    mutate,
  };
}

/**
 * Hook para obtener un cliente por ID
 */
export function useCustomer(customerId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Customer | null>(
    customerId ? `customer:${customerId}` : null,
    () => (customerId ? customersService.getCustomerById(customerId) : null),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    customer: data || null,
    isLoading,
    error: error?.message || null,
    mutate,
  };
}

/**
 * Hook para buscar clientes
 */
export function useCustomerSearch(tenantId: string | null, query: string) {
  const shouldSearch = tenantId && query.length >= 2;

  const { data, error, isLoading } = useSWR<Customer[]>(
    shouldSearch ? `customers:search:${tenantId}:${query}` : null,
    () =>
      shouldSearch ? customersService.searchCustomers(tenantId, query) : [],
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    results: data || [],
    isLoading,
    error: error?.message || null,
  };
}

/**
 * Hook para obtener estadísticas de clientes
 */
export function useCustomerStats(tenantId: string | null) {
  const { data, error, isLoading } = useSWR<CustomerStats>(
    tenantId ? `customers:stats:${tenantId}` : null,
    () =>
      tenantId
        ? customersService.getCustomerStats(tenantId)
        : { total: 0, active: 0, withEmail: 0, withPhone: 0, newThisMonth: 0 },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  return {
    stats: data || {
      total: 0,
      active: 0,
      withEmail: 0,
      withPhone: 0,
      newThisMonth: 0,
    },
    isLoading,
    error: error?.message || null,
  };
}

/**
 * Hook para obtener tags únicos
 */
export function useCustomerTags(tenantId: string | null) {
  const { data, error, isLoading } = useSWR<string[]>(
    tenantId ? `customers:tags:${tenantId}` : null,
    () => (tenantId ? customersService.getUniqueTags(tenantId) : []),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  return {
    tags: data || [],
    isLoading,
    error: error?.message || null,
  };
}

/**
 * Hook para obtener clientes por tag
 */
export function useCustomersByTag(tenantId: string | null, tag: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Customer[]>(
    tenantId && tag ? `customers:tag:${tenantId}:${tag}` : null,
    () =>
      tenantId && tag ? customersService.getCustomersByTag(tenantId, tag) : [],
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    customers: data || [],
    isLoading,
    error: error?.message || null,
    mutate,
  };
}

/**
 * Hook para obtener clientes con cumpleaños próximo
 */
export function useUpcomingBirthdays(tenantId: string | null, days: number = 7) {
  const { data, error, isLoading } = useSWR<Customer[]>(
    tenantId ? `customers:birthdays:${tenantId}:${days}` : null,
    () => {
      if (!tenantId) return [];
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(today.getDate() + days);
      return customersService.getCustomersWithBirthday(tenantId, today, endDate);
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 3600000, // 1 hora
    }
  );

  return {
    customers: data || [],
    isLoading,
    error: error?.message || null,
  };
}