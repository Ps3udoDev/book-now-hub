import useSWR from "swr";
import {
  clientAppSettingsService,
  type PublicClientAppSettings,
  type TenantClientAppSettings,
} from "@/lib/services/client-app-settings";

export function useTenantClientAppSettings(tenantId: string | null) {
  const { data, error, isLoading, mutate } =
    useSWR<TenantClientAppSettings | null>(
      tenantId ? `tenant:client-app-settings:${tenantId}` : null,
      () =>
        tenantId ? clientAppSettingsService.getTenantSettings(tenantId) : null,
      { revalidateOnFocus: false, dedupingInterval: 30_000 },
    );

  return {
    settings: data ?? null,
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

export function usePublicClientAppSettings(tenantSlug: string | null) {
  const { data, error, isLoading, mutate } =
    useSWR<PublicClientAppSettings | null>(
      tenantSlug ? `public:client-app-settings:${tenantSlug}` : null,
      () =>
        tenantSlug
          ? clientAppSettingsService.getPublicSettings(tenantSlug)
          : null,
      { revalidateOnFocus: false, dedupingInterval: 30_000 },
    );

  return {
    settings: data ?? null,
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}
