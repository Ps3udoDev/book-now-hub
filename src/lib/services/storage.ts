// src/lib/services/storage.ts
import { createBrowserSB } from "@/lib/supabase/client";

const BUCKET = "images";

export interface UploadFileOptions {
  bucket?: string;
  upsert?: boolean;
  contentType?: string;
  cacheControl?: string;
}

class StorageService {
  private supabase = createBrowserSB();

  // Sube un archivo al bucket indicado y retorna la URL pública
  async uploadFile(
    file: File,
    path: string,
    options: UploadFileOptions = {},
  ): Promise<string> {
    const bucket = options.bucket || BUCKET;
    const { error } = await this.supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: options.upsert ?? true,
        contentType: options.contentType ?? file.type,
        cacheControl: options.cacheControl,
      });

    if (error) throw new Error(`Error al subir imagen: ${error.message}`);

    const { data } = this.supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  // Compatibilidad con el flujo actual de imágenes
  async uploadImage(
    file: File,
    path: string,
    options: UploadFileOptions = {},
  ): Promise<string> {
    return this.uploadFile(file, path, options);
  }

  // Elimina uno o varios archivos del bucket usando su path
  async deleteFile(path: string | string[], bucket = BUCKET): Promise<void> {
    const paths = Array.isArray(path) ? path : [path];
    const { error } = await this.supabase.storage.from(bucket).remove(paths);
    if (error) throw new Error(`Error al eliminar imagen: ${error.message}`);
  }

  // Compatibilidad con el flujo actual de imágenes
  async deleteImage(path: string, bucket = BUCKET): Promise<void> {
    await this.deleteFile(path, bucket);
  }

  getPublicUrl(path: string, bucket = BUCKET): string {
    const { data } = this.supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  // Extrae el path de storage desde una URL pública completa
  extractPath(publicUrl: string, bucket = BUCKET): string | null {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const index = publicUrl.indexOf(marker);
    if (index === -1) return null;
    return publicUrl.substring(index + marker.length);
  }

  // Genera un path único para una imagen
  buildPath(folder: string, tenantId: string, fileName: string): string {
    const ext = fileName.split(".").pop() || "jpg";
    const uniqueId = crypto.randomUUID();
    return `${folder}/${tenantId}/${uniqueId}.${ext}`;
  }

  buildScopedPath(...segments: Array<string | number | null | undefined>): string {
    return segments
      .filter((segment) => segment !== null && segment !== undefined && segment !== "")
      .map((segment) => String(segment).replace(/^\/+|\/+$/g, ""))
      .join("/");
  }

  buildProductImagePath(
    tenantId: string,
    productId: string,
    fileExtension = "webp",
    variant: "original" | "thumbnail" = "original",
  ): string {
    const fileName =
      variant === "thumbnail"
        ? `${crypto.randomUUID()}-thumb.${fileExtension}`
        : `${crypto.randomUUID()}.${fileExtension}`;

    return this.buildScopedPath(tenantId, "products", productId, fileName);
  }
}

export const storageService = new StorageService();
