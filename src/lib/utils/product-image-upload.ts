import { storageService } from "@/lib/services/storage";
import { generateProductImageSet } from "@/lib/utils/image-processing";

export interface ProductImageDraft {
  client_id: string;
  id?: string;
  file?: File;
  preview_url: string;
  storage_path?: string | null;
  thumbnail_path?: string | null;
  is_existing: boolean;
}

export interface PersistedProductImage {
  id: string;
  storage_path: string;
  thumbnail_path: string | null;
  is_primary: boolean | null;
  sort_order: number | null;
}

export interface ProductImageUploadFailure {
  client_id: string;
  file_name: string;
  reason: string;
}

export interface UploadDraftImagesResult {
  persisted: Map<string, PersistedProductImage>;
  failures: ProductImageUploadFailure[];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Error desconocido";
}

/**
 * Sube las imágenes nuevas de un producto. Nunca lanza por una imagen
 * individual: intenta convertir a WebP y, si el navegador no puede
 * decodificar el archivo (ej. HEIC), sube el original tal cual (sin
 * thumbnail). Devuelve las persistidas y las que fallaron con su motivo.
 */
export async function uploadDraftProductImages(params: {
  tenantId: string;
  productId: string;
  drafts: ProductImageDraft[];
}): Promise<UploadDraftImagesResult> {
  const uploads = params.drafts.filter((draft) => draft.file);
  const failures: ProductImageUploadFailure[] = [];
  const payload: Array<{
    client_id: string;
    storage_path: string;
    thumbnail_path: string | null;
    is_primary: boolean;
    sort_order: number;
  }> = [];

  for (let index = 0; index < uploads.length; index += 1) {
    const draft = uploads[index];
    if (!draft.file) continue;

    try {
      let originalFile = draft.file;
      let thumbnailFile: File | null = null;
      let extension = draft.file.name.split(".").pop()?.toLowerCase() || "bin";

      try {
        const imageSet = await generateProductImageSet(draft.file);
        originalFile = imageSet.original;
        thumbnailFile = imageSet.thumbnail;
        extension = "webp";
      } catch {
        // No decodificable en este navegador (ej. HEIC): subir el
        // archivo original sin conversión ni thumbnail.
      }

      const originalPath = storageService.buildProductImagePath(
        params.tenantId,
        params.productId,
        extension,
        "original",
      );

      await storageService.uploadImage(originalFile, originalPath, {
        bucket: "product-images",
        contentType: originalFile.type || undefined,
        upsert: true,
      });

      let thumbnailPath: string | null = null;
      if (thumbnailFile) {
        thumbnailPath = storageService.buildProductImagePath(
          params.tenantId,
          params.productId,
          "webp",
          "thumbnail",
        );
        await storageService.uploadImage(thumbnailFile, thumbnailPath, {
          bucket: "product-images",
          contentType: "image/webp",
          upsert: true,
        });
      }

      payload.push({
        client_id: draft.client_id,
        storage_path: originalPath,
        thumbnail_path: thumbnailPath,
        is_primary: false,
        sort_order: index,
      });
    } catch (error) {
      failures.push({
        client_id: draft.client_id,
        file_name: draft.file.name,
        reason: errorMessage(error),
      });
    }
  }

  if (!payload.length) {
    return { persisted: new Map(), failures };
  }

  const response = await fetch(`/api/products/${params.productId}/images`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      images: payload.map(
        ({ storage_path, thumbnail_path, is_primary, sort_order }) => ({
          storage_path,
          thumbnail_path,
          is_primary,
          sort_order,
        }),
      ),
    }),
  });
  const json = await response.json();

  if (!response.ok) {
    // El registro en BD falló para todo el lote: reportar cada imagen.
    for (const item of payload) {
      const draft = uploads.find((u) => u.client_id === item.client_id);
      failures.push({
        client_id: item.client_id,
        file_name: draft?.file?.name || item.storage_path,
        reason: json.error || "No se pudieron registrar las imágenes",
      });
    }
    return { persisted: new Map(), failures };
  }

  const persisted = new Map<string, PersistedProductImage>();
  for (let index = 0; index < (json.images || []).length; index += 1) {
    const createdImage = json.images[index];
    const source = payload[index];
    if (source) {
      persisted.set(source.client_id, createdImage);
    }
  }

  return { persisted, failures };
}
