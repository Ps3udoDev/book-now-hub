"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  ProductForm,
  ProductImageUploader,
  type ProductFormValues,
} from "@/components/inventory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBranches } from "@/hooks/supabase/use-branches";
import { useProduct } from "@/hooks/supabase/use-products";
import { storageService } from "@/lib/services/storage";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
  type ProductImageDraft,
  uploadDraftProductImages,
} from "@/lib/utils/product-image-upload";

export default function InventoryProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenant as string;
  const productId = params.id as string;
  const { tenant } = useAuthStore();
  const { branches } = useBranches(tenant?.id || null);
  const { product, isLoading, error, mutate } = useProduct(productId);
  const [images, setImages] = useState<ProductImageDraft[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!product) return;

    setImages(
      (product.images || []).map((image) => ({
        client_id: image.id,
        id: image.id,
        preview_url: storageService.getPublicUrl(
          image.thumbnail_path || image.storage_path,
          "product-images",
        ),
        storage_path: image.storage_path,
        thumbnail_path: image.thumbnail_path,
        is_existing: true,
      })),
    );
  }, [product]);

  const handleSubmit = async (values: ProductFormValues) => {
    setSaving(true);

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });
      const json = await response.json();

      if (!response.ok) {
        toast.error(json.error || "No se pudo actualizar el producto");
        throw new Error(json.error || "No se pudo actualizar el producto");
      }

      const existingIds = new Set((product?.images || []).map((image) => image.id));
      const keptExistingIds = new Set(
        images.filter((image) => image.id).map((image) => image.id as string),
      );
      const deletedIds = Array.from(existingIds).filter((id) => !keptExistingIds.has(id));

      for (const imageId of deletedIds) {
        await fetch(`/api/products/${productId}/images/${imageId}`, {
          method: "DELETE",
          credentials: "include",
        });
      }

      const persistedNewImages = tenant?.id
        ? await uploadDraftProductImages({
            tenantId: tenant.id,
            productId,
            drafts: images.filter((image) => !image.is_existing),
          })
        : new Map();

      const orderedImages = images
        .map((image, index) => {
          const persisted =
            (image.id &&
              (product?.images || []).find((currentImage) => currentImage.id === image.id)) ||
            persistedNewImages.get(image.client_id);

          if (!persisted) return null;

          return {
            id: persisted.id,
            is_primary: index === 0,
            sort_order: index,
          };
        })
        .filter(Boolean);

      if (orderedImages.length) {
        await fetch(`/api/products/${productId}/images`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ images: orderedImages }),
        });
      }

      toast.success("Producto actualizado");
      await mutate();
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/t/${tenantSlug}/inventory`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Producto no encontrado</h1>
          </div>
        </div>
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
          {error || "No fue posible cargar el producto"}
        </div>
      </div>
    );
  }

  const productFormData: Partial<ProductFormValues> = {
    branch_id: product.branch_id,
    name: product.name,
    description: product.description ?? "",
    sku: product.sku ?? "",
    category: product.category ?? "",
    brand: product.brand ?? "",
    price: product.price,
    currency_iso: product.currency_iso,
    stock_quantity: product.stock_quantity,
    min_stock_alert: product.min_stock_alert,
    is_active: product.is_active,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/t/${tenantSlug}/inventory`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Editar producto</h1>
          <p className="text-muted-foreground">{product.name}</p>
        </div>
        {!product.is_active && <Badge variant="outline">Inactivo</Badge>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del producto</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm
            branches={branches}
            product={productFormData}
            loading={saving}
            onSubmit={handleSubmit}
            onCancel={() => router.push(`/t/${tenantSlug}/inventory`)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Imágenes del producto</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductImageUploader images={images} onChange={setImages} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumen de stock</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Stock actual</p>
            <p className="text-2xl font-bold">
              {product.stock_summary?.calculated_stock ?? product.stock_quantity}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Alerta mínima</p>
            <p className="text-2xl font-bold">{product.min_stock_alert}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Estado</p>
            <p className="text-2xl font-bold">
              {product.stock_summary?.is_low_stock ? "Bajo" : "OK"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
