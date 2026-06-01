// src/app/c/[tenant]/productos/page.tsx
// Catalogo de productos del salon para clientes autenticados.
"use client";

import { ArrowLeft, Heart, Package, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 pb-24">
      <header className="space-y-3">
        <Link
          href={`/c/${tenantSlug}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Inicio
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Productos</h1>
          <p className="text-sm text-muted-foreground">
            Cuidados y productos disponibles en el salon.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar producto..."
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {categories.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Button
              type="button"
              size="sm"
              variant={category ? "outline" : "default"}
              onClick={() => setCategory(null)}
            >
              Todos
            </Button>
            {categories.map((current) => (
              <Button
                type="button"
                key={current}
                size="sm"
                variant={category === current ? "default" : "outline"}
                onClick={() => setCategory(current)}
              >
                {current}
              </Button>
            ))}
          </div>
        ) : null}
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {["a", "b", "c", "d"].map((key) => (
            <Skeleton key={key} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border py-12 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No hay productos disponibles.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {products.map((product) => {
            const productId = product.product_id;
            const imageUrl = getProductImageUrl(product);
            const isFavorite = favoriteByProductId.has(productId);

            return (
              <Card key={productId} className="overflow-hidden">
                <Link href={`/c/${tenantSlug}/productos/${productId}`}>
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="aspect-[4/3] w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] w-full items-center justify-center bg-muted">
                      <Package className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                </Link>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/c/${tenantSlug}/productos/${productId}`}
                      className="min-w-0"
                    >
                      <h2 className="line-clamp-2 font-semibold leading-tight">
                        {product.name}
                      </h2>
                      {product.brand ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {product.brand}
                        </p>
                      ) : null}
                    </Link>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={
                        isFavorite
                          ? "Quitar de favoritos"
                          : "Agregar a favoritos"
                      }
                      disabled={pendingFavorite === productId}
                      onClick={() => toggleFavorite(productId)}
                    >
                      <Heart
                        className={cn(
                          "h-5 w-5",
                          isFavorite && "fill-primary text-primary",
                        )}
                      />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-primary">
                      {formatMoney(product.price, product.currency_iso)}
                    </span>
                    {product.category ? (
                      <Badge variant="secondary">{product.category}</Badge>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
