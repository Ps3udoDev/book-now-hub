// src/app/c/[tenant]/productos/page.tsx
// Tienda de productos del salon, fiel al prototipo: busqueda, chips de
// categoria y cards surface con favorito.
"use client";

import { Heart, Package, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ClientChip,
  ClientField,
  clientInputClass,
  displayStyle,
  ScreenHeader,
  useClientTheme,
} from "@/components/client/themed";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatMoney,
  getPrimaryProductImage,
  resolveProductImageUrl,
} from "@/features/ecommerce/utils";
import { useClientFavorites } from "@/hooks/supabase/use-client-profile";
import { usePublicEcommerceProducts } from "@/hooks/supabase/use-ecommerce";
import { clientProfileService } from "@/lib/services/client-profile";
import type { PublicEcommerceProduct } from "@/lib/services/ecommerce";
import { cn } from "@/lib/utils";
import { useClientTenant } from "@/providers/client-tenant-provider";

function getProductImageUrl(product: PublicEcommerceProduct) {
  const image = getPrimaryProductImage(product);
  return image
    ? resolveProductImageUrl(image.thumbnail_path || image.storage_path)
    : null;
}

export default function ClientProductsPage() {
  const { tenantSlug } = useClientTenant();
  const { isBarber } = useClientTheme();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [pendingFavorite, setPendingFavorite] = useState<string | null>(null);

  const { products, isLoading } = usePublicEcommerceProducts(tenantSlug, {
    search: search.trim() || undefined,
    category: category || undefined,
  });
  const { favorites, mutate } = useClientFavorites(tenantSlug);

  const categories = useMemo(() => {
    const values = new Set<string>();
    for (const product of products) {
      if (product.category) values.add(product.category);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const favoriteByProductId = useMemo(() => {
    const map = new Map<string, string>();
    for (const favorite of favorites) {
      if (favorite.entity_type === "product") {
        map.set(favorite.entity_id, favorite.id);
      }
    }
    return map;
  }, [favorites]);

  const toggleFavorite = async (productId: string) => {
    const favoriteId = favoriteByProductId.get(productId);
    setPendingFavorite(productId);
    try {
      if (favoriteId) {
        await clientProfileService.removeFavorite(tenantSlug, favoriteId);
        toast.success("Producto quitado de favoritos");
      } else {
        await clientProfileService.addFavorite(
          tenantSlug,
          "product",
          productId,
        );
        toast.success("Producto agregado a favoritos");
      }
      await mutate();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar favorito",
      );
    } finally {
      setPendingFavorite(null);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-4 px-5 pb-28 pt-4">
      <ScreenHeader title="Tienda" />

      <ClientField icon={<Search className="h-4 w-4" />}>
        <input
          placeholder="Buscar producto…"
          className={clientInputClass}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </ClientField>

      {categories.length > 0 ? (
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          <ClientChip active={!category} onClick={() => setCategory(null)}>
            Todos
          </ClientChip>
          {categories.map((current) => (
            <ClientChip
              key={current}
              active={category === current}
              onClick={() => setCategory(current)}
            >
              {current}
            </ClientChip>
          ))}
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {["a", "b", "c", "d"].map((key) => (
            <Skeleton key={key} className="h-60 rounded-2xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div
          className="border border-dashed border-[var(--client-border)] py-12 text-center"
          style={{ borderRadius: "var(--client-rad-lg)" }}
        >
          <Package className="mx-auto h-9 w-9 text-[var(--client-fg-faint)]" />
          <p className="mt-3 text-sm text-[var(--client-fg-muted)]">
            No hay productos disponibles.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {products.map((product) => {
            const productId = product.product_id;
            const imageUrl = getProductImageUrl(product);
            const isFavorite = favoriteByProductId.has(productId);

            return (
              <div
                key={productId}
                className="overflow-hidden border border-[var(--client-border)] bg-[var(--client-surface)] shadow-[var(--client-shadow-soft)]"
                style={{ borderRadius: "var(--client-rad-lg)" }}
              >
                <Link
                  href={`/c/${tenantSlug}/productos/${productId}`}
                  className="relative block"
                >
                  {imageUrl ? (
                    <div
                      className="aspect-square w-full"
                      style={{
                        backgroundImage: `url(${imageUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    />
                  ) : (
                    <div className="grid aspect-square w-full place-items-center bg-[var(--client-surface-alt)]">
                      <Package className="h-9 w-9 text-[var(--client-fg-faint)]" />
                    </div>
                  )}
                  {product.category ? (
                    <span className="absolute left-2.5 top-2.5 rounded-full bg-[var(--client-accent)] px-2 py-0.5 text-[10px] font-bold text-[var(--client-accent-fg)]">
                      {product.category}
                    </span>
                  ) : null}
                </Link>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/c/${tenantSlug}/productos/${productId}`}
                      className="min-w-0"
                    >
                      <p
                        className="line-clamp-2 min-h-[36px] text-[14px] font-medium leading-tight text-[var(--client-fg)]"
                        style={displayStyle(isBarber)}
                      >
                        {product.name}
                      </p>
                      {product.brand ? (
                        <p className="mt-0.5 text-[11px] text-[var(--client-fg-muted)]">
                          {product.brand}
                        </p>
                      ) : null}
                    </Link>
                    <button
                      type="button"
                      aria-label={
                        isFavorite
                          ? "Quitar de favoritos"
                          : "Agregar a favoritos"
                      }
                      disabled={pendingFavorite === productId}
                      onClick={() => toggleFavorite(productId)}
                      className="shrink-0 p-1 text-[var(--client-fg-muted)] disabled:opacity-50"
                    >
                      <Heart
                        className={cn(
                          "h-[18px] w-[18px]",
                          isFavorite &&
                            "fill-[var(--client-accent)] text-[var(--client-accent)]",
                        )}
                      />
                    </button>
                  </div>
                  <p className="mt-1.5 text-[15px] font-bold text-[var(--client-fg)]">
                    {formatMoney(product.price, product.currency_iso)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
