import useSWR from "swr";
import { ecommerceService } from "@/lib/services/ecommerce";

export function useTenantEcommerceSettings(tenantId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    tenantId ? `tenant:ecommerce:${tenantId}` : null,
    () =>
      tenantId ? ecommerceService.getTenantEcommerceSettings(tenantId) : null,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    },
  );

  return {
    settings: data,
    isLoading,
    error: error?.message || null,
    mutate,
  };
}

export function usePublicEcommerceStorefront(tenantSlug: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    tenantSlug ? `public:ecommerce:storefront:${tenantSlug}` : null,
    () =>
      tenantSlug ? ecommerceService.getPublicStorefront(tenantSlug) : null,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    },
  );

  return {
    storefront: data,
    isLoading,
    error: error?.message || null,
    mutate,
  };
}

export function usePublicEcommerceProducts(
  tenantSlug: string | null,
  filters?: {
    search?: string;
    category?: string;
  },
) {
  const key = tenantSlug
    ? [
        "public:ecommerce:products",
        tenantSlug,
        filters?.search ?? "",
        filters?.category ?? "",
      ]
    : null;

  const { data, error, isLoading, mutate } = useSWR(
    key,
    () => (tenantSlug ? ecommerceService.getPublicProducts(tenantSlug, filters) : []),
    {
      revalidateOnFocus: false,
      dedupingInterval: 15000,
    },
  );

  return {
    products: data ?? [],
    isLoading,
    error: error?.message || null,
    mutate,
  };
}
