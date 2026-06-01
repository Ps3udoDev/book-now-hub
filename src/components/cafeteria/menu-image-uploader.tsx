"use client";

import { ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import { useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { MenuImageDraft } from "@/lib/utils/menu-image-upload";

interface MenuImageUploaderProps {
  draft: MenuImageDraft | null;
  existingUrl?: string | null;
  onChange: (draft: MenuImageDraft | null) => void;
}

export function MenuImageUploader({
  draft,
  existingUrl,
  onChange,
}: MenuImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previewUrl = useMemo(
    () => draft?.preview_url || existingUrl || null,
    [draft, existingUrl],
  );

  const handleFile = (file: File | null) => {
    if (!file) return;
    if (draft?.preview_url) {
      URL.revokeObjectURL(draft.preview_url);
    }
    onChange({
      file,
      preview_url: URL.createObjectURL(file),
    });
  };

  return (
    <div className="space-y-3">
      <div
        className="rounded-2xl border border-dashed bg-muted/30 p-4"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          handleFile(event.dataTransfer.files?.[0] || null);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            handleFile(event.target.files?.[0] || null);
            event.target.value = "";
          }}
        />

        {previewUrl ? (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border bg-card">
              <img
                src={previewUrl}
                alt="Preview del item"
                className="h-56 w-full object-cover"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reemplazar
              </Button>
              {draft ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    URL.revokeObjectURL(draft.preview_url);
                    onChange(null);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Quitar nueva imagen
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ImagePlus className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Arrastra una foto del producto</p>
            <p className="mb-4 text-sm text-muted-foreground">
              Se comprime a WebP usando el helper del módulo de inventario.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => inputRef.current?.click()}
            >
              Seleccionar imagen
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
