// src/hooks/supabase/use-menu.ts
import useSWR from "swr";
import type {
  MenuCategoryWithItems,
  MenuItemWithImages,
} from "@/lib/services/menu";
import { menuService } from "@/lib/services/menu";
import type { MenuCategory } from "@/types";

/**
 * Categorias del menu para gestion/admin.
 */
export function useMenuCategories(
  tenantId: string | null,
  branchId?: string | null,
) {
  const { data, error, isLoading, mutate } = useSWR<MenuCategory[]>(
    tenantId ? `menu:categories:${tenantId}:${branchId ?? "all"}` : null,
    () => (tenantId ? menuService.getCategories(tenantId, branchId) : []),
    { revalidateOnFocus: false, dedupingInterval: 15000 },
  );

  return {
    categories: data || [],
    isLoading,
    error: error?.message || null,
    mutate,
  };
}

/**
 * Menu publico (agrupado) para clientes y especialistas.
 * Solo items disponibles + activos.
 */
export function usePublicMenu(
  tenantId: string | null,
  branchId: string | null,
) {
  const { data, error, isLoading, mutate } = useSWR<MenuCategoryWithItems[]>(
    tenantId && branchId ? `menu:public:${tenantId}:${branchId}` : null,
    () =>
      tenantId && branchId ? menuService.getPublicMenu(tenantId, branchId) : [],
    { revalidateOnFocus: false, dedupingInterval: 15000 },
  );

  return {
    menu: data || [],
    isLoading,
    error: error?.message || null,
    mutate,
  };
}

/**
 * Menu completo (incluye no disponibles/inactivos) para admin.
 */
export function useFullMenu(tenantId: string | null, branchId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<MenuItemWithImages[]>(
    tenantId && branchId ? `menu:full:${tenantId}:${branchId}` : null,
    () =>
      tenantId && branchId ? menuService.getFullMenu(tenantId, branchId) : [],
    { revalidateOnFocus: false, dedupingInterval: 15000 },
  );

  return {
    items: data || [],
    isLoading,
    error: error?.message || null,
    mutate,
  };
}

/**
 * Detalle de un item del menu.
 */
export function useMenuItem(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<MenuItemWithImages | null>(
    id ? `menu:item:${id}` : null,
    () => (id ? menuService.getItem(id) : null),
    { revalidateOnFocus: false, dedupingInterval: 15000 },
  );

  return {
    item: data || null,
    isLoading,
    error: error?.message || null,
    mutate,
  };
}
