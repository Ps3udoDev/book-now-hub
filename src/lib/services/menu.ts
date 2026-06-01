// src/lib/services/menu.ts
// Menu de cafeteria: categorias, items y helpers. Las escrituras van
// por API routes para usar supabaseAdmin y bypassar RLS.
import { createBrowserSB } from "@/lib/supabase/client";
import type { MenuCategory, MenuItem, MenuItemImage } from "@/types";

export interface MenuItemWithImages extends MenuItem {
  images: MenuItemImage[];
}

export interface MenuCategoryWithItems extends MenuCategory {
  items: MenuItemWithImages[];
}

export interface CreateCategoryData {
  tenant_id: string;
  branch_id?: string | null;
  name: string;
  icon?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateCategoryData {
  name?: string;
  icon?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export interface CreateMenuItemData {
  tenant_id: string;
  branch_id: string;
  category_id?: string | null;
  name: string;
  description?: string | null;
  price: number;
  currency_iso?: string;
  preparation_time_minutes?: number;
  is_available?: boolean;
  image?: {
    storage_path: string;
    thumbnail_path?: string | null;
    is_primary?: boolean;
  } | null;
}

export interface UpdateMenuItemData {
  category_id?: string | null;
  name?: string;
  description?: string | null;
  price?: number;
  currency_iso?: string;
  preparation_time_minutes?: number;
  is_available?: boolean;
  is_active?: boolean;
  image?: {
    storage_path: string;
    thumbnail_path?: string | null;
    is_primary?: boolean;
  } | null;
}

const MENU_ITEM_WITH_IMAGES = `
  *,
  images:menu_item_images(*)
` as const;

class MenuService {
  private supabase = createBrowserSB();

  // ==================== CATEGORIAS ====================

  async getCategories(
    tenantId: string,
    branchId?: string | null,
  ): Promise<MenuCategory[]> {
    let query = this.supabase
      .from("menu_categories")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (branchId) {
      // Incluye categorias tenant-wide (branch_id IS NULL) + las de esta sucursal
      query = query.or(`branch_id.is.null,branch_id.eq.${branchId}`);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Error al obtener categorias: ${error.message}`);
    return (data as unknown as MenuCategory[]) || [];
  }

  async createCategory(data: CreateCategoryData): Promise<MenuCategory> {
    const res = await fetch("/api/cafe/menu/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error al crear categoria");
    return json.category;
  }

  async updateCategory(
    id: string,
    data: UpdateCategoryData,
  ): Promise<MenuCategory> {
    const res = await fetch(`/api/cafe/menu/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error al actualizar categoria");
    return json.category;
  }

  async deleteCategory(id: string): Promise<void> {
    const res = await fetch(`/api/cafe/menu/categories/${id}`, {
      method: "DELETE",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Error al eliminar categoria");
  }

  // ==================== MENU COMPLETO ====================

  // Menu agrupado por categoria, SOLO items disponibles + activos.
  // Pensado para la app del cliente y especialista.
  async getPublicMenu(
    tenantId: string,
    branchId: string,
  ): Promise<MenuCategoryWithItems[]> {
    const [categories, itemsRaw] = await Promise.all([
      this.getCategories(tenantId, branchId),
      this.supabase
        .from("menu_items")
        .select(MENU_ITEM_WITH_IMAGES)
        .eq("tenant_id", tenantId)
        .eq("branch_id", branchId)
        .eq("is_available", true)
        .eq("is_active", true)
        .order("name", { ascending: true }),
    ]);

    if (itemsRaw.error)
      throw new Error(`Error al obtener menu: ${itemsRaw.error.message}`);

    const items = (itemsRaw.data as unknown as MenuItemWithImages[]) || [];

    // Agrupar por categoria. Items sin categoria van a un grupo "Otros" ficticio
    const byCategory = new Map<string, MenuItemWithImages[]>();
    for (const it of items) {
      const key = it.category_id ?? "__no_category__";
      const bucket = byCategory.get(key) ?? [];
      bucket.push(it);
      byCategory.set(key, bucket);
    }

    const grouped: MenuCategoryWithItems[] = categories.map((cat) => ({
      ...cat,
      items: byCategory.get(cat.id) ?? [],
    }));

    // Si hay items sin categoria, los anexamos como grupo sintetico al final
    const orphan = byCategory.get("__no_category__");
    if (orphan && orphan.length > 0) {
      grouped.push({
        id: "__no_category__",
        tenant_id: tenantId,
        branch_id: branchId,
        name: "Otros",
        icon: null,
        sort_order: 9999,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: orphan,
      });
    }

    return grouped.filter((g) => g.items.length > 0);
  }

  // Menu completo (admin) incluye items no disponibles / no activos
  async getFullMenu(
    tenantId: string,
    branchId: string,
  ): Promise<MenuItemWithImages[]> {
    const { data, error } = await this.supabase
      .from("menu_items")
      .select(MENU_ITEM_WITH_IMAGES)
      .eq("tenant_id", tenantId)
      .eq("branch_id", branchId)
      .order("name", { ascending: true });

    if (error) throw new Error(`Error al obtener menu: ${error.message}`);
    return (data as unknown as MenuItemWithImages[]) || [];
  }

  // ==================== ITEMS ====================

  async getItem(id: string): Promise<MenuItemWithImages | null> {
    const { data, error } = await this.supabase
      .from("menu_items")
      .select(MENU_ITEM_WITH_IMAGES)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Error al obtener item: ${error.message}`);
    }
    return data as unknown as MenuItemWithImages;
  }

  async createItem(data: CreateMenuItemData): Promise<MenuItem> {
    const res = await fetch("/api/cafe/menu/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error al crear item");
    return json.item;
  }

  async updateItem(id: string, data: UpdateMenuItemData): Promise<MenuItem> {
    const res = await fetch(`/api/cafe/menu/items/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error al actualizar item");
    return json.item;
  }

  async deleteItem(id: string): Promise<void> {
    const res = await fetch(`/api/cafe/menu/items/${id}`, {
      method: "DELETE",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Error al eliminar item");
  }

  // Toggle rapido de disponibilidad (sin abrir modal)
  async toggleAvailability(
    id: string,
    isAvailable: boolean,
  ): Promise<MenuItem> {
    const res = await fetch(`/api/cafe/menu/items/${id}/availability`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_available: isAvailable }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error al actualizar");
    return json.item;
  }
}

export const menuService = new MenuService();
