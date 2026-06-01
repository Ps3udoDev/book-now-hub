// src/hooks/supabase/use-client-services.ts
import useSWR from "swr";
import {
  type ClientAvailabilityResponse,
  type ClientServiceDetailResponse,
  type ClientServiceListItem,
  type ClientServiceSpecialist,
  clientServicesService,
} from "@/lib/services/client-services";

export function useClientServices(
  tenantSlug: string | null,
  options: { search?: string; category?: string } = {},
) {
  const key = tenantSlug
    ? `client:services:${tenantSlug}:${options.search ?? ""}:${options.category ?? ""}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<{
    services: ClientServiceListItem[];
    grouped: Record<string, ClientServiceListItem[]>;
  }>(
    key,
    () => clientServicesService.listServices(tenantSlug as string, options),
    { revalidateOnFocus: false, dedupingInterval: 30_000 },
  );

  return {
    services: data?.services ?? [],
    grouped: data?.grouped ?? {},
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

export function useClientService(
  tenantSlug: string | null,
  serviceId: string | null,
) {
  const key =
    tenantSlug && serviceId
      ? `client:service:${tenantSlug}:${serviceId}`
      : null;

  const { data, error, isLoading, mutate } =
    useSWR<ClientServiceDetailResponse>(
      key,
      () =>
        clientServicesService.getService(
          tenantSlug as string,
          serviceId as string,
        ),
      { revalidateOnFocus: false, dedupingInterval: 30_000 },
    );

  return {
    service: data?.service ?? null,
    defaultBranchId: data?.default_branch_id ?? null,
    branches: data?.branches ?? [],
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

export function useClientServiceSpecialists(
  tenantSlug: string | null,
  serviceId: string | null,
  branchId: string | null,
) {
  const key =
    tenantSlug && serviceId && branchId
      ? `client:service-specialists:${tenantSlug}:${serviceId}:${branchId}`
      : null;

  const { data, error, isLoading, mutate } = useSWR<ClientServiceSpecialist[]>(
    key,
    () =>
      clientServicesService.getSpecialists(
        tenantSlug as string,
        serviceId as string,
        branchId as string,
      ),
    { revalidateOnFocus: false, dedupingInterval: 30_000 },
  );

  return {
    specialists: data ?? [],
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

export function useClientAvailability(
  tenantSlug: string | null,
  serviceId: string | null,
  branchId: string | null,
  date: string | null,
  specialistId: string | null = null,
) {
  const key =
    tenantSlug && serviceId && branchId && date
      ? `client:availability:${tenantSlug}:${serviceId}:${branchId}:${date}:${specialistId ?? "any"}`
      : null;

  const { data, error, isLoading, mutate } = useSWR<ClientAvailabilityResponse>(
    key,
    () =>
      clientServicesService.getAvailability(
        tenantSlug as string,
        serviceId as string,
        branchId as string,
        date as string,
        specialistId,
      ),
    { revalidateOnFocus: false, dedupingInterval: 5_000 },
  );

  return {
    slots: data?.slots ?? [],
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}
