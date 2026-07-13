"use client";

import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  EcommerceCartSheet,
  EcommerceProductDetailView,
} from "@/features/ecommerce/components/storefront";
import {
  selectTenantCartItems,
  useEcommerceCart,
} from "@/features/ecommerce/store/use-ecommerce-cart";
import type {
  PublicEcommerceProduct,
  PublicEcommerceStorefront,
} from "@/lib/services/ecommerce";

export default function PublicProductDetailPage() {
  const { tenant, id } = useParams<{ tenant: string; id: string }>();
  const [loading, setLoading] = useState(true);
  const [storefront, setStorefront] =
    useState<PublicEcommerceStorefront | null>(null);
  const [product, setProduct] = useState<PublicEcommerceProduct | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  const cartItems = useEcommerceCart(selectTenantCartItems(tenant));
  const addItem = useEcommerceCart((state) => state.addItem);
  const updateQuantity = useEcommerceCart((state) => state.updateQuantity);
  const removeItem = useEcommerceCart((state) => state.removeItem);
  const clearCart = useEcommerceCart((state) => state.clearCart);

  useEffect(() => {
    const loadProduct = async () => {
      setLoading(true);
      const response = await fetch(
        `/api/public/products/${id}?tenant_slug=${tenant}`,
      );
      const json = await response.json();

      if (response.ok) {
        setStorefront(json.storefront || null);
        setProduct(json.product || null);
      }

      setLoading(false);
    };

    loadProduct();
  }, [tenant, id]);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleAddToCart = (currentProduct: PublicEcommerceProduct) => {
    addItem(tenant, {
      productId: currentProduct.product_id,
      name: currentProduct.name,
      price: currentProduct.price,
      currency: currentProduct.currency_iso,
      branchName: currentProduct.branch_name,
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

  if (!product || !storefront) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 text-center">
        <div>
          <h1 className="text-xl font-semibold">Producto no disponible</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            El producto solicitado no existe, ya no esta activo o la tienda no
            es publica.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <EcommerceProductDetailView
        tenantSlug={tenant}
        storefront={storefront}
        product={product}
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
