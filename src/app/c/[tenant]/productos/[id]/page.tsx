// src/app/c/[tenant]/productos/[id]/page.tsx
// Detalle de producto dentro de la app del cliente, estetica del prototipo:
// imagen full-bleed con back flotante y panel de informacion.
"use client";

import { ArrowLeft, Heart, Package } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ClientButton,
  ClientCard,
  displayStyle,
  useClientTheme,
} from "@/components/client/themed";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getPrimaryProductImage,
  parseProductImages,
  resolveProductImageUrl,
} from "@/features/ecommerce/utils";
import { useClientFavorites } from "@/hooks/supabase/use-client-profile";
import { usePublicEcommerceProducts } from "@/hooks/supabase/use-ecommerce";
import { clientProfileService } from "@/lib/services/client-profile";
import type { PublicEcommerceProduct } from "@/lib/services/ecommerce";
import { cn } from "@/lib/utils";
import { useClientCurrency } from "@/providers/client-currency-provider";
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
  const { isBarber } = useClientTheme();
  const { formatPrice } = useClientCurrency();
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
      <div className="mx-auto max-w-md space-y-4 px-5 py-6">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-5 py-10 text-center">
        <Package className="mx-auto h-10 w-10 text-[var(--client-fg-faint)]" />
        <h1
          className="text-xl font-semibold text-[var(--client-fg)]"
          style={displayStyle(isBarber)}
        >
          Producto no disponible
        </h1>
        <Link href={`/c/${tenantSlug}/productos`} className="inline-block">
          <ClientButton className="h-11">Volver a la tienda</ClientButton>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md pb-28">
      {/* Imagen full-bleed con acciones flotantes */}
      <div className="relative aspect-square">
        {imageUrl ? (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-[var(--client-surface-alt)]">
            <Package className="h-12 w-12 text-[var(--client-fg-faint)]" />
          </div>
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, transparent 70%, var(--client-bg) 100%)",
          }}
        />
        <Link
          href={`/c/${tenantSlug}/productos`}
          aria-label="Volver a la tienda"
          className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/95 text-black"
        >
          <ArrowLeft className="h-[18px] w-[18px]" />
        </Link>
        <button
          type="button"
          aria-label={favorite ? "Quitar de favoritos" : "Agregar a favoritos"}
          disabled={pending}
          onClick={toggleFavorite}
          className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/95 text-black disabled:opacity-60"
        >
          <Heart
            className={cn(
              "h-[18px] w-[18px]",
              favorite &&
                "fill-[var(--client-accent)] text-[var(--client-accent)]",
            )}
          />
        </button>
      </div>

      <div className="space-y-4 px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {product.category ? (
              <p className="text-[11.5px] font-semibold uppercase tracking-wider text-[var(--client-fg-muted)]">
                {product.category}
              </p>
            ) : null}
            <h1
              className="mt-1 text-[26px] font-semibold leading-[1.15] text-[var(--client-fg)]"
              style={displayStyle(isBarber)}
            >
              {product.name}
            </h1>
            {product.brand ? (
              <p className="mt-1.5 text-sm text-[var(--client-fg-muted)]">
                {product.brand}
              </p>
            ) : null}
          </div>
          <p
            className="shrink-0 text-[24px] font-bold leading-none tracking-tight text-[var(--client-fg)]"
            style={{ fontFamily: "var(--client-font-display)" }}
          >
            {formatPrice(product.price, product.currency_iso)}
          </p>
        </div>

        {product.description ? (
          <p className="text-sm leading-relaxed text-[var(--client-fg-muted)]">
            {product.description}
          </p>
        ) : null}

        <ClientCard className="overflow-hidden">
          {product.branch_name ? (
            <InfoRow label="Sucursal" value={product.branch_name} />
          ) : null}
          {product.sku ? (
            <InfoRow label="SKU" value={product.sku} last />
          ) : null}
          {!product.branch_name && !product.sku ? (
            <p className="px-4 py-3 text-sm text-[var(--client-fg-muted)]">
              Disponible en el local.
            </p>
          ) : null}
        </ClientCard>

        {images.length > 1 ? (
          <div className="grid grid-cols-4 gap-2">
            {images.slice(1).map((image) => {
              const url = resolveProductImageUrl(
                image.thumbnail_path || image.storage_path,
              );
              if (!url) return null;
              return (
                <div
                  key={image.id || image.storage_path}
                  className="aspect-square"
                  style={{
                    borderRadius: "var(--client-rad-md)",
                    backgroundImage: `url(${url})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
      style={
        last ? undefined : { borderBottom: "1px solid var(--client-border)" }
      }
    >
      <span className="text-[var(--client-fg-muted)]">{label}</span>
      <span className="text-right font-semibold text-[var(--client-fg)]">
        {value}
      </span>
    </div>
  );
}
