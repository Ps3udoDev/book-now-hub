"use client";

import { animate } from "animejs";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Star,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProductImageDraft } from "@/lib/utils/product-image-upload";

interface ProductImagePanelProps {
  images: ProductImageDraft[];
  onChange: (images: ProductImageDraft[]) => void;
  // client_id → motivo de fallo en el último intento de guardado.
  uploadFailures?: Map<string, string>;
}

/**
 * Panel de imágenes del producto: preview grande arriba y tira de
 * miniaturas debajo. La imagen en índice 0 es la principal.
 */
export function ProductImagePanel({
  images,
  onChange,
  uploadFailures,
}: ProductImagePanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Previews que el navegador no pudo renderizar (ej. HEIC). Se suben
  // igual (el pipeline sube el original), solo avisamos que no hay vista.
  const [brokenPreviews, setBrokenPreviews] = useState<Set<string>>(
    () => new Set(),
  );

  const selected = useMemo(
    () =>
      images.find((image) => image.client_id === selectedId) ||
      images[0] ||
      null,
    [images, selectedId],
  );
  const selectedIndex = selected
    ? images.findIndex((image) => image.client_id === selected.client_id)
    : -1;

  // Animar el cambio de preview.
  useEffect(() => {
    if (!previewRef.current || !selected) return;
    animate(previewRef.current, {
      opacity: [0.4, 1],
      scale: [0.98, 1],
      duration: 220,
      ease: "outQuad",
    });
  }, [selected]);

  const appendFiles = (files: FileList | File[]) => {
    const next = Array.from(files).map((file) => ({
      client_id: crypto.randomUUID(),
      file,
      preview_url: URL.createObjectURL(file),
      is_existing: false,
    })) as ProductImageDraft[];

    onChange([...images, ...next]);
    if (next.length) setSelectedId(next[next.length - 1].client_id);
  };

  const removeImage = (clientId: string) => {
    const image = images.find((item) => item.client_id === clientId);
    if (image && !image.is_existing) {
      URL.revokeObjectURL(image.preview_url);
    }
    const remaining = images.filter((item) => item.client_id !== clientId);
    onChange(remaining);
    if (selectedId === clientId) {
      setSelectedId(remaining[0]?.client_id ?? null);
    }
  };

  const moveSelected = (direction: -1 | 1) => {
    if (selectedIndex < 0) return;
    const targetIndex = selectedIndex + direction;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const next = [...images];
    const [item] = next.splice(selectedIndex, 1);
    next.splice(targetIndex, 0, item);
    onChange(next);
  };

  const makeSelectedPrimary = () => {
    if (selectedIndex <= 0) return;
    const next = [...images];
    const [item] = next.splice(selectedIndex, 1);
    next.unshift(item);
    onChange(next);
  };

  const markBroken = (clientId: string) => {
    setBrokenPreviews((current) => {
      if (current.has(clientId)) return current;
      const next = new Set(current);
      next.add(clientId);
      return next;
    });
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: zona de drop; la interacción accesible es el input de archivos
    <div
      className="space-y-4"
      onDragOver={(event) => event.preventDefault()}
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

      {/* Preview grande */}
      {selected ? (
        <div className="space-y-3">
          <div
            ref={previewRef}
            className="relative aspect-square overflow-hidden rounded-xl border bg-muted"
          >
            {brokenPreviews.has(selected.client_id) ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
                <AlertTriangle className="h-8 w-8 text-amber-500" />
                <p>
                  Vista previa no disponible en este navegador. El archivo se
                  subirá igualmente.
                </p>
              </div>
            ) : (
              <img
                src={selected.preview_url}
                alt="Vista previa del producto"
                className="h-full w-full object-contain"
                onError={() => markBroken(selected.client_id)}
              />
            )}
            {selectedIndex === 0 && (
              <div className="absolute left-3 top-3 rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">
                Principal
              </div>
            )}
            {uploadFailures?.has(selected.client_id) && (
              <div className="absolute inset-x-3 bottom-3 rounded-md bg-destructive/90 px-3 py-2 text-xs text-destructive-foreground">
                {uploadFailures.get(selected.client_id)}
              </div>
            )}
          </div>

          {/* Toolbar sobre la imagen seleccionada */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => moveSelected(-1)}
                disabled={selectedIndex <= 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => moveSelected(1)}
                disabled={
                  selectedIndex < 0 || selectedIndex >= images.length - 1
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={selectedIndex === 0 ? "default" : "outline"}
                size="sm"
                onClick={makeSelectedPrimary}
                disabled={selectedIndex === 0}
              >
                <Star className="mr-1 h-4 w-4" />
                Principal
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => selected && removeImage(selected.client_id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 p-6 text-center transition hover:bg-muted/40"
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-medium">Arrastra imágenes aquí</p>
            <p className="text-sm text-muted-foreground">
              o haz clic para seleccionar
            </p>
          </div>
        </button>
      )}

      {/* Tira de miniaturas */}
      <div className="flex flex-wrap gap-2">
        {images.map((image, index) => {
          const isSelected = selected?.client_id === image.client_id;
          const failed = uploadFailures?.has(image.client_id);
          return (
            <button
              key={image.client_id}
              type="button"
              onClick={() => setSelectedId(image.client_id)}
              className={cn(
                "relative h-16 w-16 overflow-hidden rounded-lg border bg-muted",
                isSelected && "ring-2 ring-primary",
                failed && "ring-2 ring-destructive",
              )}
            >
              {brokenPreviews.has(image.client_id) ? (
                <div className="flex h-full w-full items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
              ) : (
                <img
                  src={image.preview_url}
                  alt={`Miniatura ${index + 1}`}
                  className="h-full w-full object-cover"
                  onError={() => markBroken(image.client_id)}
                />
              )}
              {index === 0 && (
                <Star className="absolute left-1 top-1 h-3.5 w-3.5 fill-primary text-primary" />
              )}
              {!image.is_existing && (
                <span className="absolute bottom-0 inset-x-0 bg-background/80 text-[10px] leading-tight text-muted-foreground">
                  Nueva
                </span>
              )}
            </button>
          );
        })}

        {images.length > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed text-muted-foreground transition hover:bg-muted/40"
            aria-label="Agregar imágenes"
          >
            <ImagePlus className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
