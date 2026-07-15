"use client";

import Link from "next/link";
import {
  ArrowRight,
  Menu,
  Minus,
  Monitor,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Smartphone,
  Store,
  X,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getEcommerceTemplate } from "@/features/ecommerce/templates";
import { cn } from "@/lib/utils";
import type {
  PublicEcommerceProduct,
  PublicEcommerceStorefront,
} from "@/lib/services/ecommerce";
import {
  buildWhatsAppOrderUrl,
  formatMoney,
  getPrimaryProductImage,
  normalizeStorefrontColors,
  parseProductImages,
  resolveProductImageUrl,
  type CartItem,
} from "@/features/ecommerce/utils";

type StorefrontSectionKey = "shop" | "discovery" | "story" | "journal";

type EditorialSectionData = {
  enabled: boolean;
  eyebrow?: string;
  title: string;
  body: string;
  image_url?: string;
  cta_label?: string;
};

type StorySectionData = {
  enabled: boolean;
  title: string;
  body: string;
  image_url?: string;
  owner_name?: string;
  owner_role?: string;
  owner_quote?: string;
};

type StorefrontSections = {
  discovery: EditorialSectionData;
  story: StorySectionData;
  journal: EditorialSectionData;
};

function getTemplateSurfaceStyle(storefront: PublicEcommerceStorefront): CSSProperties {
  const colors = normalizeStorefrontColors(storefront);

  return {
    "--ecommerce-primary": colors.primary,
    "--ecommerce-secondary": colors.secondary,
    "--ecommerce-accent": colors.accent,
    "--ecommerce-background": colors.background,
    "--ecommerce-surface": colors.surface,
    "--ecommerce-text": colors.text,
    "--ecommerce-radius": colors.radius,
    color: colors.text,
  } as CSSProperties;
}

function getProductImageUrl(product: PublicEcommerceProduct) {
  const image = getPrimaryProductImage(product);

  if (!image) {
    return null;
  }

  return resolveProductImageUrl(image.thumbnail_path || image.storage_path);
}

function getNavigationSectionKey(label: string): StorefrontSectionKey | null {
  switch (label.toLowerCase()) {
    case "shop":
      return "shop";
    case "discovery":
      return "discovery";
    case "story":
      return "story";
    case "journal":
      return "journal";
    default:
      return null;
  }
}

function getStorefrontSections(storefront: PublicEcommerceStorefront): StorefrontSections {
  const raw =
    storefront.custom_sections && typeof storefront.custom_sections === "object"
      ? (storefront.custom_sections as Record<string, unknown>)
      : {};

  const discovery =
    raw.discovery && typeof raw.discovery === "object"
      ? (raw.discovery as Record<string, unknown>)
      : {};
  const story =
    raw.story && typeof raw.story === "object"
      ? (raw.story as Record<string, unknown>)
      : {};
  const journal =
    raw.journal && typeof raw.journal === "object"
      ? (raw.journal as Record<string, unknown>)
      : {};

  return {
    discovery: {
      enabled: typeof discovery.enabled === "boolean" ? discovery.enabled : true,
      eyebrow:
        typeof discovery.eyebrow === "string" ? discovery.eyebrow : "Discovery",
      title:
        typeof discovery.title === "string"
          ? discovery.title
          : `Descubre el universo de ${storefront.store_name}`,
      body:
        typeof discovery.body === "string"
          ? discovery.body
          : "Un espacio para presentar la curaduria del catalogo, colecciones o rituales de compra.",
      image_url:
        typeof discovery.image_url === "string" ? discovery.image_url : "",
      cta_label:
        typeof discovery.cta_label === "string"
          ? discovery.cta_label
          : "Explorar",
    },
    story: {
      enabled: typeof story.enabled === "boolean" ? story.enabled : true,
      title:
        typeof story.title === "string"
          ? story.title
          : "La historia detras de la marca",
      body:
        typeof story.body === "string"
          ? story.body
          : "Comparte aqui la vision del fundador, el origen del proyecto y el tono que quieres transmitir.",
      image_url: typeof story.image_url === "string" ? story.image_url : "",
      owner_name:
        typeof story.owner_name === "string" ? story.owner_name : storefront.store_name,
      owner_role:
        typeof story.owner_role === "string" ? story.owner_role : "Founder",
      owner_quote:
        typeof story.owner_quote === "string"
          ? story.owner_quote
          : "Nuestra meta es que cada producto se sienta como una recomendacion personal.",
    },
    journal: {
      enabled: typeof journal.enabled === "boolean" ? journal.enabled : true,
      eyebrow: typeof journal.eyebrow === "string" ? journal.eyebrow : "Journal",
      title:
        typeof journal.title === "string"
          ? journal.title
          : "Notas, rituales y novedades",
      body:
        typeof journal.body === "string"
          ? journal.body
          : "Usa esta seccion para compartir tips, rituales, recomendaciones o piezas editoriales del negocio.",
      image_url: typeof journal.image_url === "string" ? journal.image_url : "",
      cta_label:
        typeof journal.cta_label === "string" ? journal.cta_label : "Leer mas",
    },
  };
}

function getVisibleNavigation(
  storefront: PublicEcommerceStorefront,
  sections: StorefrontSections,
) {
  return getTemplateNavigation(storefront.template_slug).filter((label) => {
    const sectionKey = getNavigationSectionKey(label);

    if (!sectionKey || sectionKey === "shop") {
      return true;
    }

    if (sectionKey === "discovery") return sections.discovery.enabled;
    if (sectionKey === "story") return sections.story.enabled;
    if (sectionKey === "journal") return sections.journal.enabled;

    return true;
  });
}

function getTemplateNavigation(templateSlug: string) {
  switch (templateSlug) {
    case "neo-urban":
      return ["Shop", "Categories", "Flash Sales", "New Arrivals"];
    case "pure-organic":
      return ["Shop", "Discovery", "Story", "Journal"];
    case "silent-luxury":
      return ["Collections", "Objects", "Textiles", "Journal"];
    default:
      return ["Shop", "Colecciones", "Editorial", "Nuestra marca"];
  }
}

function getTemplateCollectionTitle(templateSlug: string) {
  switch (templateSlug) {
    case "neo-urban":
      return "Trending Hardware";
    case "pure-organic":
      return "New Arrivals";
    case "silent-luxury":
      return "New Arrivals";
    default:
      return "The Fall Collection";
  }
}

function getTemplateCollectionSubtitle(templateSlug: string) {
  switch (templateSlug) {
    case "neo-urban":
      return "High-frequency selections.";
    case "pure-organic":
      return "Objetos y productos para rituales cotidianos.";
    case "silent-luxury":
      return "Selecciones curadas para una presentacion sobria.";
    default:
      return "Curated essentials designed for discovery and conversion.";
  }
}

function getTemplateSidebarTitle(templateSlug: string) {
  switch (templateSlug) {
    case "neo-urban":
      return "Global Filters";
    case "pure-organic":
      return "Refine Selection";
    case "silent-luxury":
      return "Filter";
    default:
      return "Filters";
  }
}

function getTemplateSidebarDescription(templateSlug: string) {
  switch (templateSlug) {
    case "neo-urban":
      return "Refine your pulse";
    case "pure-organic":
      return "Filter by organic essence";
    case "silent-luxury":
      return "Refine Selection";
    default:
      return "Refine your selection";
  }
}

function getTemplateFooterCopy(storefront: PublicEcommerceStorefront) {
  switch (storefront.template_slug) {
    case "neo-urban":
      return `${storefront.store_name}. Precision retail for the electric pulse.`;
    case "pure-organic":
      return `${storefront.store_name}. Crafted with a calmer rhythm.`;
    case "silent-luxury":
      return `${storefront.store_name}. Architectural stillness for daily rituals.`;
    default:
      return `${storefront.store_name}. Curated beauty retail for modern salons.`;
  }
}

function ProductFallback({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex h-full items-center justify-center bg-black/5">
      <Package
        className={cn("text-muted-foreground", compact ? "h-10 w-10" : "h-14 w-14")}
      />
    </div>
  );
}

function HoverZoomImage({
  src,
  alt,
  className,
  imageClassName,
  previewClassName,
}: {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  previewClassName?: string;
}) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });

  return (
    <>
      <div
        className={cn("relative h-full w-full overflow-hidden", className)}
        onMouseEnter={() => setIsPreviewOpen(true)}
        onMouseLeave={() => setIsPreviewOpen(false)}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const x = ((event.clientX - rect.left) / rect.width) * 100;
          const y = ((event.clientY - rect.top) / rect.height) * 100;
          setPosition({
            x: Math.max(0, Math.min(100, x)),
            y: Math.max(0, Math.min(100, y)),
          });
        }}
      >
        <img
          src={src}
          alt={alt}
          className={cn("h-full w-full object-cover transition-transform duration-500 group-hover:scale-105", imageClassName)}
        />
      </div>

      <div
        className={cn(
          "pointer-events-none fixed right-8 top-1/2 z-[70] hidden h-[480px] w-[360px] -translate-y-1/2 overflow-hidden rounded-[2rem] border border-black/10 bg-white/95 shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur-md transition-all duration-200 xl:block",
          isPreviewOpen ? "opacity-100" : "opacity-0",
          previewClassName,
        )}
      >
        <div className="absolute left-4 top-4 rounded-full bg-black/75 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white">
          Zoom preview
        </div>
        <div
          className="h-full w-full bg-cover bg-no-repeat"
          style={{
            backgroundImage: `url(${src})`,
            backgroundSize: "220%",
            backgroundPosition: `${position.x}% ${position.y}%`,
          }}
        />
      </div>
    </>
  );
}

function ProductCard({
  tenantSlug,
  storefront,
  product,
  index,
  onAddToCart,
}: {
  tenantSlug: string;
  storefront: PublicEcommerceStorefront;
  product: PublicEcommerceProduct;
  index: number;
  onAddToCart?: (product: PublicEcommerceProduct) => void;
}) {
  const template = getEcommerceTemplate(storefront.template_slug);
  const imageUrl = getProductImageUrl(product);
  const href = `/t/${tenantSlug}/products/${product.product_id}`;

  if (template.layout === "neo") {
    return (
      <article
        className={cn(
          "group relative overflow-hidden border transition-all duration-500",
          template.cardClassName,
          "rounded-[1.75rem]",
        )}
      >
        <Link href={href} className="block">
          <div className="relative aspect-[4/5] overflow-hidden bg-white/5">
            {imageUrl ? (
              <HoverZoomImage
                src={imageUrl}
                alt={product.name}
                imageClassName="group-hover:mix-blend-normal"
                previewClassName="border-white/10 bg-[#141822]/92"
              />
            ) : (
              <ProductFallback compact />
            )}
            <div className="absolute right-4 top-4 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs font-semibold text-[color:var(--ecommerce-primary)] backdrop-blur-md">
              {storefront.show_prices
                ? formatMoney(product.price, product.currency_iso)
                : "Consultar"}
            </div>
          </div>
        </Link>

        <div className="relative p-6">
          <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            {onAddToCart ? (
              <Button className={cn("rounded-full", template.buttonClassName)} onClick={() => onAddToCart(product)}>
                Add to Cart
              </Button>
            ) : null}
          </div>

          <div className="space-y-2">
            <h3
              className="text-xl font-medium text-white"
              style={{ fontFamily: template.fontDisplay }}
            >
              {product.name}
            </h3>
            <p className="text-sm text-slate-400">
              {product.description || product.brand || "Performance-crafted product."}
            </p>
            {storefront.show_branch_badge && product.branch_name ? (
              <span className={cn("inline-flex items-center gap-2 border px-3 py-1 text-[11px]", template.chipClassName)}>
                <Store className="h-3 w-3" />
                {product.branch_name}
              </span>
            ) : null}
          </div>
        </div>
      </article>
    );
  }

  if (template.layout === "organic") {
    return (
      <article className="group flex flex-col gap-4">
        <Link
          href={href}
          className="relative block aspect-[4/5] overflow-hidden rounded-[1.25rem] border border-stone-200/70 bg-[#f7f3eb]"
        >
          {imageUrl ? (
            <HoverZoomImage
              src={imageUrl}
              alt={product.name}
              previewClassName="border-stone-200/80 bg-[#faf7f1]/95"
            />
          ) : (
            <ProductFallback compact />
          )}

          {storefront.show_branch_badge && product.branch_name ? (
            <span className="absolute left-3 top-3 rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium text-stone-700 backdrop-blur-sm">
              {product.branch_name}
            </span>
          ) : null}
        </Link>

        <div className="space-y-2">
          <Link href={href} className="block">
            <h3
              className="text-lg font-semibold text-[color:var(--ecommerce-primary)]"
              style={{ fontFamily: template.fontDisplay }}
            >
              {product.name}
            </h3>
          </Link>
          <p className="line-clamp-2 text-sm text-stone-600">
            {product.description || product.brand || "Pieza lista para pedido."}
          </p>
          <div className="flex items-center justify-between gap-4">
            <p className="font-semibold text-[color:var(--ecommerce-secondary)]">
              {storefront.show_prices
                ? formatMoney(product.price, product.currency_iso)
                : "Consultar"}
            </p>
            {onAddToCart ? (
              <Button className={cn("rounded-xl", template.buttonClassName)} onClick={() => onAddToCart(product)}>
                Agregar
              </Button>
            ) : null}
          </div>
        </div>
      </article>
    );
  }

  if (template.layout === "luxury") {
    return (
      <article className={cn("group flex flex-col", index % 2 === 1 && "pt-10 md:pt-14")}>
        <Link
          href={href}
          className={cn(
            "mb-6 block aspect-[4/5] overflow-hidden border bg-black/5 shadow-[0_4px_60px_-15px_rgba(46,52,46,0.05)]",
            template.imageMaskClassName,
          )}
        >
          {imageUrl ? (
            <HoverZoomImage
              src={imageUrl}
              alt={product.name}
              imageClassName="opacity-95 transition-all duration-700 group-hover:opacity-100"
              previewClassName="rounded-none border-black/10 bg-[#faf7f1]/95"
            />
          ) : (
            <ProductFallback compact />
          )}
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Link href={href} className="block">
              <h3
                className="text-xl tracking-tight"
                style={{ fontFamily: template.fontDisplay }}
              >
                {product.name}
              </h3>
            </Link>
            <p className="text-sm font-light text-stone-600">
              {product.description || product.brand || "Objeto curado para pedido."}
            </p>
            {storefront.show_branch_badge && product.branch_name ? (
              <p className="pt-1 text-[11px] uppercase tracking-[0.22em] text-stone-500">
                {product.branch_name}
              </p>
            ) : null}
          </div>
          <div className="space-y-3 text-right">
            <p className="text-sm">
              {storefront.show_prices
                ? formatMoney(product.price, product.currency_iso)
                : "Consultar"}
            </p>
            {onAddToCart ? (
              <Button className={cn("px-4", template.buttonClassName)} onClick={() => onAddToCart(product)}>
                Agregar
              </Button>
            ) : null}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "group overflow-hidden border transition-transform duration-300",
        template.cardClassName,
      )}
    >
      <Link href={href} className="block">
        <div className={cn("relative aspect-[3/4] overflow-hidden bg-black/5", template.imageMaskClassName)}>
          {imageUrl ? (
            <HoverZoomImage
              src={imageUrl}
              alt={product.name}
              previewClassName="border-stone-200/80 bg-white/95"
            />
          ) : (
            <ProductFallback compact />
          )}

          <div className="absolute inset-x-0 bottom-0 translate-y-full bg-white/75 py-3 text-center text-xs font-semibold uppercase tracking-[0.3em] text-stone-800 backdrop-blur-md transition-transform duration-300 group-hover:translate-y-0">
            Quick Add
          </div>
        </div>
      </Link>

      <div className="space-y-4 px-5 pb-5 pt-4">
        <div className="space-y-2">
          {storefront.show_branch_badge && product.branch_name ? (
            <span className={cn("inline-flex items-center gap-2 border px-3 py-1 text-[11px]", template.chipClassName)}>
              <Store className="h-3 w-3" />
              {product.branch_name}
            </span>
          ) : null}
          <Link href={href} className="block">
            <h3 className="text-lg font-semibold leading-tight">{product.name}</h3>
          </Link>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {product.description || product.brand || "Producto disponible para pedido."}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <p className="text-base font-semibold">
            {storefront.show_prices
              ? formatMoney(product.price, product.currency_iso)
              : "Consultar precio"}
          </p>

          {onAddToCart ? (
            <Button className={template.buttonClassName} onClick={() => onAddToCart(product)}>
              Agregar
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function EcommerceCartSheet({
  open,
  onOpenChange,
  storefront,
  items,
  onUpdateQuantity,
  onRemove,
  onClear,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storefront: PublicEcommerceStorefront;
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
}) {
  const template = getEcommerceTemplate(storefront.template_slug);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const whatsappUrl = buildWhatsAppOrderUrl(storefront, items);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-xl">
        <SheetHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <SheetTitle>Carrito</SheetTitle>
            {items.length > 0 ? (
              <Button variant="ghost" size="sm" onClick={onClear}>
                Vaciar
              </Button>
            ) : null}
          </div>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">Tu carrito esta vacio</p>
              <p className="text-sm text-muted-foreground">
                Agrega productos para enviarlos por WhatsApp.
              </p>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className={cn("border bg-background p-4", template.layout === "luxury" ? "rounded-none" : "rounded-2xl")}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.branchName || "Catalogo general"}
                        </p>
                        <p className="mt-1 text-sm font-medium">
                          {formatMoney(item.price, item.currency)}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon-sm" onClick={() => onRemove(item.productId)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      <p className="text-sm font-semibold">
                        {formatMoney(item.price * item.quantity, item.currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total estimado</span>
                <span className="text-lg font-semibold">
                  {formatMoney(total, items[0]?.currency || "USD")}
                </span>
              </div>

              <Button
                asChild={Boolean(whatsappUrl)}
                className={`w-full ${template.buttonClassName}`}
                disabled={!whatsappUrl}
              >
                {whatsappUrl ? (
                  <a href={whatsappUrl} target="_blank" rel="noreferrer">
                    Enviar pedido por WhatsApp
                  </a>
                ) : (
                  <span>Configura WhatsApp para enviar</span>
                )}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function StorefrontHeader({
  storefront,
  cartCount,
  onOpenCart,
  navigation,
  activeSection,
  onSectionChange,
}: {
  storefront: PublicEcommerceStorefront;
  cartCount?: number;
  onOpenCart?: () => void;
  navigation: string[];
  activeSection: StorefrontSectionKey;
  onSectionChange?: (section: StorefrontSectionKey) => void;
}) {
  const template = getEcommerceTemplate(storefront.template_slug);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const mobileNavigation = (
    <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
      <SheetContent side="left" className="w-[300px] sm:w-[360px]">
        <SheetHeader className="space-y-2">
          <SheetTitle style={{ fontFamily: template.fontDisplay }}>
            {storefront.store_name}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-8 flex flex-col gap-2">
          {navigation.map((item, index) => {
            const sectionKey = getNavigationSectionKey(item);
            const isActive = sectionKey ? activeSection === sectionKey : index === 0;

            return (
              <button
                type="button"
                key={item}
                onClick={() => {
                  if (sectionKey) {
                    onSectionChange?.(sectionKey);
                  }
                  setIsMobileNavOpen(false);
                }}
                className={cn(
                  "flex items-center justify-between rounded-xl px-4 py-3 text-left text-sm transition-colors",
                  isActive
                    ? "bg-foreground text-background"
                    : "bg-muted/50 text-foreground hover:bg-muted",
                  !sectionKey && "cursor-default",
                )}
              >
                <span>{item}</span>
                {isActive ? <ArrowRight className="h-4 w-4" /> : null}
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );

  if (template.layout === "neo") {
    return (
      <>
        <header className="sticky top-0 z-40 border-b border-white/10 bg-black/40 backdrop-blur-2xl">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-4 md:px-8">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white md:hidden"
              onClick={() => setIsMobileNavOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div
              className="text-2xl font-black tracking-tight text-[color:var(--ecommerce-primary)]"
              style={{ fontFamily: template.fontDisplay }}
            >
              {storefront.store_name}
            </div>
            <nav className="hidden items-center gap-8 md:flex">
              {navigation.map((item, index) => {
                const sectionKey = getNavigationSectionKey(item);
                const isActive = sectionKey ? activeSection === sectionKey : index === 0;

                return (
                <button
                  type="button"
                  key={item}
                  onClick={() => sectionKey && onSectionChange?.(sectionKey)}
                  className={cn(
                    "text-sm font-medium transition-colors",
                    isActive ? "border-b-2 border-[color:var(--ecommerce-primary)] pb-1 text-white" : "text-slate-400",
                    !sectionKey && "cursor-default",
                  )}
                >
                  {item}
                </button>
              )})}
            </nav>
            {onOpenCart ? (
              <Button variant="ghost" className="gap-3 rounded-full px-3 text-white md:px-4" onClick={onOpenCart}>
                <ShoppingBag className="h-4 w-4" />
                <span className="hidden sm:inline">Cart</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
                  {cartCount || 0}
                </span>
              </Button>
            ) : null}
          </div>
        </header>
        {mobileNavigation}
      </>
    );
  }

  if (template.layout === "organic") {
    return (
      <>
        <header className="sticky top-0 z-40 border-b border-stone-200/60 bg-[#faf7f1]/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6 md:py-5">
            <div
              className="text-xl font-bold tracking-tight text-[color:var(--ecommerce-primary)]"
              style={{ fontFamily: template.fontDisplay }}
            >
              {storefront.store_name}
            </div>
            <nav className="hidden items-center gap-8 md:flex">
              {navigation.map((item, index) => {
                const sectionKey = getNavigationSectionKey(item);
                const isActive = sectionKey ? activeSection === sectionKey : index === 0;

                return (
                <button
                  type="button"
                  key={item}
                  onClick={() => sectionKey && onSectionChange?.(sectionKey)}
                  className={cn(
                    "font-medium transition-colors",
                    isActive
                      ? "border-b-2 border-[color:var(--ecommerce-primary)] pb-1 text-[color:var(--ecommerce-primary)]"
                      : "text-[color:var(--ecommerce-primary)]/60",
                    !sectionKey && "cursor-default",
                  )}
                >
                  {item}
                </button>
              )})}
            </nav>
            {onOpenCart ? (
              <Button variant="ghost" className="gap-3 rounded-xl" onClick={onOpenCart}>
                <ShoppingBag className="h-4 w-4" />
                <span className="rounded-full bg-[color:var(--ecommerce-primary)] px-2 py-0.5 text-[10px] text-white">
                  {cartCount || 0}
                </span>
              </Button>
            ) : null}
          </div>
        </header>

        {onOpenCart ? (
          <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-[1.5rem] border border-stone-200/80 bg-[#faf7f1]/95 px-4 py-3 shadow-xl backdrop-blur-md md:hidden">
            <span className="text-xs font-medium text-[color:var(--ecommerce-primary)]">Bag</span>
            <Button className="rounded-xl" size="sm" onClick={onOpenCart}>
              <ShoppingBag className="mr-2 h-4 w-4" />
              {cartCount || 0}
            </Button>
          </div>
        ) : null}
      </>
    );
  }

  if (template.layout === "luxury") {
    return (
      <>
        <header className="sticky top-0 z-40 border-b border-black/10 bg-[#f8f5ef]/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1920px] items-center justify-between px-4 py-5 md:px-12 md:py-6">
            <div className="flex items-center gap-4 md:gap-10">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center border border-black/10 md:hidden"
                onClick={() => setIsMobileNavOpen(true)}
                aria-label="Abrir menu"
              >
                <Menu className="h-4 w-4" />
              </button>
              <div
                className="text-lg uppercase tracking-[0.2em] md:text-2xl"
                style={{ fontFamily: template.fontDisplay }}
              >
                {storefront.store_name}
              </div>
              <nav className="hidden items-center gap-7 md:flex">
                {navigation.map((item, index) => {
                  const sectionKey = getNavigationSectionKey(item);
                  const isActive = sectionKey ? activeSection === sectionKey : index === 0;

                  return (
                  <button
                    type="button"
                    key={item}
                    onClick={() => sectionKey && onSectionChange?.(sectionKey)}
                    className={cn(
                      "text-2xl tracking-tight transition-colors",
                      isActive ? "border-b border-black pb-1 text-black" : "text-stone-500",
                      !sectionKey && "cursor-default",
                    )}
                    style={{ fontFamily: template.fontDisplay }}
                  >
                    {item}
                  </button>
                )})}
              </nav>
            </div>
            {onOpenCart ? (
              <Button variant="ghost" className="gap-3 rounded-none" onClick={onOpenCart}>
                <ShoppingBag className="h-4 w-4" />
                <span className="text-xs uppercase tracking-[0.22em]">{cartCount || 0}</span>
              </Button>
            ) : null}
          </div>
        </header>
        {mobileNavigation}
      </>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-stone-200/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-4 py-4 md:px-6">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 md:hidden"
            onClick={() => setIsMobileNavOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="text-xl font-bold uppercase tracking-tight">{storefront.store_name}</div>
          <nav className="hidden items-center gap-8 md:flex">
            {navigation.map((item, index) => {
              const sectionKey = getNavigationSectionKey(item);
              const isActive = sectionKey ? activeSection === sectionKey : index === 0;

              return (
              <button
                type="button"
                key={item}
                onClick={() => sectionKey && onSectionChange?.(sectionKey)}
                className={cn(
                  "transition-colors",
                  isActive ? "border-b-2 border-black pb-1 font-semibold text-black" : "text-stone-500",
                  !sectionKey && "cursor-default",
                )}
              >
                {item}
              </button>
            )})}
          </nav>
          {onOpenCart ? (
            <Button variant="ghost" className="gap-3 rounded-full" onClick={onOpenCart}>
              <ShoppingBag className="h-4 w-4" />
              <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px]">{cartCount || 0}</span>
            </Button>
          ) : null}
        </div>
      </header>
      {mobileNavigation}
    </>
  );
}

function StorefrontHero({ storefront }: { storefront: PublicEcommerceStorefront }) {
  const template = getEcommerceTemplate(storefront.template_slug);
  const title = storefront.hero_title || storefront.store_name;
  const subtitle =
    storefront.hero_subtitle ||
    "Explora el catalogo completo y arma tu pedido por WhatsApp.";

  if (template.layout === "neo") {
    return (
      <section className="relative overflow-hidden border-b border-white/10 bg-[#0e1017]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,71,255,0.18),transparent_40%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(19,19,20,0.95),rgba(9,15,42,0.92))]" />
        <div className="relative mx-auto flex min-h-[560px] max-w-[1600px] items-center justify-center px-6 py-20 text-center md:px-12">
          <div className="max-w-4xl">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--ecommerce-primary)]">
              <span className="h-2 w-2 rounded-full bg-[color:var(--ecommerce-primary)] shadow-[0_0_20px_var(--ecommerce-primary)]" />
              {template.badge}
            </span>
            <h1
              className="text-5xl font-bold leading-[0.92] text-white md:text-7xl"
              style={{ fontFamily: template.fontDisplay }}
            >
              {title}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              {subtitle}
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (template.layout === "organic") {
    return (
      <section className="relative overflow-hidden rounded-[1.75rem] border border-stone-200/70 bg-[#f4f0e8]">
        <div className="absolute right-[-8%] top-[-12%] h-[320px] w-[320px] rounded-[40%_60%_70%_30%/40%_50%_60%_50%] bg-[#e6ded0] opacity-70 blur-3xl" />
        <div className="absolute bottom-[-12%] left-[-8%] h-[260px] w-[260px] rounded-[60%_40%_30%_70%/60%_30%_70%_40%] bg-[color:var(--ecommerce-secondary)]/20 blur-3xl" />
        <div className="grid min-h-[420px] gap-8 p-8 md:grid-cols-[1fr_1.05fr] md:p-10">
          <div className="relative z-10 flex items-center">
            <div className="rounded-[1.5rem] bg-[#faf7f1]/80 p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-md">
              <h1
                className="text-4xl font-bold tracking-tight md:text-5xl"
                style={{
                  fontFamily: template.fontDisplay,
                  color: "var(--ecommerce-primary)",
                }}
              >
                {title}
              </h1>
              <p className="mt-4 max-w-xl text-lg leading-8 text-stone-600">{subtitle}</p>
            </div>
          </div>

          <div className="relative min-h-[260px] overflow-hidden rounded-[1.5rem] bg-[#ede7db]">
            {storefront.hero_image_url ? (
              <img
                src={storefront.hero_image_url}
                alt={storefront.store_name}
                className="absolute inset-0 h-full w-full object-cover opacity-85 mix-blend-multiply"
              />
            ) : (
              <div className="flex h-full items-center justify-center px-10 text-center text-sm text-stone-500">
                Imagen hero personalizable desde configuracion
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (template.layout === "luxury") {
    return (
      <section className={cn("overflow-hidden px-8 py-14 md:px-20 md:py-24", template.heroClassName)}>
        <div className="mx-auto max-w-4xl space-y-8 text-center">
          <p className="text-xs uppercase tracking-[0.32em] text-stone-500">{template.badge}</p>
          <h1
            className="text-5xl leading-[0.9] tracking-tight md:text-7xl"
            style={{ fontFamily: template.fontDisplay }}
          >
            {title}
          </h1>
          <p className="mx-auto max-w-2xl text-lg font-light leading-8 text-stone-600">
            {subtitle}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={cn("overflow-hidden rounded-lg border px-6 py-10 text-center md:px-10 md:py-14", template.heroClassName, template.panelClassName)}>
      <p className="mb-3 text-xs uppercase tracking-[0.34em] text-stone-500">{template.badge}</p>
      <h1
        className="mx-auto max-w-4xl text-5xl font-bold leading-none md:text-6xl"
        style={{ fontFamily: template.fontDisplay }}
      >
        {title}
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-lg text-stone-600">{subtitle}</p>
    </section>
  );
}

function CatalogControls({
  storefront,
  categories,
  search,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
}: {
  storefront: PublicEcommerceStorefront;
  categories: string[];
  search: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
}) {
  const template = getEcommerceTemplate(storefront.template_slug);

  return (
    <section
      className={cn(
        "grid gap-3 lg:grid-cols-[1fr_240px]",
        template.layout === "luxury" && "border-b border-black/10 pb-8",
      )}
    >
      {storefront.show_search ? (
        <div className={cn("relative border px-3 py-2", template.controlClassName, template.layout === "luxury" ? "rounded-none" : "rounded-2xl")}>
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="border-0 bg-transparent pl-8 shadow-none"
            placeholder="Busca por nombre, SKU o marca"
          />
        </div>
      ) : null}

      {storefront.show_categories ? (
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger
            className={cn(
              "border",
              template.controlClassName,
              template.layout === "luxury" ? "rounded-none" : "rounded-2xl",
            )}
          >
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorias</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </section>
  );
}

function EmptyCatalogState({ storefront }: { storefront: PublicEcommerceStorefront }) {
  const template = getEcommerceTemplate(storefront.template_slug);

  return (
    <div
      className={cn(
        "border border-dashed p-12 text-center",
        template.panelClassName,
        template.layout === "luxury" ? "rounded-none" : "rounded-[2rem]",
      )}
    >
      <Package className="mx-auto h-12 w-12 text-muted-foreground" />
      <h3 className="mt-4 text-xl font-semibold">No hay productos para mostrar</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Ajusta la busqueda o cambia la categoria seleccionada.
      </p>
    </div>
  );
}

function CatalogGrid({
  tenantSlug,
  storefront,
  products,
  onAddToCart,
}: {
  tenantSlug: string;
  storefront: PublicEcommerceStorefront;
  products: PublicEcommerceProduct[];
  onAddToCart: (product: PublicEcommerceProduct) => void;
}) {
  const template = getEcommerceTemplate(storefront.template_slug);

  return (
    <div
      className={cn(
        "grid gap-6",
        template.layout === "neo" && "sm:grid-cols-2 xl:grid-cols-4",
        template.layout === "organic" && "sm:grid-cols-2 xl:grid-cols-4",
        template.layout === "luxury" && "sm:grid-cols-2 xl:grid-cols-4 gap-x-8 gap-y-16",
        template.layout === "editorial" && "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
      )}
    >
      {products.map((product, index) => (
        <ProductCard
          key={product.product_id}
          tenantSlug={tenantSlug}
          storefront={storefront}
          product={product}
          index={index}
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  );
}

function EditorialSectionContent({
  storefront,
  section,
}: {
  storefront: PublicEcommerceStorefront;
  section: Exclude<StorefrontSectionKey, "shop">;
}) {
  const template = getEcommerceTemplate(storefront.template_slug);
  const sections = getStorefrontSections(storefront);

  if (section === "story") {
    const story = sections.story;
    const imageUrl = resolveProductImageUrl(story.image_url);

    return (
      <section
        className={cn(
          "grid gap-8 border p-6 md:p-10 lg:grid-cols-[0.9fr_1.1fr]",
          template.panelClassName,
          template.layout === "luxury" ? "rounded-none" : "rounded-[2rem]",
        )}
      >
        <div className="space-y-4">
          <div className={cn("overflow-hidden border bg-black/5", template.layout === "luxury" ? "rounded-none" : "rounded-[1.5rem]")}>
            <div className="aspect-[4/5]">
              {imageUrl ? (
                <HoverZoomImage
                  src={imageUrl}
                  alt={story.owner_name || storefront.store_name}
                  previewClassName="border-black/10 bg-white/95"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-black/5 px-8 text-center text-sm text-muted-foreground">
                  Sube aqui la imagen del fundador o del owner desde configuracion.
                </div>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              {story.owner_name}
            </p>
            <p className="text-sm text-muted-foreground">{story.owner_role}</p>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-4xl leading-tight" style={{ fontFamily: template.fontDisplay }}>
            {story.title}
          </h2>
          <p className="text-base leading-8 text-muted-foreground">{story.body}</p>
          {story.owner_quote ? (
            <blockquote className="border-l-2 border-[color:var(--ecommerce-primary)] pl-5 text-lg italic leading-8 text-foreground/90">
              "{story.owner_quote}"
            </blockquote>
          ) : null}
        </div>
      </section>
    );
  }

  const current = section === "discovery" ? sections.discovery : sections.journal;
  const imageUrl = resolveProductImageUrl(current.image_url);

  return (
    <section
      className={cn(
        "grid gap-8 border p-6 md:p-10 lg:grid-cols-[1.05fr_0.95fr]",
        template.panelClassName,
        template.layout === "luxury" ? "rounded-none" : "rounded-[2rem]",
      )}
    >
      <div className="space-y-5">
        <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground">
          {current.eyebrow || (section === "discovery" ? "Discovery" : "Journal")}
        </p>
        <h2 className="text-4xl leading-tight" style={{ fontFamily: template.fontDisplay }}>
          {current.title}
        </h2>
        <p className="max-w-2xl text-base leading-8 text-muted-foreground">
          {current.body}
        </p>
        {current.cta_label ? (
          <Button className={template.buttonClassName}>{current.cta_label}</Button>
        ) : null}
      </div>

      <div className={cn("overflow-hidden border bg-black/5", template.layout === "luxury" ? "rounded-none" : "rounded-[1.5rem]")}>
        <div className="aspect-[4/5]">
          {imageUrl ? (
            <HoverZoomImage
              src={imageUrl}
              alt={current.title}
              previewClassName="border-black/10 bg-white/95"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-black/5 px-8 text-center text-sm text-muted-foreground">
              Configura una imagen editorial para esta seccion desde el panel.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function StorefrontFooter({ storefront }: { storefront: PublicEcommerceStorefront }) {
  const template = getEcommerceTemplate(storefront.template_slug);

  return (
    <footer className={cn("mt-20 border-t px-6 py-10", template.footerClassName)}>
      <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-6 md:flex-row">
        <div className="text-center md:text-left">
          <div
            className={cn(
              "text-lg",
              template.layout === "luxury" ? "uppercase tracking-[0.2em]" : "font-semibold",
            )}
            style={{ fontFamily: template.fontDisplay }}
          >
            {storefront.store_name}
          </div>
          <p className="mt-2 text-xs uppercase tracking-[0.22em] opacity-80">
            {getTemplateFooterCopy(storefront)}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6 text-xs uppercase tracking-[0.22em] opacity-80">
          <span>Privacy</span>
          <span>Shipping</span>
          <span>Returns</span>
          <span>Contact</span>
        </div>
      </div>
    </footer>
  );
}

function StorefrontShell({
  storefront,
  cartCount,
  onOpenCart,
  children,
  allowEditorialTabs = false,
}: {
  storefront: PublicEcommerceStorefront;
  cartCount?: number;
  onOpenCart?: () => void;
  children: ReactNode;
  allowEditorialTabs?: boolean;
}) {
  const template = getEcommerceTemplate(storefront.template_slug);
  const style = getTemplateSurfaceStyle(storefront);
  const sections = getStorefrontSections(storefront);
  const navigation = getVisibleNavigation(storefront, sections);
  const [activeSection, setActiveSection] = useState<StorefrontSectionKey>("shop");
  const [displaySection, setDisplaySection] = useState<StorefrontSectionKey>("shop");
  const [isSectionFading, setIsSectionFading] = useState(false);
  const sectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (sectionTimerRef.current) {
        clearTimeout(sectionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!allowEditorialTabs && activeSection !== "shop") {
      setActiveSection("shop");
      setDisplaySection("shop");
      setIsSectionFading(false);
    }
  }, [activeSection, allowEditorialTabs]);

  const handleSectionChange = (nextSection: StorefrontSectionKey) => {
    if (!allowEditorialTabs) return;
    if (nextSection === activeSection) return;

    setActiveSection(nextSection);
    setIsSectionFading(true);

    if (sectionTimerRef.current) {
      clearTimeout(sectionTimerRef.current);
    }

    sectionTimerRef.current = setTimeout(() => {
      setDisplaySection(nextSection);
      setIsSectionFading(false);
    }, 140);
  };

  return (
    <main className={cn("min-h-screen", template.shellClassName)} style={style}>
      {storefront.announcement_bar ? (
        <div className="border-b border-black/5 bg-black/5 px-4 py-2 text-center text-xs uppercase tracking-[0.22em]">
          {storefront.announcement_bar}
        </div>
      ) : null}

      <StorefrontHeader
        storefront={storefront}
        cartCount={cartCount}
        onOpenCart={onOpenCart}
        navigation={navigation}
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
      />

      <div
        className={cn(
          "mx-auto w-full",
          template.layout === "neo" && "max-w-[1600px]",
          template.layout === "organic" && "max-w-7xl px-4 py-6 md:px-6 md:py-8",
          template.layout === "luxury" && "max-w-[1920px]",
          template.layout === "editorial" && "max-w-screen-2xl px-6 py-6",
        )}
      >
        {template.layout === "neo" ? (
          <div className="lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]">
            <aside className="hidden min-h-full border-r border-white/10 bg-black/25 p-6 lg:block">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-blue-100">{getTemplateSidebarTitle(template.slug)}</h2>
                <p className="text-sm text-slate-500">{getTemplateSidebarDescription(template.slug)}</p>
              </div>
            </aside>
            <div>
              {displaySection === "shop" ? <StorefrontHero storefront={storefront} /> : null}
              <div className={cn("px-6 py-12 md:px-10 transition-opacity duration-300", isSectionFading && "opacity-0")}>
                {displaySection === "shop" ? children : <EditorialSectionContent storefront={storefront} section={displaySection as Exclude<StorefrontSectionKey, "shop">} />}
              </div>
            </div>
          </div>
        ) : template.layout === "luxury" ? (
          <div className="md:grid md:grid-cols-[20rem_minmax(0,1fr)]">
            <aside className="hidden border-r border-black/10 bg-[#f3efe7] px-10 pt-16 md:block">
              <div className="space-y-2">
                <h2 className="text-sm uppercase tracking-[0.1em] text-stone-900">
                  {getTemplateSidebarTitle(template.slug)}
                </h2>
                <p
                  className="text-sm italic text-stone-500"
                  style={{ fontFamily: template.fontDisplay }}
                >
                  {getTemplateSidebarDescription(template.slug)}
                </p>
              </div>
            </aside>
            <div className="px-6 py-10 md:px-16 md:py-12">
              {displaySection === "shop" ? <StorefrontHero storefront={storefront} /> : null}
              <div className={cn("pt-10 transition-opacity duration-300", isSectionFading && "opacity-0")}>
                {displaySection === "shop" ? children : <EditorialSectionContent storefront={storefront} section={displaySection as Exclude<StorefrontSectionKey, "shop">} />}
              </div>
            </div>
          </div>
        ) : (
          <div className={cn(template.layout === "editorial" && "md:flex md:gap-10")}>
            {template.layout === "editorial" ? (
              <aside className="hidden w-64 shrink-0 border-r-0 bg-stone-50 p-6 md:sticky md:top-24 md:block md:h-fit">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold">{getTemplateSidebarTitle(template.slug)}</h2>
                  <p className="text-xs text-stone-500">{getTemplateSidebarDescription(template.slug)}</p>
                </div>
              </aside>
            ) : null}

            <div className="min-w-0 flex-1">
              {displaySection === "shop" ? <StorefrontHero storefront={storefront} /> : null}
              <div
                className={cn(
                  "pt-10 transition-opacity duration-300",
                  template.layout === "organic" && "pb-10",
                  isSectionFading && "opacity-0",
                )}
              >
                {displaySection === "shop" ? children : <EditorialSectionContent storefront={storefront} section={displaySection as Exclude<StorefrontSectionKey, "shop">} />}
              </div>
            </div>
          </div>
        )}
      </div>

      <StorefrontFooter storefront={storefront} />
    </main>
  );
}

export function EcommerceCatalogView({
  tenantSlug,
  storefront,
  products,
  categories,
  search,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  cartCount,
  onOpenCart,
  onAddToCart,
}: {
  tenantSlug: string;
  storefront: PublicEcommerceStorefront;
  products: PublicEcommerceProduct[];
  categories: string[];
  search: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  cartCount: number;
  onOpenCart: () => void;
  onAddToCart: (product: PublicEcommerceProduct) => void;
}) {
  const template = getEcommerceTemplate(storefront.template_slug);

  return (
    <StorefrontShell
      storefront={storefront}
      cartCount={cartCount}
      onOpenCart={onOpenCart}
      allowEditorialTabs
    >
      <div className="space-y-10">
        <CatalogControls
          storefront={storefront}
          categories={categories}
          search={search}
          onSearchChange={onSearchChange}
          selectedCategory={selectedCategory}
          onCategoryChange={onCategoryChange}
        />

        <section className={cn(template.layout === "neo" && "space-y-8", template.layout !== "neo" && "space-y-6")}>
          <div
            className={cn(
              "flex flex-col gap-3",
              template.layout === "neo" && "border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between",
              template.layout === "organic" && "md:flex-row md:items-end md:justify-between",
              template.layout === "luxury" && "md:flex-row md:items-end md:justify-between",
              template.layout === "editorial" && "md:flex-row md:items-end md:justify-between",
            )}
          >
            <div>
              <h2
                className={cn(
                  "text-3xl font-bold",
                  template.layout === "luxury" && "text-4xl tracking-tight",
                )}
                style={{ fontFamily: template.fontDisplay }}
              >
                {getTemplateCollectionTitle(template.slug)}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {getTemplateCollectionSubtitle(template.slug)}
              </p>
            </div>
            <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              {products.length} items
            </div>
          </div>

          {products.length === 0 ? (
            <EmptyCatalogState storefront={storefront} />
          ) : (
            <CatalogGrid
              tenantSlug={tenantSlug}
              storefront={storefront}
              products={products}
              onAddToCart={onAddToCart}
            />
          )}
        </section>
      </div>
    </StorefrontShell>
  );
}

export function EcommerceProductDetailView({
  tenantSlug,
  storefront,
  product,
  cartCount,
  onOpenCart,
  onAddToCart,
}: {
  tenantSlug: string;
  storefront: PublicEcommerceStorefront;
  product: PublicEcommerceProduct;
  cartCount: number;
  onOpenCart: () => void;
  onAddToCart: (product: PublicEcommerceProduct) => void;
}) {
  const template = getEcommerceTemplate(storefront.template_slug);
  const images = parseProductImages(product.images);
  const [activeImage, setActiveImage] = useState(0);
  const currentImage = images[activeImage];
  const imageUrl = currentImage
    ? resolveProductImageUrl(currentImage.storage_path)
    : null;

  return (
    <StorefrontShell
      storefront={storefront}
      cartCount={cartCount}
      onOpenCart={onOpenCart}
    >
      <Button variant="ghost" asChild className="mb-6">
        <Link href={`/t/${tenantSlug}/products`}>Volver al catalogo</Link>
      </Button>

      <section
        className={cn(
          "grid gap-8",
          template.layout === "neo" && "lg:grid-cols-[1.1fr_0.9fr]",
          template.layout === "organic" && "lg:grid-cols-[1.02fr_0.98fr]",
          template.layout === "luxury" && "lg:grid-cols-[1.1fr_0.9fr]",
          template.layout === "editorial" && "lg:grid-cols-[1.1fr_0.9fr]",
        )}
      >
        <div className="space-y-4">
          <div
            className={cn(
              "overflow-hidden border bg-black/5",
              template.panelClassName,
              template.imageMaskClassName,
            )}
          >
            <div className="aspect-[4/4.8]">
              {imageUrl ? (
                <HoverZoomImage
                  src={imageUrl}
                  alt={product.name}
                  previewClassName={cn(
                    template.layout === "neo" && "border-white/10 bg-[#141822]/92",
                    template.layout === "organic" && "border-stone-200/80 bg-[#faf7f1]/95",
                    template.layout === "luxury" && "rounded-none border-black/10 bg-[#faf7f1]/95",
                    template.layout === "editorial" && "border-stone-200/80 bg-white/95",
                  )}
                />
              ) : (
                <ProductFallback />
              )}
            </div>
          </div>

          {images.length > 1 ? (
            <div className="grid grid-cols-4 gap-3">
              {images.map((image, index) => {
                const thumbUrl = resolveProductImageUrl(
                  image.thumbnail_path || image.storage_path,
                );

                return (
                  <button
                    key={`${image.id || image.storage_path}-${index}`}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    className={cn(
                      "overflow-hidden border bg-black/5",
                      template.imageMaskClassName,
                      index === activeImage ? "border-primary" : "border-black/10",
                    )}
                  >
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={`${product.name} ${index + 1}`}
                        className="aspect-square h-full w-full object-cover"
                      />
                    ) : (
                      <ProductFallback compact />
                    )}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            "border p-6 md:p-8",
            template.panelClassName,
            template.layout === "luxury" ? "rounded-none" : "rounded-[2rem]",
          )}
        >
          {storefront.show_branch_badge && product.branch_name ? (
            <span className={cn("inline-flex items-center gap-2 border px-3 py-1 text-[11px]", template.chipClassName)}>
              <Store className="h-3 w-3" />
              {product.branch_name}
            </span>
          ) : null}

          <h2
            className="mt-4 text-4xl leading-none"
            style={{ fontFamily: template.fontDisplay }}
          >
            {product.name}
          </h2>

          <p className="mt-4 text-base leading-7 text-muted-foreground">
            {product.description || product.brand || "Producto disponible para pedido por WhatsApp."}
          </p>

          <div
            className={cn(
              "mt-8 space-y-3 p-5",
              template.layout === "luxury" ? "rounded-none bg-black/0" : "rounded-2xl bg-black/5",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Precio</span>
              <span className="text-xl font-semibold">
                {storefront.show_prices
                  ? formatMoney(product.price, product.currency_iso)
                  : "Consultar"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Categoria</span>
              <span className="font-medium">{product.category || "General"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Marca</span>
              <span className="font-medium">{product.brand || "No especificada"}</span>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button className={cn("flex-1", template.buttonClassName)} onClick={() => onAddToCart(product)}>
              Agregar al carrito
            </Button>
            <Button
              variant="outline"
              className={cn("flex-1", template.buttonClassName)}
              onClick={onOpenCart}
            >
              Ver carrito
            </Button>
          </div>

          <div className="mt-8 border-t border-black/10 pt-6">
            <Link
              href={`/t/${tenantSlug}/products`}
              className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-foreground"
            >
              Seguir explorando
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </StorefrontShell>
  );
}

export function EcommerceStorefrontPreview({
  storefront,
  products,
}: {
  storefront: PublicEcommerceStorefront;
  products: PublicEcommerceProduct[];
}) {
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [iframeNode, setIframeNode] = useState<HTMLIFrameElement | null>(null);
  const [mountNode, setMountNode] = useState<HTMLDivElement | null>(null);
  const previewProducts = useMemo(() => products.slice(0, 4), [products]);
  const isMobileViewport = viewport === "mobile";
  const iframeMarkup = useMemo(
    () => `<!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            html, body {
              margin: 0;
              min-height: 100%;
              background: transparent;
            }

            body {
              overflow-y: auto;
            }

            #ecommerce-preview-root {
              min-height: 100%;
            }
          </style>
        </head>
        <body>
          <div id="ecommerce-preview-root"></div>
        </body>
      </html>`,
    [],
  );

  const syncIframeDocument = useCallback((node: HTMLIFrameElement | null) => {
    if (!node) return;

    const doc = node.contentDocument;

    if (!doc) return;

    const root = doc.getElementById("ecommerce-preview-root");

    if (!root) return;

    const sourceNodes = Array.from(
      document.head.querySelectorAll('style, link[rel="stylesheet"]'),
    );

    for (const clonedNode of Array.from(doc.head.querySelectorAll("[data-preview-clone]"))) {
      clonedNode.remove();
    }

    for (const sourceNode of sourceNodes) {
      const clone = sourceNode.cloneNode(true);

      if (clone instanceof HTMLElement) {
        clone.setAttribute("data-preview-clone", "true");
      }

      doc.head.appendChild(clone);
    }

    setMountNode(root as HTMLDivElement);
  }, []);

  useEffect(() => {
    syncIframeDocument(iframeNode);

    return () => {
      setMountNode(null);
    };
  }, [iframeNode, syncIframeDocument]);

  return (
    <div className="overflow-hidden rounded-[28px] border bg-muted/20 shadow-sm">
      <div className="flex items-center justify-end border-b bg-background/80 px-4 py-3 backdrop-blur-sm sm:px-5">
        <div className="inline-flex items-center gap-1 rounded-full border bg-background p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setViewport("desktop")}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition-all duration-300",
              viewport === "desktop"
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={viewport === "desktop"}
          >
            <Monitor className="h-4 w-4" />
            Desktop
          </button>
          <button
            type="button"
            onClick={() => setViewport("mobile")}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition-all duration-300",
              viewport === "mobile"
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={viewport === "mobile"}
          >
            <Smartphone className="h-4 w-4" />
            Mobile
          </button>
        </div>
      </div>

      <div className="overflow-hidden p-3 sm:p-4">
        <div
          className={cn(
            "mx-auto overflow-hidden border bg-background shadow-[0_18px_50px_rgba(15,23,42,0.10)] transition-[max-width,border-radius,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            isMobileViewport
              ? "max-w-[390px] rounded-[2rem]"
              : "max-w-full rounded-[1.75rem]",
          )}
        >
          <iframe
            ref={setIframeNode}
            title="Preview storefront ecommerce"
            srcDoc={iframeMarkup}
            onLoad={(event) =>
              syncIframeDocument(event.currentTarget as HTMLIFrameElement)
            }
            className={cn(
              "block w-full border-0 bg-transparent transition-[height] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
              isMobileViewport ? "h-[780px]" : "h-[860px]",
            )}
          />
          {mountNode
            ? createPortal(
                <EcommerceCatalogView
                  tenantSlug={storefront.tenant_slug}
                  storefront={storefront}
                  products={previewProducts}
                  categories={[]}
                  search=""
                  onSearchChange={() => {}}
                  selectedCategory="all"
                  onCategoryChange={() => {}}
                  cartCount={2}
                  onOpenCart={() => {}}
                  onAddToCart={() => {}}
                />,
                mountNode,
              )
            : null}
        </div>
      </div>
    </div>
  );
}
