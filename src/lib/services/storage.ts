// src/lib/services/storage.ts
import { createBrowserSB } from "@/lib/supabase/client";

const BUCKET = "images";

class StorageService {
  private supabase = createBrowserSB();

  // Sube una imagen al bucket y retorna la URL pública
  async uploadImage(file: File, path: string): Promise<string> {
    const { error } = await this.supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true });

    if (error) throw new Error(`Error al subir imagen: ${error.message}`);

    const { data } = this.supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  // Elimina una imagen del bucket usando su path
  async deleteImage(path: string): Promise<void> {
    const { error } = await this.supabase.storage.from(BUCKET).remove([path]);
    if (error) throw new Error(`Error al eliminar imagen: ${error.message}`);
  }

  // Extrae el path de storage desde una URL pública completa
  extractPath(publicUrl: string): string | null {
    const marker = `/storage/v1/object/public/${BUCKET}/`;
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
}

export const storageService = new StorageService();
