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

export async function uploadDraftProductImages(params: {
  tenantId: string;
  productId: string;
  drafts: ProductImageDraft[];
}) {
  const uploads = params.drafts.filter((draft) => draft.file);
  if (!uploads.length) return new Map<string, PersistedProductImage>();

  const payload = [];

  for (let index = 0; index < uploads.length; index += 1) {
    const draft = uploads[index];
    if (!draft.file) continue;

    const imageSet = await generateProductImageSet(draft.file);
    const originalPath = storageService.buildProductImagePath(
      params.tenantId,
      params.productId,
      "webp",
      "original",
    );
    const thumbnailPath = storageService.buildProductImagePath(
      params.tenantId,
      params.productId,
      "webp",
      "thumbnail",
    );

    await storageService.uploadImage(imageSet.original, originalPath, {
      bucket: "product-images",
      contentType: "image/webp",
      upsert: true,
    });
    await storageService.uploadImage(imageSet.thumbnail, thumbnailPath, {
      bucket: "product-images",
      contentType: "image/webp",
      upsert: true,
    });

    payload.push({
      client_id: draft.client_id,
      storage_path: originalPath,
      thumbnail_path: thumbnailPath,
      is_primary: false,
      sort_order: index,
    });
  }

  const response = await fetch(`/api/products/${params.productId}/images`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      images: payload.map(({ storage_path, thumbnail_path, is_primary, sort_order }) => ({
        storage_path,
        thumbnail_path,
        is_primary,
        sort_order,
      })),
    }),
  });
  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.error || "No se pudieron registrar las imágenes");
  }

  const map = new Map<string, PersistedProductImage>();
  for (let index = 0; index < (json.images || []).length; index += 1) {
    const createdImage = json.images[index];
    const source = payload[index];
    if (source) {
      map.set(source.client_id, createdImage);
    }
  }

  return map;
}
