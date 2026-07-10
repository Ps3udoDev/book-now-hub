"use client";

import {
  ChevronLeft,
  ChevronRight,
  Package,
  Pencil,
  Power,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ProductApiItem } from "@/hooks/supabase/use-products";
import { storageService } from "@/lib/services/storage";

interface ProductCardProps {
  product: ProductApiItem;
  onEdit: (product: ProductApiItem) => void;
  onToggleActive: (product: ProductApiItem) => void;
  onDelete: (product: ProductApiItem) => void;
}

export function ProductCard({
  product,
  onEdit,
  onToggleActive,
  onDelete,
}: ProductCardProps) {
  const currentStock =
    product.stock_summary?.calculated_stock ?? product.stock_quantity;
  const lowStock = currentStock <= product.min_stock_alert;
  const imageUrls = useMemo(
    () =>
      (product.images || []).map((image) =>
        storageService.getPublicUrl(
          image.thumbnail_path || image.storage_path,
          "product-images",
        ),
      ),
    [product.images],
  );
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const imageUrl = imageUrls[currentImageIndex] || null;
  const hasMultipleImages = imageUrls.length > 1;

  const goToPrevious = () => {
    setCurrentImageIndex((current) =>
      current === 0 ? imageUrls.length - 1 : current - 1,
    );
  };

  const goToNext = () => {
    setCurrentImageIndex((current) =>
      current === imageUrls.length - 1 ? 0 : current + 1,
    );
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex h-[420px] flex-col">
        <div className="relative flex-[0_0_80%] bg-muted/20">
          <div className="absolute left-3 top-3 z-10 flex flex-col items-start gap-2">
            <Badge variant={product.is_active ? "default" : "outline"}>
              {product.is_active ? "Activo" : "Inactivo"}
            </Badge>
            {lowStock && <Badge variant="destructive">Stock bajo</Badge>}
          </div>
          {hasMultipleImages && (
            <>
              <button
                type="button"
                onClick={goToPrevious}
                className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 shadow-sm transition hover:bg-background"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={goToNext}
                className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 shadow-sm transition hover:bg-background"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
          <div className="flex h-full w-full items-center justify-center p-6">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={product.name}
                className="max-h-full max-w-full rounded-lg object-contain"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed bg-muted">
                <Package className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>
          {hasMultipleImages && (
            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-background/80 px-2 py-1">
              {imageUrls.map((url, index) => (
                <button
                  key={`${product.id}-${url}`}
                  type="button"
                  onClick={() => setCurrentImageIndex(index)}
                  className={`h-2 w-2 rounded-full transition ${
                    index === currentImageIndex
                      ? "bg-primary"
                      : "bg-muted-foreground/40"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-[0_0_20%] flex-col justify-between">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="line-clamp-1 text-base">
              {product.name}
            </CardTitle>
            <p className="line-clamp-1 text-sm text-muted-foreground">
              {product.brand || product.category || "Sin categoría"}
            </p>
          </CardHeader>
          <CardContent className="space-y-2 py-0 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Precio</span>
              <span>
                {product.currency_iso} {Number(product.price).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Stock</span>
              <span>{currentStock}</span>
            </div>
          </CardContent>
        </div>
      </div>
      <CardFooter className="flex items-center justify-between gap-2 border-t pt-4">
        <Button variant="outline" size="sm" onClick={() => onEdit(product)}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onToggleActive(product)}
          >
            <Power className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onDelete(product)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
