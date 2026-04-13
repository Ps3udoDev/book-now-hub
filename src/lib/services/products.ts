import { createBrowserSB } from "@/lib/supabase/client";

export type InventoryMovementType =
  | "entry"
  | "exit"
  | "adjustment"
  | "specialist_withdrawal";

export interface ProductCategory {
  id: string;
  tenant_id: string;
  name: string;
  icon: string | null;
  sort_order: number | null;
  created_at?: string | null;
}

export interface ProductImage {
  id: string;
  product_id: string;
  storage_path: string;
  thumbnail_path: string | null;
  is_primary: boolean | null;
  sort_order: number | null;
  created_at?: string | null;
}

export interface Product {
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
}

export interface ProductStockSummary {
  product_id: string;
  tenant_id: string;
  branch_id: string;
  product_name: string;
  sku: string | null;
  category: string | null;
  stock_quantity: number;
  min_stock_alert: number;
  total_entries: number;
  total_exits: number;
  total_adjustments: number;
  total_specialist_withdrawals: number;
  calculated_stock: number;
  is_low_stock: boolean;
}

export interface ProductWithRelations extends Product {
  images: ProductImage[];
  stock_summary: ProductStockSummary | null;
}

export interface CreateProductData {
  tenant_id: string;
  branch_id: string;
  name: string;
  description?: string | null;
  sku?: string | null;
  category?: string | null;
  brand?: string | null;
  price: number;
  currency_iso?: string;
  stock_quantity?: number;
  min_stock_alert?: number;
  is_active?: boolean;
}

export interface UpdateProductData {
  branch_id?: string;
  name?: string;
  description?: string | null;
  sku?: string | null;
  category?: string | null;
  brand?: string | null;
  price?: number;
  currency_iso?: string;
  min_stock_alert?: number;
  is_active?: boolean;
}

export interface ProductFilters {
  tenantId: string;
  branchId?: string;
  category?: string;
  search?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface PublicProductFilters {
  tenantId: string;
  category?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

class ProductsService {
  private supabase = createBrowserSB();

  private get db() {
    return this.supabase as any;
  }

  async getCategories(tenantId: string): Promise<ProductCategory[]> {
    const { data, error } = await this.db
      .from("product_categories")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getProducts(filters: ProductFilters): Promise<Product[]> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.db
      .from("products")
      .select("*", { count: "exact" })
      .eq("tenant_id", filters.tenantId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filters.branchId) {
      query = query.eq("branch_id", filters.branchId);
    }

    if (filters.category) {
      query = query.eq("category", filters.category);
    }

    if (filters.isActive !== undefined) {
      query = query.eq("is_active", filters.isActive);
    }

    if (filters.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`,
      );
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  async getPublicProducts(filters: PublicProductFilters): Promise<Product[]> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.db
      .from("products")
      .select("*")
      .eq("tenant_id", filters.tenantId)
      .eq("is_active", true)
      .order("name", { ascending: true })
      .range(from, to);

    if (filters.category) {
      query = query.eq("category", filters.category);
    }

    if (filters.search) {
      query = query.ilike("name", `%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  async getProductById(productId: string): Promise<ProductWithRelations | null> {
    const { data: product, error } = await this.db
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    const [{ data: images, error: imagesError }, { data: stockSummary, error: stockError }] =
      await Promise.all([
        this.db
          .from("product_images")
          .select("*")
          .eq("product_id", productId)
          .order("sort_order", { ascending: true }),
        this.db
          .from("v_product_stock_summary")
          .select("*")
          .eq("product_id", productId)
          .maybeSingle(),
      ]);

    if (imagesError) throw imagesError;
    if (stockError) throw stockError;

    return {
      ...product,
      images: images || [],
      stock_summary: stockSummary || null,
    };
  }

  async createProduct(data: CreateProductData): Promise<Product> {
    const { data: product, error } = await this.db
      .from("products")
      .insert({
        ...data,
        currency_iso: data.currency_iso ?? "USD",
        stock_quantity: data.stock_quantity ?? 0,
        min_stock_alert: data.min_stock_alert ?? 0,
        is_active: data.is_active ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    return product;
  }

  async updateProduct(productId: string, data: UpdateProductData): Promise<Product> {
    const { data: product, error } = await this.db
      .from("products")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId)
      .select()
      .single();

    if (error) throw error;
    return product;
  }

  async deactivateProduct(productId: string): Promise<void> {
    const { error } = await this.db
      .from("products")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId);

    if (error) throw error;
  }

  async addProductImage(data: {
    product_id: string;
    storage_path: string;
    thumbnail_path?: string | null;
    is_primary?: boolean;
    sort_order?: number;
  }): Promise<ProductImage> {
    const { data: image, error } = await this.db
      .from("product_images")
      .insert({
        ...data,
        is_primary: data.is_primary ?? false,
        sort_order: data.sort_order ?? 0,
      })
      .select()
      .single();

    if (error) throw error;
    return image;
  }

  async removeProductImage(imageId: string): Promise<void> {
    const { error } = await this.db.from("product_images").delete().eq("id", imageId);
    if (error) throw error;
  }

  async getLowStockAlerts(
    tenantId: string,
    branchId?: string,
  ): Promise<ProductStockSummary[]> {
    let query = this.db
      .from("v_low_stock_alerts")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("calculated_stock", { ascending: true });

    if (branchId) {
      query = query.eq("branch_id", branchId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
}

export const productsService = new ProductsService();
