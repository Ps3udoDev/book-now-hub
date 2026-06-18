"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  ProductForm,
  type ProductFormValues,
  ProductImageUploader,
} from "@/components/inventory";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBranches } from "@/hooks/supabase/use-branches";
import { useProductCategories } from "@/hooks/supabase/use-product-categories";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
  type ProductImageDraft,
  uploadDraftProductImages,
} from "@/lib/utils/product-image-upload";

export default function NewInventoryProductPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenant as string;
  const { tenant } = useAuthStore();
  const { branches, isLoading } = useBranches(tenant?.id || null);
  const { categories } = useProductCategories(tenant?.id || null);
  const [images, setImages] = useState<ProductImageDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (values: ProductFormValues) => {
    if (!tenant?.id) {
      toast.error("No se pudo identificar el tenant");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          tenant_id: tenant.id,
          ...values,
        }),
      });
      const json = await response.json();

      if (!response.ok) {
        toast.error(json.error || "No se pudo crear el producto");
        throw new Error(json.error || "No se pudo crear el producto");
      }

      if (images.length > 0) {
        const persisted = await uploadDraftProductImages({
          tenantId: tenant.id,
          productId: json.product.id,
          drafts: images,
        });

        const orderedImages = images
          .map((image, index) => {
            const saved = persisted.get(image.client_id);
            if (!saved) return null;

            return {
              id: saved.id,
              is_primary: index === 0,
              sort_order: index,
            };
          })
          .filter(Boolean);

        if (orderedImages.length) {
          await fetch(`/api/products/${json.product.id}/images`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ images: orderedImages }),
          });
        }
      }

      toast.success("Producto creado");
      router.push(`/t/${tenantSlug}/inventory/${json.product.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/t/${tenantSlug}/inventory`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nuevo producto</h1>
          <p className="text-muted-foreground">
            Registra un producto para el módulo de inventario.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del producto</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm
            branches={branches}
            categories={categories.map((category) => category.name)}
            loading={isLoading || saving}
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
    </div>
  );
}
