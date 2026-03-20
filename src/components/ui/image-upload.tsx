// src/components/ui/image-upload.tsx
"use client";

import { useCallback, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onImageChange: (file: File | null) => void;
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: "circle" | "square";
  fallbackText?: string;
}

export function ImageUpload({
  currentImageUrl,
  onImageChange,
  onRemove,
  disabled = false,
  className,
  variant = "circle",
  fallbackText = "",
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const imageUrl = preview || currentImageUrl;

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Solo se permiten archivos de imagen");
        return;
      }
      if (file.size > MAX_SIZE) {
        toast.error("La imagen no puede superar 2MB");
        return;
      }
      const url = URL.createObjectURL(file);
      setPreview(url);
      onImageChange(file);
    },
    [onImageChange]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Resetear input para permitir seleccionar el mismo archivo
    e.target.value = "";
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile]
  );

  const handleRemove = () => {
    setPreview(null);
    onImageChange(null);
    onRemove?.();
  };

  if (variant === "circle") {
    return (
      <div className={cn("flex items-center gap-4", className)}>
        <div
          className={cn(
            "relative cursor-pointer group",
            disabled && "pointer-events-none opacity-50"
          )}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <Avatar className={cn("h-20 w-20", isDragging && "ring-2 ring-primary")}>
            {imageUrl ? (
              <AvatarImage src={imageUrl} alt="Avatar" />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {fallbackText || <ImagePlus className="h-6 w-6" />}
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <ImagePlus className="h-5 w-5 text-white" />
          </div>
        </div>
        {imageUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={disabled}
            className="text-destructive hover:text-destructive"
          >
            <X className="h-4 w-4 mr-1" />
            Quitar
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleInputChange}
          disabled={disabled}
        />
      </div>
    );
  }

  // Variante cuadrada para servicios
  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "relative w-full h-40 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden group transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
          disabled && "pointer-events-none opacity-50"
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
              <ImagePlus className="h-6 w-6 text-white" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImagePlus className="h-8 w-8" />
            <span className="text-sm">Haz clic o arrastra una imagen</span>
            <span className="text-xs">Max 2MB</span>
          </div>
        )}
      </div>
      {imageUrl && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRemove}
          disabled={disabled}
          className="text-destructive hover:text-destructive"
        >
          <X className="h-4 w-4 mr-1" />
          Quitar imagen
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />
    </div>
  );
}
