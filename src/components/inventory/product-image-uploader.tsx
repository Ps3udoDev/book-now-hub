"use client";

import { useRef } from "react";
import { GripVertical, ImagePlus, Star, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProductImageDraft } from "@/lib/utils/product-image-upload";

interface ProductImageUploaderProps {
  images: ProductImageDraft[];
  onChange: (images: ProductImageDraft[]) => void;
}

export function ProductImageUploader({
  images,
  onChange,
}: ProductImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const appendFiles = (files: FileList | File[]) => {
    const next = Array.from(files).map((file) => ({
      client_id: crypto.randomUUID(),
      file,
      preview_url: URL.createObjectURL(file),
      is_existing: false,
    })) as ProductImageDraft[];

    onChange([...images, ...next]);
  };

  const removeImage = (clientId: string) => {
    const image = images.find((item) => item.client_id === clientId);
    if (image && !image.is_existing) {
      URL.revokeObjectURL(image.preview_url);
    }
    onChange(images.filter((item) => item.client_id !== clientId));
  };

  const moveImage = (clientId: string, direction: -1 | 1) => {
    const index = images.findIndex((item) => item.client_id === clientId);
    if (index < 0) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const next = [...images];
    const [item] = next.splice(index, 1);
    next.splice(targetIndex, 0, item);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div
        className="rounded-xl border border-dashed bg-muted/20 p-6 text-center"
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          if (event.dataTransfer.files?.length) {
            appendFiles(event.dataTransfer.files);
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files?.length) {
              appendFiles(event.target.files);
              event.target.value = "";
            }
          }}
        />
        <ImagePlus className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="font-medium">Arrastra imágenes aquí</p>
        <p className="mb-4 text-sm text-muted-foreground">
          Se convertirán a WebP y se generará thumbnail automáticamente.
        </p>
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
          Seleccionar imágenes
        </Button>
      </div>

      {images.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {images.map((image, index) => (
            <div
              key={image.client_id}
              className={cn(
                "overflow-hidden rounded-xl border bg-card",
                index === 0 && "ring-2 ring-primary",
              )}
            >
              <div className="relative aspect-square overflow-hidden bg-muted">
                <img
                  src={image.preview_url}
                  alt={`Imagen ${index + 1}`}
                  className="h-full w-full object-cover"
                />
                {index === 0 && (
                  <div className="absolute left-2 top-2 rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">
                    Principal
                  </div>
                )}
              </div>
              <div className="space-y-3 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                    <span>{image.is_existing ? "Guardada" : "Nueva"}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeImage(image.client_id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => moveImage(image.client_id, -1)}
                    disabled={index === 0}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Subir
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => moveImage(image.client_id, 1)}
                    disabled={index === images.length - 1}
                  >
                    Bajar
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant={index === 0 ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const next = [...images];
                      const [selected] = next.splice(index, 1);
                      next.unshift(selected);
                      onChange(next);
                    }}
                  >
                    <Star className="mr-1 h-4 w-4" />
                    Principal
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
