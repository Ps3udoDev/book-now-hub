"use client";

import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Palette,
  Save,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { EcommerceTourButton } from "@/features/ecommerce/components/ecommerce-tour";
import { EcommerceStorefrontPreview } from "@/features/ecommerce/components/storefront";
import { ecommerceTemplates } from "@/features/ecommerce/templates";
import { useTenantEcommerceSettings } from "@/hooks/supabase/use-ecommerce";
import {
  ecommerceService,
  type PublicEcommerceProduct,
  type PublicEcommerceStorefront,
} from "@/lib/services/ecommerce";
import { storageService } from "@/lib/services/storage";
import { useAuthStore } from "@/lib/stores/auth-store";

type EcommerceEditorialSection = {
  enabled: boolean;
  eyebrow: string;
  title: string;
  body: string;
  image_url: string;
  cta_label: string;
};

type EcommerceStorySection = {
  enabled: boolean;
  title: string;
  body: string;
  image_url: string;
  owner_name: string;
  owner_role: string;
  owner_quote: string;
};

type EcommerceCustomSections = {
  discovery: EcommerceEditorialSection;
  story: EcommerceStorySection;
  journal: EcommerceEditorialSection;
};

type EcommerceFormState = {
  is_enabled: boolean;
  is_public: boolean;
  template_slug: string;
  public_path: string;
  brand_name: string;
  logo_url: string;
  hero_title: string;
  hero_subtitle: string;
  hero_image_url: string;
  announcement_bar: string;
  whatsapp_number: string;
  whatsapp_message_template: string;
  seo_title: string;
  seo_description: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  surface_color: string;
  text_color: string;
  button_radius: string;
  show_search: boolean;
  show_categories: boolean;
  show_prices: boolean;
  show_branch_badge: boolean;
  show_whatsapp_button: boolean;
  product_sort: string;
  custom_sections: EcommerceCustomSections;
};

type SectionImageFiles = Record<keyof EcommerceCustomSections, File | null>;

const DEFAULT_CUSTOM_SECTIONS: EcommerceCustomSections = {
  discovery: {
    enabled: true,
    eyebrow: "Discovery",
    title: "Explora la curaduria de la tienda",
    body: "Una seleccion pensada para que el catalogo se sienta mas editorial, aspiracional y util para convertir.",
    image_url: "",
    cta_label: "Explorar seleccion",
  },
  story: {
    enabled: true,
    title: "La vision detras de la marca",
    body: "Cuenta quien esta detras del proyecto, que busca transmitir y por que esta tienda existe.",
    image_url: "",
    owner_name: "Nombre del fundador",
    owner_role: "Founder / Director",
    owner_quote:
      "Nuestra vision es que cada producto se sienta como una recomendacion personal.",
  },
  journal: {
    enabled: true,
    eyebrow: "Journal",
    title: "Notas, rituales y recomendaciones",
    body: "Un bloque para compartir tips, rutinas, novedades o contenido de marca dentro del storefront.",
    image_url: "",
    cta_label: "Leer mas",
  },
};

function normalizeCustomSections(raw: unknown): EcommerceCustomSections {
  const current =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const discovery =
    current.discovery && typeof current.discovery === "object"
      ? (current.discovery as Record<string, unknown>)
      : {};
  const story =
    current.story && typeof current.story === "object"
      ? (current.story as Record<string, unknown>)
      : {};
  const journal =
    current.journal && typeof current.journal === "object"
      ? (current.journal as Record<string, unknown>)
      : {};

  return {
    discovery: {
      ...DEFAULT_CUSTOM_SECTIONS.discovery,
      enabled:
        typeof discovery.enabled === "boolean"
          ? discovery.enabled
          : DEFAULT_CUSTOM_SECTIONS.discovery.enabled,
      eyebrow:
        typeof discovery.eyebrow === "string"
          ? discovery.eyebrow
          : DEFAULT_CUSTOM_SECTIONS.discovery.eyebrow,
      title:
        typeof discovery.title === "string"
          ? discovery.title
          : DEFAULT_CUSTOM_SECTIONS.discovery.title,
      body:
        typeof discovery.body === "string"
          ? discovery.body
          : DEFAULT_CUSTOM_SECTIONS.discovery.body,
      image_url:
        typeof discovery.image_url === "string" ? discovery.image_url : "",
      cta_label:
        typeof discovery.cta_label === "string"
          ? discovery.cta_label
          : DEFAULT_CUSTOM_SECTIONS.discovery.cta_label,
    },
    story: {
      ...DEFAULT_CUSTOM_SECTIONS.story,
      enabled:
        typeof story.enabled === "boolean"
          ? story.enabled
          : DEFAULT_CUSTOM_SECTIONS.story.enabled,
      title:
        typeof story.title === "string"
          ? story.title
          : DEFAULT_CUSTOM_SECTIONS.story.title,
      body:
        typeof story.body === "string"
          ? story.body
          : DEFAULT_CUSTOM_SECTIONS.story.body,
      image_url: typeof story.image_url === "string" ? story.image_url : "",
      owner_name:
        typeof story.owner_name === "string"
          ? story.owner_name
          : DEFAULT_CUSTOM_SECTIONS.story.owner_name,
      owner_role:
        typeof story.owner_role === "string"
          ? story.owner_role
          : DEFAULT_CUSTOM_SECTIONS.story.owner_role,
      owner_quote:
        typeof story.owner_quote === "string"
          ? story.owner_quote
          : DEFAULT_CUSTOM_SECTIONS.story.owner_quote,
    },
    journal: {
      ...DEFAULT_CUSTOM_SECTIONS.journal,
      enabled:
        typeof journal.enabled === "boolean"
          ? journal.enabled
          : DEFAULT_CUSTOM_SECTIONS.journal.enabled,
      eyebrow:
        typeof journal.eyebrow === "string"
          ? journal.eyebrow
          : DEFAULT_CUSTOM_SECTIONS.journal.eyebrow,
      title:
        typeof journal.title === "string"
          ? journal.title
          : DEFAULT_CUSTOM_SECTIONS.journal.title,
      body:
        typeof journal.body === "string"
          ? journal.body
          : DEFAULT_CUSTOM_SECTIONS.journal.body,
      image_url: typeof journal.image_url === "string" ? journal.image_url : "",
      cta_label:
        typeof journal.cta_label === "string"
          ? journal.cta_label
          : DEFAULT_CUSTOM_SECTIONS.journal.cta_label,
    },
  };
}

const DEFAULT_FORM: EcommerceFormState = {
  is_enabled: true,
  is_public: true,
  template_slug: "beauty-editorial",
  public_path: "products",
  brand_name: "",
  logo_url: "",
  hero_title: "Descubre tu proximo favorito",
  hero_subtitle:
    "Catalogo publico de productos de belleza disponible en todas las sucursales.",
  hero_image_url: "",
  announcement_bar: "",
  whatsapp_number: "",
  whatsapp_message_template:
    "Hola, quiero realizar este pedido:%0A{{items}}%0A%0ATotal estimado: {{total}}",
  seo_title: "",
  seo_description: "",
  primary_color: "#8b5e47",
  secondary_color: "#d6b7a5",
  accent_color: "#f0dfd4",
  background_color: "#fffaf6",
  surface_color: "#ffffff",
  text_color: "#221812",
  button_radius: "999px",
  show_search: true,
  show_categories: true,
  show_prices: true,
  show_branch_badge: true,
  show_whatsapp_button: true,
  product_sort: "name_asc",
  custom_sections: DEFAULT_CUSTOM_SECTIONS,
};

function buildPreviewStorefront(
  tenantSlug: string,
  tenantName: string,
  form: EcommerceFormState,
): PublicEcommerceStorefront {
  return {
    tenant_id: "",
    tenant_slug: tenantSlug,
    tenant_name: tenantName,
    store_name: form.brand_name || tenantName,
    logo_url: form.logo_url || "",
    template_slug: form.template_slug,
    public_path: form.public_path,
    hero_title: form.hero_title,
    hero_subtitle: form.hero_subtitle,
    hero_image_url: form.hero_image_url,
    announcement_bar: form.announcement_bar,
    whatsapp_number: form.whatsapp_number,
    whatsapp_message_template: form.whatsapp_message_template,
    seo_title: form.seo_title,
    seo_description: form.seo_description,
    primary_color: form.primary_color,
    secondary_color: form.secondary_color,
    accent_color: form.accent_color,
    background_color: form.background_color,
    surface_color: form.surface_color,
    text_color: form.text_color,
    button_radius: form.button_radius,
    show_search: form.show_search,
    show_categories: form.show_categories,
    show_prices: form.show_prices,
    show_branch_badge: form.show_branch_badge,
    show_whatsapp_button: form.show_whatsapp_button,
    product_sort: form.product_sort,
    custom_tokens: {},
    custom_sections: form.custom_sections,
  };
}

function createPreviewImage(
  title: string,
  subtitle: string,
  colors: {
    background: string;
    shape: string;
    accent: string;
    text: string;
  },
) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1125">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${colors.background}" />
          <stop offset="100%" stop-color="${colors.shape}" />
        </linearGradient>
      </defs>
      <rect width="900" height="1125" fill="url(#bg)" rx="42" />
      <circle cx="710" cy="220" r="180" fill="${colors.accent}" opacity="0.42" />
      <circle cx="260" cy="910" r="220" fill="${colors.accent}" opacity="0.18" />
      <rect x="130" y="170" width="640" height="770" rx="28" fill="rgba(255,255,255,0.18)" />
      <text x="140" y="860" fill="${colors.text}" font-size="54" font-family="Arial, sans-serif" font-weight="700">${title}</text>
      <text x="140" y="920" fill="${colors.text}" font-size="28" font-family="Arial, sans-serif" opacity="0.8">${subtitle}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function buildTemplateMockProducts(
  templateSlug: string,
  tenantSlug: string,
): PublicEcommerceProduct[] {
  const basePalette =
    templateSlug === "neo-urban"
      ? {
          background: "#10131d",
          shape: "#1b2340",
          accent: "#2f6bff",
          text: "#f5f7ff",
        }
      : templateSlug === "pure-organic"
        ? {
            background: "#f6f0e5",
            shape: "#dde2d4",
            accent: "#d59c7e",
            text: "#395341",
          }
        : templateSlug === "silent-luxury"
          ? {
              background: "#f3efe7",
              shape: "#dfd8ce",
              accent: "#d5c3a5",
              text: "#312b23",
            }
          : {
              background: "#f7ebe4",
              shape: "#efd6c8",
              accent: "#d6a483",
              text: "#301f18",
            };

  const templatesMap: Record<
    string,
    Array<[string, string, string, string, number]>
  > = {
    "beauty-editorial": [
      [
        "Bruma restauradora",
        "Glow ligero para acabado editorial",
        "Skincare",
        "Studio Ritual",
        26,
      ],
      [
        "Gloss treatment",
        "Nutricion capilar con brillo seda",
        "Capilar",
        "Velvet Hair",
        29,
      ],
      [
        "Lip oil nude",
        "Color suave con reparacion intensiva",
        "Makeup",
        "Soft Tone",
        18,
      ],
      [
        "Body soufflé",
        "Textura cremosa con aroma limpio",
        "Bodycare",
        "Maison Care",
        34,
      ],
      [
        "Kit manicure clean",
        "Set premium para rutina de salon",
        "Nails",
        "Gloss Atelier",
        42,
      ],
      [
        "Mist botanica",
        "Refresco facial para cabina y retail",
        "Skincare",
        "Pure Edit",
        22,
      ],
    ],
    "neo-urban": [
      [
        "Night repair gel",
        "Recovery formula engineered for glow",
        "Skincare",
        "Neon Lab",
        38,
      ],
      [
        "Pulse matte kit",
        "Set de acabado preciso y larga duracion",
        "Makeup",
        "Vector",
        44,
      ],
      [
        "Carbon comb",
        "Accessorio minimal para styling premium",
        "Tools",
        "Mono Tech",
        27,
      ],
      [
        "Shift serum",
        "Hydration module for fast routines",
        "Skincare",
        "Circuit Care",
        31,
      ],
      [
        "Echo spray",
        "Texture boost for after-hours styling",
        "Capilar",
        "Afterdark",
        24,
      ],
      ["Flux blades", "Precision trim essentials", "Barber", "Zero Line", 56],
    ],
    "pure-organic": [
      [
        "Crema calendula",
        "Calma y nutricion de origen botanico",
        "Skincare",
        "Herbal Room",
        24,
      ],
      [
        "Aceite de jojoba",
        "Balance suave para rituales diarios",
        "Capilar",
        "Campo Studio",
        21,
      ],
      [
        "Soap stone bar",
        "Limpieza gentil con aroma terroso",
        "Bodycare",
        "Tierra Sana",
        16,
      ],
      [
        "Clay mask",
        "Purificacion mineral de textura cremosa",
        "Skincare",
        "Garden Lab",
        28,
      ],
      [
        "Linen pouch set",
        "Accesorios para retail consciente",
        "Lifestyle",
        "Origen",
        19,
      ],
      [
        "Botanic balm",
        "Tratamiento multiuso de bolsillo",
        "Wellness",
        "Bosque",
        18,
      ],
    ],
    "silent-luxury": [
      [
        "Kyoto comb",
        "Pieza sobria para tocador contemporaneo",
        "Objects",
        "Archive Form",
        48,
      ],
      [
        "Velvet serum",
        "Tratamiento facial de textura silenciosa",
        "Skincare",
        "Still House",
        52,
      ],
      [
        "Stone vessel kit",
        "Set de presentacion para retail premium",
        "Objects",
        "Atelier No. 3",
        67,
      ],
      [
        "Cashmere mask",
        "Cuidado nocturno con gesto minimal",
        "Skincare",
        "Quiet Lab",
        46,
      ],
      [
        "Satin finish oil",
        "Acabado pulido para cabello y cuerpo",
        "Bodycare",
        "Form Ritual",
        41,
      ],
      [
        "Edition towel",
        "Textil para cabina y venta curada",
        "Textiles",
        "Studio Loom",
        58,
      ],
    ],
  };

  return (templatesMap[templateSlug] || templatesMap["beauty-editorial"]).map(
    ([name, description, category, brand, price], index) => ({
      product_id: `preview-${templateSlug}-${index + 1}`,
      tenant_id: "",
      tenant_slug: tenantSlug,
      branch_id: `branch-${(index % 3) + 1}`,
      branch_name: ["Sucursal Principal", "Cabina Norte", "Beauty Bar"][
        index % 3
      ],
      name,
      description,
      sku: `PREV-${index + 1}`,
      category,
      brand,
      price,
      currency_iso: "USD",
      images: [
        {
          id: `image-${index + 1}`,
          storage_path: createPreviewImage(name, brand, basePalette),
          thumbnail_path: createPreviewImage(name, brand, basePalette),
          is_primary: true,
          sort_order: 0,
        },
      ],
    }),
  );
}

export default function EcommerceSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenant as string;
  const { tenant } = useAuthStore();
  const tenantId = tenant?.id || null;
  const { settings, isLoading, mutate } = useTenantEcommerceSettings(tenantId);

  const [form, setForm] = useState<EcommerceFormState>(DEFAULT_FORM);
  const [previewProducts, setPreviewProducts] = useState<
    PublicEcommerceProduct[]
  >([]);
  const [sectionImageFiles, setSectionImageFiles] = useState<SectionImageFiles>(
    {
      discovery: null,
      story: null,
      journal: null,
    },
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;

    setForm({
      ...DEFAULT_FORM,
      ...settings,
      brand_name: settings.brand_name || "",
      logo_url: settings.logo_url || "",
      hero_title: settings.hero_title || "",
      hero_subtitle: settings.hero_subtitle || "",
      hero_image_url: settings.hero_image_url || "",
      announcement_bar: settings.announcement_bar || "",
      whatsapp_number: settings.whatsapp_number || "",
      whatsapp_message_template:
        settings.whatsapp_message_template ||
        DEFAULT_FORM.whatsapp_message_template,
      seo_title: settings.seo_title || "",
      seo_description: settings.seo_description || "",
      primary_color: settings.primary_color || DEFAULT_FORM.primary_color,
      secondary_color: settings.secondary_color || DEFAULT_FORM.secondary_color,
      accent_color: settings.accent_color || DEFAULT_FORM.accent_color,
      background_color:
        settings.background_color || DEFAULT_FORM.background_color,
      surface_color: settings.surface_color || DEFAULT_FORM.surface_color,
      text_color: settings.text_color || DEFAULT_FORM.text_color,
      button_radius: settings.button_radius || DEFAULT_FORM.button_radius,
      custom_sections: normalizeCustomSections(settings.custom_sections),
    });
  }, [settings]);

  useEffect(() => {
    if (!tenantId) return;

    const loadPreviewProducts = async () => {
      try {
        const data = await ecommerceService.getPreviewProductsForTenant(
          tenantId,
          6,
        );
        setPreviewProducts(data);
      } catch {
        setPreviewProducts([]);
      }
    };

    loadPreviewProducts();
  }, [tenantId]);

  const previewStorefront = useMemo(
    () => buildPreviewStorefront(tenantSlug, tenant?.name || "Mi tienda", form),
    [form, tenant?.name, tenantSlug],
  );

  const publicLink =
    typeof window === "undefined"
      ? `/t/${tenantSlug}/${form.public_path}`
      : `${window.location.origin}/t/${tenantSlug}/${form.public_path}`;

  const curatedPreviewProducts = useMemo(
    () => buildTemplateMockProducts(form.template_slug, tenantSlug),
    [form.template_slug, tenantSlug],
  );

  const effectivePreviewProducts = useMemo(() => {
    const filledProducts = [...previewProducts];

    for (const item of curatedPreviewProducts) {
      if (filledProducts.length >= 6) break;
      filledProducts.push(item);
    }

    return filledProducts.length > 0
      ? filledProducts.slice(0, 6)
      : curatedPreviewProducts;
  }, [curatedPreviewProducts, previewProducts]);

  const selectedTemplate = ecommerceTemplates.find(
    (template) => template.slug === form.template_slug,
  );

  const updateField = <K extends keyof EcommerceFormState>(
    key: K,
    value: EcommerceFormState[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateSectionField = <
    K extends keyof EcommerceCustomSections,
    F extends keyof EcommerceCustomSections[K],
  >(
    section: K,
    field: F,
    value: EcommerceCustomSections[K][F],
  ) => {
    setForm((current) => ({
      ...current,
      custom_sections: {
        ...current.custom_sections,
        [section]: {
          ...current.custom_sections[section],
          [field]: value,
        },
      },
    }));
  };

  const handleSave = async () => {
    if (!tenantId) return;

    setSaving(true);
    try {
      const nextSections = structuredClone(form.custom_sections);
      const sectionKeys = Object.keys(sectionImageFiles) as Array<
        keyof EcommerceCustomSections
      >;

      for (const sectionKey of sectionKeys) {
        const file = sectionImageFiles[sectionKey];
        if (!file) continue;

        const previousUrl = nextSections[sectionKey].image_url;
        if (previousUrl) {
          const oldPath = storageService.extractPath(previousUrl);
          if (oldPath) {
            await storageService.deleteImage(oldPath).catch(() => {});
          }
        }

        const extension = file.name.split(".").pop() || "jpg";
        const path = storageService.buildScopedPath(
          tenantId,
          "ecommerce",
          "sections",
          sectionKey,
          `${crypto.randomUUID()}.${extension}`,
        );

        nextSections[sectionKey].image_url = await storageService.uploadImage(
          file,
          path,
        );
      }

      await ecommerceService.upsertTenantEcommerceSettings({
        tenant_id: tenantId,
        ...form,
        custom_sections: nextSections,
      });

      setForm((current) => ({ ...current, custom_sections: nextSections }));
      setSectionImageFiles({
        discovery: null,
        story: null,
        journal: null,
      });
      await mutate();
      toast.success("Configuracion ecommerce guardada");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo guardar la configuracion";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div
        className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
        data-tour="ecommerce-header"
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/t/${tenantSlug}/settings`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ecommerce</h1>
            <p className="text-muted-foreground">
              Configura el storefront publico y el template visual del catalogo.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <EcommerceTourButton />
          <Button variant="outline" asChild data-tour="ecommerce-view-store">
            <a href={publicLink} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Ver tienda
            </a>
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            data-tour="ecommerce-save"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card data-tour="ecommerce-status">
            <CardHeader>
              <CardTitle className="text-base">Estado</CardTitle>
              <CardDescription>
                Controla si el ecommerce esta activo para el tenant y si el
                storefront es publico.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>Modulo activo</Label>
                  <p className="text-sm text-muted-foreground">
                    Permite administrar el ecommerce desde el tenant.
                  </p>
                </div>
                <Switch
                  checked={form.is_enabled}
                  onCheckedChange={(checked) =>
                    updateField("is_enabled", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>Storefront publico</Label>
                  <p className="text-sm text-muted-foreground">
                    Expone el catalogo en la ruta publica del tenant.
                  </p>
                </div>
                <Switch
                  checked={form.is_public}
                  onCheckedChange={(checked) =>
                    updateField("is_public", checked)
                  }
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Ruta publica</Label>
                <Input value={form.public_path} readOnly />
                <p className="text-xs text-muted-foreground">
                  La primera version usa una ruta fija. Link actual:{" "}
                  {publicLink}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card data-tour="ecommerce-template">
            <CardHeader>
              <CardTitle className="text-base">Template y orden</CardTitle>
              <CardDescription>
                Selecciona el template visual y el criterio de orden del
                catalogo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Template</Label>
                <Select
                  value={form.template_slug}
                  onValueChange={(value) => updateField("template_slug", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ecommerceTemplates.map((template) => (
                      <SelectItem key={template.slug} value={template.slug}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-sm font-medium">
                  {
                    ecommerceTemplates.find(
                      (template) => template.slug === form.template_slug,
                    )?.name
                  }
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {
                    ecommerceTemplates.find(
                      (template) => template.slug === form.template_slug,
                    )?.description
                  }
                </p>
              </div>

              <div className="space-y-2">
                <Label>Orden de productos</Label>
                <Select
                  value={form.product_sort}
                  onValueChange={(value) => updateField("product_sort", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name_asc">Nombre A-Z</SelectItem>
                    <SelectItem value="name_desc">Nombre Z-A</SelectItem>
                    <SelectItem value="price_asc">
                      Precio menor a mayor
                    </SelectItem>
                    <SelectItem value="price_desc">
                      Precio mayor a menor
                    </SelectItem>
                    <SelectItem value="newest">Mas recientes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card data-tour="ecommerce-branding">
            <CardHeader>
              <CardTitle className="text-base">Branding</CardTitle>
              <CardDescription>
                Datos principales del storefront y textos del hero.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre de tienda</Label>
                <Input
                  value={form.brand_name}
                  onChange={(event) =>
                    updateField("brand_name", event.target.value)
                  }
                  placeholder={tenant?.name || "Mi tienda"}
                />
              </div>

              <div className="space-y-2">
                <Label>URL logo</Label>
                <Input
                  value={form.logo_url}
                  onChange={(event) =>
                    updateField("logo_url", event.target.value)
                  }
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label>Hero title</Label>
                <Input
                  value={form.hero_title}
                  onChange={(event) =>
                    updateField("hero_title", event.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Hero subtitle</Label>
                <Textarea
                  value={form.hero_subtitle}
                  onChange={(event) =>
                    updateField("hero_subtitle", event.target.value)
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>URL imagen hero</Label>
                <Input
                  value={form.hero_image_url}
                  onChange={(event) =>
                    updateField("hero_image_url", event.target.value)
                  }
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label>Barra superior</Label>
                <Input
                  value={form.announcement_bar}
                  onChange={(event) =>
                    updateField("announcement_bar", event.target.value)
                  }
                  placeholder="Envios, promos o mensaje rapido"
                />
              </div>
            </CardContent>
          </Card>

          <Card data-tour="ecommerce-whatsapp-seo">
            <CardHeader>
              <CardTitle className="text-base">WhatsApp y SEO</CardTitle>
              <CardDescription>
                Configura el CTA del carrito y el contenido de metadata.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Numero de WhatsApp</Label>
                <Input
                  value={form.whatsapp_number}
                  onChange={(event) =>
                    updateField("whatsapp_number", event.target.value)
                  }
                  placeholder="+593999999999"
                />
              </div>

              <div className="space-y-2">
                <Label>Template de mensaje</Label>
                <Textarea
                  value={form.whatsapp_message_template}
                  onChange={(event) =>
                    updateField("whatsapp_message_template", event.target.value)
                  }
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Variables disponibles: <code>{"{{items}}"}</code> y{" "}
                  <code>{"{{total}}"}</code>
                </p>
              </div>

              <div className="space-y-2">
                <Label>SEO title</Label>
                <Input
                  value={form.seo_title}
                  onChange={(event) =>
                    updateField("seo_title", event.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>SEO description</Label>
                <Textarea
                  value={form.seo_description}
                  onChange={(event) =>
                    updateField("seo_description", event.target.value)
                  }
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card data-tour="ecommerce-sections">
            <CardHeader>
              <CardTitle className="text-base">Tabs editoriales</CardTitle>
              <CardDescription>
                Configura el contenido de `Discovery`, `Story` y `Journal` para
                el storefront.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-xl border bg-muted/25 p-4 text-sm text-muted-foreground">
                Los uploads de estas secciones se guardan en el bucket `images`
                con esta ruta:
                <code className="ml-1">
                  {`{tenant_id}/ecommerce/sections/{section}/{uuid}.{ext}`}
                </code>
              </div>

              <div className="space-y-4 rounded-2xl border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label>Discovery</Label>
                    <p className="text-sm text-muted-foreground">
                      Bloque para destacar universo de marca, curaduria o
                      categorias hero.
                    </p>
                  </div>
                  <Switch
                    checked={form.custom_sections.discovery.enabled}
                    onCheckedChange={(checked) =>
                      updateSectionField("discovery", "enabled", checked)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Imagen Discovery</Label>
                  <ImageUpload
                    variant="square"
                    currentImageUrl={form.custom_sections.discovery.image_url}
                    onImageChange={(file) =>
                      setSectionImageFiles((current) => ({
                        ...current,
                        discovery: file,
                      }))
                    }
                    onRemove={() => {
                      updateSectionField("discovery", "image_url", "");
                      setSectionImageFiles((current) => ({
                        ...current,
                        discovery: null,
                      }));
                    }}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Eyebrow</Label>
                  <Input
                    value={form.custom_sections.discovery.eyebrow}
                    onChange={(event) =>
                      updateSectionField(
                        "discovery",
                        "eyebrow",
                        event.target.value,
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Titulo</Label>
                  <Input
                    value={form.custom_sections.discovery.title}
                    onChange={(event) =>
                      updateSectionField(
                        "discovery",
                        "title",
                        event.target.value,
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Texto</Label>
                  <Textarea
                    rows={4}
                    value={form.custom_sections.discovery.body}
                    onChange={(event) =>
                      updateSectionField(
                        "discovery",
                        "body",
                        event.target.value,
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>CTA</Label>
                  <Input
                    value={form.custom_sections.discovery.cta_label}
                    onChange={(event) =>
                      updateSectionField(
                        "discovery",
                        "cta_label",
                        event.target.value,
                      )
                    }
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label>Story</Label>
                    <p className="text-sm text-muted-foreground">
                      Presenta al dueño, la vision de la marca y el tono del
                      ecommerce.
                    </p>
                  </div>
                  <Switch
                    checked={form.custom_sections.story.enabled}
                    onCheckedChange={(checked) =>
                      updateSectionField("story", "enabled", checked)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Imagen del fundador / owner</Label>
                  <ImageUpload
                    variant="square"
                    currentImageUrl={form.custom_sections.story.image_url}
                    onImageChange={(file) =>
                      setSectionImageFiles((current) => ({
                        ...current,
                        story: file,
                      }))
                    }
                    onRemove={() => {
                      updateSectionField("story", "image_url", "");
                      setSectionImageFiles((current) => ({
                        ...current,
                        story: null,
                      }));
                    }}
                    disabled={saving}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input
                      value={form.custom_sections.story.owner_name}
                      onChange={(event) =>
                        updateSectionField(
                          "story",
                          "owner_name",
                          event.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rol</Label>
                    <Input
                      value={form.custom_sections.story.owner_role}
                      onChange={(event) =>
                        updateSectionField(
                          "story",
                          "owner_role",
                          event.target.value,
                        )
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Titulo</Label>
                  <Input
                    value={form.custom_sections.story.title}
                    onChange={(event) =>
                      updateSectionField("story", "title", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vision / historia</Label>
                  <Textarea
                    rows={4}
                    value={form.custom_sections.story.body}
                    onChange={(event) =>
                      updateSectionField("story", "body", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cita destacada</Label>
                  <Textarea
                    rows={3}
                    value={form.custom_sections.story.owner_quote}
                    onChange={(event) =>
                      updateSectionField(
                        "story",
                        "owner_quote",
                        event.target.value,
                      )
                    }
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label>Journal</Label>
                    <p className="text-sm text-muted-foreground">
                      Seccion para notas, rutinas, recomendaciones o
                      storytelling complementario.
                    </p>
                  </div>
                  <Switch
                    checked={form.custom_sections.journal.enabled}
                    onCheckedChange={(checked) =>
                      updateSectionField("journal", "enabled", checked)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Imagen Journal</Label>
                  <ImageUpload
                    variant="square"
                    currentImageUrl={form.custom_sections.journal.image_url}
                    onImageChange={(file) =>
                      setSectionImageFiles((current) => ({
                        ...current,
                        journal: file,
                      }))
                    }
                    onRemove={() => {
                      updateSectionField("journal", "image_url", "");
                      setSectionImageFiles((current) => ({
                        ...current,
                        journal: null,
                      }));
                    }}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Eyebrow</Label>
                  <Input
                    value={form.custom_sections.journal.eyebrow}
                    onChange={(event) =>
                      updateSectionField(
                        "journal",
                        "eyebrow",
                        event.target.value,
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Titulo</Label>
                  <Input
                    value={form.custom_sections.journal.title}
                    onChange={(event) =>
                      updateSectionField("journal", "title", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Texto</Label>
                  <Textarea
                    rows={4}
                    value={form.custom_sections.journal.body}
                    onChange={(event) =>
                      updateSectionField("journal", "body", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>CTA</Label>
                  <Input
                    value={form.custom_sections.journal.cta_label}
                    onChange={(event) =>
                      updateSectionField(
                        "journal",
                        "cta_label",
                        event.target.value,
                      )
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Colores y toggles</CardTitle>
              <CardDescription>
                Ajustes visuales rapidos del storefront publico.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {[
                  ["primary_color", "Primario"],
                  ["secondary_color", "Secundario"],
                  ["accent_color", "Acento"],
                  ["background_color", "Fondo"],
                  ["surface_color", "Superficie"],
                  ["text_color", "Texto"],
                ].map(([key, label]) => (
                  <div key={key} className="space-y-2">
                    <Label>{label}</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="color"
                        value={form[key as keyof EcommerceFormState] as string}
                        onChange={(event) =>
                          updateField(
                            key as keyof EcommerceFormState,
                            event.target.value as never,
                          )
                        }
                        className="h-10 w-14 p-1"
                      />
                      <Input
                        value={form[key as keyof EcommerceFormState] as string}
                        onChange={(event) =>
                          updateField(
                            key as keyof EcommerceFormState,
                            event.target.value as never,
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Radio de botones</Label>
                <Input
                  value={form.button_radius}
                  onChange={(event) =>
                    updateField("button_radius", event.target.value)
                  }
                  placeholder="999px"
                />
              </div>

              <Separator />

              {[
                ["show_search", "Mostrar buscador"],
                ["show_categories", "Mostrar categorias"],
                ["show_prices", "Mostrar precios"],
                ["show_branch_badge", "Mostrar sucursal del producto"],
                ["show_whatsapp_button", "Mostrar CTA WhatsApp"],
              ].map(([key, label]) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    <Label>{label}</Label>
                  </div>
                  <Switch
                    checked={Boolean(form[key as keyof EcommerceFormState])}
                    onCheckedChange={(checked) =>
                      updateField(
                        key as keyof EcommerceFormState,
                        checked as never,
                      )
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden" data-tour="ecommerce-preview">
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
            <CardDescription>
              Vista previa del storefront usando el template actual, productos
              del tenant y relleno visual curado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border bg-muted/30 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4" />
                  Direccion visual
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedTemplate?.description}
                </p>
              </div>
              <div className="rounded-2xl border bg-muted/30 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Palette className="h-4 w-4" />
                  Datos en preview
                </div>
                <p className="text-sm text-muted-foreground">
                  {previewProducts.length > 0
                    ? `Se mezclan ${previewProducts.length} productos reales con muestras visuales para completar la escena.`
                    : "Se usan productos visuales curados para que el template se vea completo aunque no tengas inventario cargado."}
                </p>
              </div>
              <div className="rounded-2xl border bg-muted/30 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <ShoppingBag className="h-4 w-4" />
                  Escena activa
                </div>
                <p className="text-sm text-muted-foreground">
                  {effectivePreviewProducts.length} productos, branding editable
                  y estructura real del storefront publico.
                </p>
              </div>
            </div>

            <EcommerceStorefrontPreview
              storefront={previewStorefront}
              products={effectivePreviewProducts}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
