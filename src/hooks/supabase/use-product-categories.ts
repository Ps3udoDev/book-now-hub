import useSWR from "swr";

export interface ProductCategoryApiItem {
  id: string;
  tenant_id: string;
  name: string;
  icon: string | null;
  sort_order: number | null;
  created_at?: string | null;
  product_count: number;
}

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: "include" });
  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.error || "Error al cargar categorías");
  }

  return json;
};

export function useProductCategories(tenantId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    tenantId ? `/api/product-categories?tenant_id=${tenantId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    },
  );

  return {
    categories: (data?.categories || []) as ProductCategoryApiItem[],
    isLoading,
    error: error?.message || null,
    mutate,
  };
}
