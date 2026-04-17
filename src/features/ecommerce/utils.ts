import type { Json } from "@/types/supabase";
import type {
  PublicEcommerceProduct,
  PublicEcommerceStorefront,
} from "@/lib/services/ecommerce";
import { storageService } from "@/lib/services/storage";

export type ProductImage = {
  id: string | null;
  storage_path: string;
  thumbnail_path?: string | null;
  is_primary?: boolean | null;
  sort_order?: number | null;
};

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  currency: string;
  quantity: number;
  branchName?: string | null;
  imageUrl?: string | null;
};

export function parseProductImages(images: Json | null | undefined): ProductImage[] {
  if (!Array.isArray(images)) return [];

  const parsed: ProductImage[] = [];

  for (const image of images) {
    if (!image || typeof image !== "object") continue;

    const current = image as Record<string, unknown>;
    if (typeof current.storage_path !== "string") continue;

    parsed.push({
      id: typeof current.id === "string" ? current.id : null,
      storage_path: current.storage_path,
      thumbnail_path:
        typeof current.thumbnail_path === "string"
          ? current.thumbnail_path
          : null,
      is_primary:
        typeof current.is_primary === "boolean" ? current.is_primary : null,
      sort_order:
        typeof current.sort_order === "number" ? current.sort_order : null,
    });
  }

  return parsed;
}

export function formatMoney(value: number | null | undefined, currency?: string | null) {
  const amount = Number(value ?? 0);
  const code = currency || "USD";

  try {
    return new Intl.NumberFormat("es-EC", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
}

export function normalizeStorefrontColors(
  storefront: PublicEcommerceStorefront | null | undefined,
) {
  return {
    primary: storefront?.primary_color || "#8b5e47",
    secondary: storefront?.secondary_color || "#d6b7a5",
    accent: storefront?.accent_color || "#f0dfd4",
    background: storefront?.background_color || "#fffaf6",
    surface: storefront?.surface_color || "#ffffff",
    text: storefront?.text_color || "#221812",
    radius: storefront?.button_radius || "999px",
  };
}

export function buildWhatsAppOrderUrl(
  storefront: PublicEcommerceStorefront | null | undefined,
  items: CartItem[],
) {
  const rawNumber = storefront?.whatsapp_number?.replace(/\D/g, "") || "";
  if (!rawNumber || items.length === 0) return null;

  const currency = items[0]?.currency || "USD";
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemLines = items
    .map((item) => {
      const subtotal = formatMoney(item.price * item.quantity, item.currency);
      return `- ${item.quantity} x ${item.name} (${subtotal})${
        item.branchName ? ` [${item.branchName}]` : ""
      }`;
    })
    .join("%0A");

  const template =
    storefront?.whatsapp_message_template ||
    "Hola, quiero realizar este pedido:%0A{{items}}%0A%0ATotal estimado: {{total}}";

  const message = template
    .replaceAll("{{items}}", itemLines)
    .replaceAll("{{total}}", formatMoney(total, currency));

  return `https://wa.me/${rawNumber}?text=${message}`;
}

export function sortProducts(
  products: PublicEcommerceProduct[],
  mode: string | null | undefined,
) {
  const sorted = [...products];

  switch (mode) {
    case "name_desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case "price_asc":
      return sorted.sort((a, b) => a.price - b.price);
    case "price_desc":
      return sorted.sort((a, b) => b.price - a.price);
    case "newest":
      return sorted;
    case "name_asc":
    default:
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
  }
}

export function getPrimaryProductImage(product: PublicEcommerceProduct) {
  const images = parseProductImages(product.images);
  return images[0] ?? null;
}

export function resolveProductImageUrl(
  path: string | null | undefined,
  bucket = "product-images",
) {
  if (!path) return null;
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:")
  ) {
    return path;
  }

  return storageService.getPublicUrl(path, bucket);
}
