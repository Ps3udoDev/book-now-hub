// src/app/c/[tenant]/productos/[id]/page.tsx
// Detalle de producto visible dentro de la app del cliente.
"use client";

import { ArrowLeft, Heart, Package } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatMoney,
  getPrimaryProductImage,
  parseProductImages,
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
    ? resolveProductImageUrl(image.storage_path || image.thumbnail_path)
    : null;
}

export default function ClientProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;
  const { tenantSlug } = useClientTenant();
  const [pending, setPending] = useState(false);

  const { products, isLoading } = usePublicEcommerceProducts(tenantSlug);
  const { favorites, mutate } = useClientFavorites(tenantSlug);

  const product =
    products.find((item) => item.product_id === productId) ?? null;
  const favorite = favorites.find(
    (item) => item.entity_type === "product" && item.entity_id === productId,
  );

  const images = useMemo(
    () => (product ? parseProductImages(product.images) : []),
    [product],
  );
  const imageUrl = product ? getProductImageUrl(product) : null;

  const toggleFavorite = async () => {
    setPending(true);
    try {
      if (favorite) {
        await clientProfileService.removeFavorite(tenantSlug, favorite.id);
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
      setPending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="aspect-[4/3] w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 text-center">
        <Package className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Producto no disponible</h1>
        <Button asChild>
          <Link href={`/c/${tenantSlug}/productos`}>Volver a productos</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 pb-24">
      <Link
        href={`/c/${tenantSlug}/productos`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Productos
      </Link>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              className="aspect-[4/3] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center bg-muted">
              <Package className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          <div className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold leading-tight">
                  {product.name}
                </h1>
                <div className="mt-2 flex flex-wrap gap-2">
                  {product.brand ? (
                    <Badge variant="secondary">{product.brand}</Badge>
                  ) : null}
                  {product.category ? (
                    <Badge variant="outline">{product.category}</Badge>
                  ) : null}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={
                  favorite ? "Quitar de favoritos" : "Agregar a favoritos"
                }
                disabled={pending}
                onClick={toggleFavorite}
              >
                <Heart
                  className={cn(
                    "h-5 w-5",
                    favorite && "fill-primary text-primary",
                  )}
                />
              </Button>
            </div>

            <p className="text-2xl font-semibold text-primary">
              {formatMoney(product.price, product.currency_iso)}
            </p>

            {product.description ? (
              <p className="text-sm leading-6 text-muted-foreground">
                {product.description}
              </p>
            ) : null}

            <div className="grid gap-2 text-sm">
              {product.branch_name ? (
                <InfoRow label="Sucursal" value={product.branch_name} />
              ) : null}
              {product.sku ? <InfoRow label="SKU" value={product.sku} /> : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {images.length > 1 ? (
        <div className="grid grid-cols-4 gap-2">
          {images.slice(1).map((image) => {
            const url = resolveProductImageUrl(
              image.thumbnail_path || image.storage_path,
            );
            if (!url) return null;
            return (
              <img
                key={image.id || image.storage_path}
                src={url}
                alt={product.name}
                className="aspect-square rounded-md object-cover"
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
