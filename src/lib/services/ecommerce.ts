import { createBrowserSB } from "@/lib/supabase/client";
import type { Database } from "@/types";

type TenantEcommerceSettingsRow =
  Database["public"]["Tables"]["tenant_ecommerce_settings"]["Row"];
type TenantEcommerceSettingsInsert =
  Database["public"]["Tables"]["tenant_ecommerce_settings"]["Insert"];
type TenantEcommerceSettingsUpdate =
  Database["public"]["Tables"]["tenant_ecommerce_settings"]["Update"];

type PublicStorefront =
  Database["public"]["Functions"]["get_public_ecommerce_storefront"]["Returns"][number];
type PublicProduct =
  Database["public"]["Functions"]["get_public_ecommerce_products"]["Returns"][number];
type PublicProductRow =
  Database["public"]["Views"]["v_ecommerce_products_public"]["Row"];
type PublicCategory =
  Database["public"]["Views"]["v_ecommerce_categories_public"]["Row"];

export type TenantEcommerceSettings = TenantEcommerceSettingsRow;
export type PublicEcommerceStorefront = PublicStorefront;
export type PublicEcommerceProduct = PublicProduct;
export type PublicEcommerceCategory = PublicCategory;

type UpsertTenantEcommerceSettings = Omit<
  TenantEcommerceSettingsInsert,
  "id" | "created_at" | "updated_at"
>;

function normalizePublicProduct(
  product: PublicProduct | PublicProductRow,
): PublicProduct {
  return {
    product_id: product.product_id ?? "",
    tenant_id: product.tenant_id ?? "",
    tenant_slug: product.tenant_slug ?? "",
    branch_id: product.branch_id ?? "",
    branch_name: product.branch_name ?? "",
    name: product.name ?? "",
    description: product.description ?? "",
    sku: product.sku ?? "",
    category: product.category ?? "",
    brand: product.brand ?? "",
    price: product.price ?? 0,
    currency_iso: product.currency_iso ?? "USD",
    images: product.images ?? [],
  };
}

class EcommerceService {
  private supabase = createBrowserSB();

  async getTenantEcommerceSettings(
    tenantId: string,
  ): Promise<TenantEcommerceSettings | null> {
    const { data, error } = await this.supabase
      .from("tenant_ecommerce_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async upsertTenantEcommerceSettings(
    data: UpsertTenantEcommerceSettings,
  ): Promise<TenantEcommerceSettings> {
    const payload: TenantEcommerceSettingsInsert = {
      ...data,
    };

    const { data: saved, error } = await this.supabase
      .from("tenant_ecommerce_settings")
      .upsert(payload, { onConflict: "tenant_id" })
      .select("*")
      .single();

    if (error) throw error;
    return saved;
  }

  async updateTenantEcommerceSettings(
    tenantId: string,
    data: TenantEcommerceSettingsUpdate,
  ): Promise<TenantEcommerceSettings> {
    const { data: saved, error } = await this.supabase
      .from("tenant_ecommerce_settings")
      .update(data)
      .eq("tenant_id", tenantId)
      .select("*")
      .single();

    if (error) throw error;
    return saved;
  }

  async getPublicStorefront(
    tenantSlug: string,
  ): Promise<PublicEcommerceStorefront | null> {
    const { data, error } = await this.supabase.rpc(
      "get_public_ecommerce_storefront",
      {
        p_tenant_slug: tenantSlug,
      },
    );

    if (error) throw error;
    return data?.[0] ?? null;
  }

  async getPublicProducts(
    tenantSlug: string,
    filters?: {
      search?: string;
      category?: string;
    },
  ): Promise<PublicEcommerceProduct[]> {
    const { data, error } = await this.supabase.rpc(
      "get_public_ecommerce_products",
      {
        p_tenant_slug: tenantSlug,
        p_search: filters?.search || undefined,
        p_category: filters?.category || undefined,
      },
    );

    if (error) throw error;
    return (data ?? []).map(normalizePublicProduct);
  }

  async getPublicProductById(
    tenantSlug: string,
    productId: string,
  ): Promise<PublicEcommerceProduct | null> {
    const { data, error } = await this.supabase
      .from("v_ecommerce_products_public")
      .select("*")
      .eq("tenant_slug", tenantSlug)
      .eq("product_id", productId)
      .maybeSingle();

    if (error) throw error;
    return data ? normalizePublicProduct(data) : null;
  }

  async getPublicCategories(tenantSlug: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from("v_ecommerce_categories_public")
      .select("category")
      .eq("tenant_slug", tenantSlug)
      .order("category", { ascending: true });

    if (error) throw error;

    return (data ?? [])
      .map((item) => item.category)
      .filter((value): value is string => Boolean(value));
  }

  async getPreviewProductsForTenant(
    tenantId: string,
    limit = 6,
  ): Promise<PublicEcommerceProduct[]> {
    const { data: rawProducts, error } = await this.supabase
      .from("products")
      .select(
        "id, tenant_id, branch_id, name, description, sku, category, brand, price, currency_iso, created_at, branch:branches(name)",
      )
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const products = rawProducts ?? [];
    const productIds = products.map((product) => product.id);

    const { data: images, error: imagesError } = productIds.length
      ? await this.supabase
          .from("product_images")
          .select("id, product_id, storage_path, thumbnail_path, is_primary, sort_order")
          .in("product_id", productIds)
          .order("is_primary", { ascending: false })
          .order("sort_order", { ascending: true })
      : { data: [], error: null };

    if (imagesError) throw imagesError;

    return products.map((product) =>
      normalizePublicProduct({
        product_id: product.id,
        tenant_id: product.tenant_id,
        tenant_slug: "",
        branch_id: product.branch_id,
        branch_name:
          ((product.branch as { name?: string } | null)?.name as string | undefined) ||
          "",
        name: product.name,
        description: product.description,
        sku: product.sku,
        category: product.category,
        brand: product.brand,
        price: product.price,
        currency_iso: product.currency_iso,
        images: (images ?? []).filter((image) => image.product_id === product.id),
      }),
    );
  }
}

export const ecommerceService = new EcommerceService();
