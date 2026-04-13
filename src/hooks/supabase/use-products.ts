import useSWR from "swr";

export interface ProductApiItem {
  id: string;
  tenant_id: string;
  branch_id: string;
  name: string;
  description: string | null;
  sku: string | null;
  category: string | null;
  brand: string | null;
  price: number;
  currency_iso: string;
  stock_quantity: number;
  min_stock_alert: number;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  primary_image?: {
    id: string;
    storage_path: string;
    thumbnail_path: string | null;
    is_primary: boolean | null;
    sort_order: number | null;
  } | null;
  images?: Array<{
    id: string;
    storage_path: string;
    thumbnail_path: string | null;
    is_primary: boolean | null;
    sort_order: number | null;
  }>;
  stock_summary?: {
    calculated_stock: number;
    is_low_stock: boolean;
  } | null;
}

export interface ProductDetailsApiItem extends ProductApiItem {
  images: Array<{
    id: string;
    storage_path: string;
    thumbnail_path: string | null;
    is_primary: boolean | null;
    sort_order: number | null;
  }>;
  stock_summary: {
    calculated_stock: number;
    is_low_stock: boolean;
  } | null;
}

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: "include" });
  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.error || "Error al cargar productos");
  }

  return json;
};

export function useProducts(tenantId: string | null, branchId?: string | null) {
  const query = tenantId
    ? `/api/products?tenant_id=${tenantId}${branchId ? `&branch_id=${branchId}` : ""}`
    : null;

  const { data, error, isLoading, mutate } = useSWR(query, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });

  return {
    products: (data?.products || []) as ProductApiItem[],
    pagination: data?.pagination || null,
    isLoading,
    error: error?.message || null,
    mutate,
  };
}

export function useProduct(productId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    productId ? `/api/products/${productId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    },
  );

  return {
    product: (data?.product || null) as ProductDetailsApiItem | null,
    isLoading,
    error: error?.message || null,
    mutate,
  };
}
