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

export interface UseProductsFilters {
  branchId?: string | null;
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  isActive?: boolean;
}

export interface ProductsPagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export function useProducts(
  tenantId: string | null,
  filters?: UseProductsFilters,
) {
  const params = new URLSearchParams();
  if (tenantId) params.set("tenant_id", tenantId);
  if (filters?.branchId) params.set("branch_id", filters.branchId);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.pageSize) params.set("page_size", String(filters.pageSize));
  if (filters?.search) params.set("search", filters.search);
  if (filters?.category) params.set("category", filters.category);
  if (filters?.isActive !== undefined) {
    params.set("is_active", String(filters.isActive));
  }

  const query = tenantId ? `/api/products?${params.toString()}` : null;

  const { data, error, isLoading, mutate } = useSWR(query, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });

  const rawPagination = data?.pagination as
    | { page: number; page_size: number; total: number }
    | undefined;

  const pagination: ProductsPagination | null = rawPagination
    ? {
        ...rawPagination,
        total_pages: Math.max(
          1,
          Math.ceil(rawPagination.total / rawPagination.page_size),
        ),
      }
    : null;

  return {
    products: (data?.products || []) as ProductApiItem[],
    pagination,
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
