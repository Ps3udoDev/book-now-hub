import { storageService } from "@/lib/services/storage";
import { generateProductImageSet } from "@/lib/utils/image-processing";

export interface MenuImageDraft {
  file: File;
  preview_url: string;
}

export interface UploadedMenuImagePayload {
  storage_path: string;
  thumbnail_path: string | null;
  is_primary: boolean;
}

export async function uploadMenuItemImage(params: {
  tenantId: string;
  menuItemId: string;
  draft: MenuImageDraft;
}): Promise<UploadedMenuImagePayload> {
  const imageSet = await generateProductImageSet(params.draft.file);
  const storagePath = storageService.buildMenuImagePath(
    params.tenantId,
    params.menuItemId,
    "webp",
    "original",
  );
  const thumbnailPath = storageService.buildMenuImagePath(
    params.tenantId,
    params.menuItemId,
    "webp",
    "thumbnail",
  );

  await storageService.uploadImage(imageSet.original, storagePath, {
    bucket: "menu-images",
    contentType: "image/webp",
    upsert: true,
  });
  await storageService.uploadImage(imageSet.thumbnail, thumbnailPath, {
    bucket: "menu-images",
    contentType: "image/webp",
    upsert: true,
  });

  return {
    storage_path: storagePath,
    thumbnail_path: thumbnailPath,
    is_primary: true,
  };
}
