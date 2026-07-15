"use client";

import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  EcommerceCartSheet,
  EcommerceCatalogView,
} from "@/features/ecommerce/components/storefront";
import {
  selectTenantCartItems,
  useEcommerceCart,
} from "@/features/ecommerce/store/use-ecommerce-cart";
import type {
  PublicEcommerceProduct,
  PublicEcommerceStorefront,
} from "@/lib/services/ecommerce";

export default function PublicProductsPage() {
  const { tenant } = useParams<{ tenant: string }>();
  const [loading, setLoading] = useState(true);
  const [storefront, setStorefront] =
    useState<PublicEcommerceStorefront | null>(null);
  const [products, setProducts] = useState<PublicEcommerceProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [cartOpen, setCartOpen] = useState(false);

  const cartItems = useEcommerceCart(selectTenantCartItems(tenant));
  const addItem = useEcommerceCart((state) => state.addItem);
  const updateQuantity = useEcommerceCart((state) => state.updateQuantity);
  const removeItem = useEcommerceCart((state) => state.removeItem);
  const clearCart = useEcommerceCart((state) => state.clearCart);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tenant_slug: tenant });
      if (search) params.set("search", search);
      if (category !== "all") params.set("category", category);

      const response = await fetch(`/api/public/products?${params.toString()}`);
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "No se pudo cargar el catalogo");
      }

      setStorefront(json.storefront || null);
      setCategories(json.categories || []);
      setProducts(json.products || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [tenant, search, category]);

  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  );

  const handleAddToCart = (product: PublicEcommerceProduct) => {
    addItem(tenant, {
      productId: product.product_id,
      name: product.name,
      price: product.price,
      currency: product.currency_iso,
      branchName: product.branch_name,
    });
    setCartOpen(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!storefront) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <div>
          <p className="text-lg font-semibold">Storefront no disponible</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Este tenant aun no tiene ecommerce publico configurado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <EcommerceCatalogView
        tenantSlug={tenant}
        storefront={storefront}
        products={products}
        categories={categories}
        search={search}
        onSearchChange={setSearch}
        selectedCategory={category}
        onCategoryChange={setCategory}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
        onAddToCart={handleAddToCart}
      />
      <EcommerceCartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        storefront={storefront}
        items={cartItems}
        onUpdateQuantity={(productId, quantity) =>
          updateQuantity(tenant, productId, quantity)
        }
        onRemove={(productId) => removeItem(tenant, productId)}
        onClear={() => clearCart(tenant)}
      />
    </>
  );
}
