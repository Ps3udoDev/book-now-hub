import type {
  CafeOrderStatus,
  MenuItemImage,
} from "@/types";
import type { MenuItemWithImages } from "@/lib/services/menu";
import { storageService } from "@/lib/services/storage";

export interface CategoryAppearance {
  iconName: string | null;
  colorHex: string | null;
}

export function parseCategoryAppearance(rawValue?: string | null): CategoryAppearance {
  if (!rawValue) {
    return { iconName: null, colorHex: null };
  }

  const [iconName, colorHex] = rawValue.split("|");
  return {
    iconName: iconName || null,
    colorHex: colorHex || null,
  };
}

export function serializeCategoryAppearance(
  iconName?: string | null,
  colorHex?: string | null,
) {
  const cleanIcon = iconName?.trim() || "";
  const cleanColor = colorHex?.trim() || "";

  if (!cleanIcon && !cleanColor) return null;
  if (!cleanColor) return cleanIcon || null;
  return `${cleanIcon}|${cleanColor}`;
}

export function getMenuItemPrimaryImage(item: {
  images?: MenuItemImage[] | null;
}) {
  const images = item.images ?? [];
  return (
    images.find((image) => image.is_primary) ??
    images.slice().sort((a, b) => a.sort_order - b.sort_order)[0] ??
    null
  );
}

export function resolveMenuImageUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return storageService.getPublicUrl(path, "menu-images");
}

export function getMenuItemImageUrl(
  item: MenuItemWithImages,
  variant: "original" | "thumbnail" = "original",
) {
  const image = getMenuItemPrimaryImage(item);
  const path =
    variant === "thumbnail"
      ? image?.thumbnail_path || image?.storage_path
      : image?.storage_path || image?.thumbnail_path;

  return resolveMenuImageUrl(path);
}

export function getCafeOrderNextStatus(status: CafeOrderStatus) {
  switch (status) {
    case "pending":
      return "preparing" as const;
    case "preparing":
      return "ready" as const;
    case "ready":
      return "delivered" as const;
    default:
      return null;
  }
}

export function getCafeOrderStatusLabel(status: CafeOrderStatus) {
  switch (status) {
    case "pending":
      return "Pendiente";
    case "preparing":
      return "Preparando";
    case "ready":
      return "Listo";
    case "delivered":
      return "Entregado";
    case "cancelled":
      return "Cancelado";
    default:
      return status;
  }
}

export function getCafeOrderStatusClassName(status: CafeOrderStatus) {
  switch (status) {
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "preparing":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "ready":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "delivered":
      return "border-zinc-200 bg-zinc-100 text-zinc-700";
    case "cancelled":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-zinc-200 bg-zinc-100 text-zinc-700";
  }
}
