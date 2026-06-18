// src/app/t/[tenant]/settings/app-cliente/page.tsx
// Configuracion visual y operativa de la app del cliente final.
// Layout "Tenant Admin" del bundle de Claude Design (app-client-elviz-studio):
// rail izquierdo de templates, preview central sobre dot-grid y rail derecho
// de personalizacion + compartir.
"use client";

import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  MessageCircle,
  Moon,
  Palette,
  QrCode,
  RotateCcw,
  Smartphone,
  Sun,
  Tablet,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  ClientAppPreview,
  type ClientAppPreviewScreen,
} from "@/features/client-app/components/client-app-preview";
import {
  type ClientAppSettingsShape,
  type ClientAppTemplate,
  type ClientAppTemplateSlug,
  type ClientAppThemeMode,
  type ClientAppTokenOverrides,
  clientAppTemplates,
  getClientAppFontHref,
  getClientAppTemplate,
  normalizeClientAppOverrides,
  resolveClientAppTheme,
} from "@/features/client-app/templates";
import { useTenantClientAppSettings } from "@/hooks/supabase/use-client-app-settings";
import { clientAppSettingsService } from "@/lib/services/client-app-settings";
import { useAuthStore } from "@/lib/stores/auth-store";
import { cn } from "@/lib/utils";

interface TenantStatus {
  tenant_id: string;
  name: string;
  slug: string;
  enabled: boolean;
}

interface FormState {
  template_slug: ClientAppTemplateSlug;
  theme_mode: ClientAppThemeMode;
  brand_name: string;
  logo_url: string;
  hero_image_url: string;
  welcome_title: string;
  welcome_subtitle: string;
  google_login_enabled: boolean;
  show_google_login_preview: boolean;
  custom_tokens: ClientAppTokenOverrides;
}

const DEFAULT_FORM: FormState = {
  template_slug: "beauty",
  theme_mode: "light",
  brand_name: "",
  logo_url: "",
  hero_image_url: "",
  welcome_title: "Agenda tu proxima cita",
  welcome_subtitle:
    "Explora servicios, reserva horarios y revisa tu historial desde la app.",
  google_login_enabled: false,
  show_google_login_preview: true,
  custom_tokens: {},
};

const COLOR_FIELDS: Array<{
  key: keyof ClientAppTokenOverrides;
  label: string;
}> = [
  { key: "primary", label: "Primario" },
  { key: "accent", label: "Acento" },
  { key: "bg", label: "Fondo" },
  { key: "surface", label: "Tarjetas" },
  { key: "fg", label: "Texto" },
];

const PREVIEW_SCREENS: Array<{ id: ClientAppPreviewScreen; label: string }> = [
  { id: "home", label: "Dashboard" },
  { id: "services", label: "Servicios" },
  { id: "booking", label: "Booking" },
  { id: "success", label: "Éxito" },
  { id: "profile", label: "Perfil" },
];

export default function ClientAppSettingsPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const { tenant, tenantUser } = useAuthStore();
  const tenantId = tenant?.id ?? null;

  const [origin, setOrigin] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [savingToggle, setSavingToggle] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [tenantStatus, setTenantStatus] = useState<TenantStatus | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [previewScreen, setPreviewScreen] =
    useState<ClientAppPreviewScreen>("home");
  const [device, setDevice] = useState<"phone" | "tablet">("phone");
  const [justSaved, setJustSaved] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const {
    settings,
    isLoading: loadingSettings,
    mutate,
  } = useTenantClientAppSettings(tenantId);

  const isOwnerOrAdmin = tenantUser
    ? ["owner", "admin"].includes(tenantUser.role)
    : false;

  const appliedTemplate = settings
    ? getClientAppTemplate(settings.template_slug).id
    : null;

  const homeUrl = useMemo(
    () => (origin ? `${origin}/c/${tenantSlug}` : ""),
    [origin, tenantSlug],
  );
  const loginUrl = useMemo(
    () => (origin ? `${origin}/c/${tenantSlug}/login` : ""),
    [origin, tenantSlug],
  );
  const registerUrl = useMemo(
    () => (origin ? `${origin}/c/${tenantSlug}/register` : ""),
    [origin, tenantSlug],
  );

  const previewSettings: Partial<ClientAppSettingsShape> = useMemo(
    () => ({
      tenant_id: tenantId ?? "",
      template_slug: form.template_slug,
      theme_mode: form.theme_mode,
      brand_name: form.brand_name || tenant?.name || tenantSlug,
      logo_url: form.logo_url || null,
      hero_image_url: form.hero_image_url || null,
      welcome_title: form.welcome_title,
      welcome_subtitle: form.welcome_subtitle,
      google_login_enabled: form.google_login_enabled,
      show_google_login_preview: form.show_google_login_preview,
      custom_tokens: form.custom_tokens,
      custom_sections: {},
    }),
    [form, tenant?.name, tenantId, tenantSlug],
  );

  const resolvedTheme = resolveClientAppTheme(previewSettings);
  const selectedTemplate = getClientAppTemplate(form.template_slug);
  const previewMode = form.theme_mode === "dark" ? "dark" : "light";

  const whatsappShareUrl = useMemo(() => {
    if (!homeUrl) return "";
    const message = `Hola, te invito a agendar tu proxima cita en ${
      tenant?.name ?? tenantSlug
    } directo desde la app: ${homeUrl}`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }, [homeUrl, tenant?.name, tenantSlug]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (!settings) return;
    setForm({
      template_slug: getClientAppTemplate(settings.template_slug).id,
      theme_mode:
        settings.theme_mode === "dark" || settings.theme_mode === "system"
          ? settings.theme_mode
          : "light",
      brand_name: settings.brand_name ?? tenant?.name ?? "",
      logo_url: settings.logo_url ?? "",
      hero_image_url: settings.hero_image_url ?? "",
      welcome_title: settings.welcome_title ?? DEFAULT_FORM.welcome_title,
      welcome_subtitle:
        settings.welcome_subtitle ?? DEFAULT_FORM.welcome_subtitle,
      google_login_enabled: settings.google_login_enabled,
      show_google_login_preview: settings.show_google_login_preview,
      custom_tokens: normalizeClientAppOverrides(settings.custom_tokens),
    });
  }, [settings, tenant?.name]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingStatus(true);
        const res = await fetch(
          `/api/client/tenant-status?tenant=${encodeURIComponent(tenantSlug)}`,
        );
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          setTenantStatus(data);
          setEnabled(Boolean(data.enabled));
        } else {
          toast.error(data.error ?? "No se pudo cargar el tenant");
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Error de red");
        }
      } finally {
        if (!cancelled) setLoadingStatus(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantSlug]);

  useEffect(() => {
    if (!homeUrl) return;
    let cancelled = false;
    QRCode.toDataURL(homeUrl, {
      errorCorrectionLevel: "M",
      margin: 2,
      scale: 8,
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [homeUrl]);

  const updateForm = <K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) => {
    setJustSaved(false);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateColor = (key: keyof ClientAppTokenOverrides, value: string) => {
    setJustSaved(false);
    setForm((current) => ({
      ...current,
      custom_tokens: {
        ...current.custom_tokens,
        [key]: value,
      },
    }));
  };

  const resetColor = (key: keyof ClientAppTokenOverrides) => {
    setForm((current) => {
      const next = { ...current.custom_tokens };
      delete next[key];
      return { ...current, custom_tokens: next };
    });
  };

  const resetTemplateColors = () => {
    setForm((current) => ({ ...current, custom_tokens: {} }));
  };

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedUrl(value);
      toast.success(`${label} copiado`);
      setTimeout(() => setCopiedUrl(null), 1500);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `qr-${tenantSlug}-app-cliente.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleToggle = async (checked: boolean) => {
    if (!tenantStatus) return;
    if (!isOwnerOrAdmin) {
      toast.error("Solo owners y admins pueden cambiar esto");
      return;
    }
    const previous = enabled;
    setEnabled(checked);
    setSavingToggle(true);
    try {
      const res = await clientAppSettingsService.updateTenantSettings(
        tenantStatus.tenant_id,
        { client_app_enabled: checked },
      );
      setEnabled(Boolean(res.tenant.client_app_enabled));
      toast.success(
        checked ? "App del cliente activada" : "App del cliente desactivada",
      );
    } catch (err) {
      setEnabled(previous);
      toast.error(err instanceof Error ? err.message : "Error de red");
    } finally {
      setSavingToggle(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!tenantId || !isOwnerOrAdmin) {
      toast.error("Solo owners y admins pueden guardar esta configuracion");
      return;
    }
    setSavingSettings(true);
    try {
      await clientAppSettingsService.updateTenantSettings(tenantId, {
        template_slug: form.template_slug,
        theme_mode: form.theme_mode,
        brand_name: form.brand_name || null,
        logo_url: form.logo_url || null,
        hero_image_url: form.hero_image_url || null,
        welcome_title: form.welcome_title || null,
        welcome_subtitle: form.welcome_subtitle || null,
        google_login_enabled: false,
        show_google_login_preview: form.show_google_login_preview,
        custom_tokens: form.custom_tokens,
        custom_sections: {},
      });
      await mutate();
      setJustSaved(true);
      toast.success("Aspecto de la app cliente actualizado");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo guardar",
      );
    } finally {
      setSavingSettings(false);
    }
  };

  const phoneSize =
    device === "phone"
      ? { width: 340, height: 700 }
      : { width: 640, height: 480 };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <link rel="stylesheet" href={getClientAppFontHref()} />

      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/t/${tenantSlug}/settings`}
            className="grid h-9 w-9 place-items-center rounded-lg border text-muted-foreground transition hover:text-foreground"
            aria-label="Volver a Configuración"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-foreground text-background">
            <Smartphone className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">App del cliente</p>
            <p className="text-xs text-muted-foreground">
              Tenant: {tenantSlug}
              {tenant?.name ? ` · ${tenant.name}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {loadingStatus ? (
            <Skeleton className="h-9 w-36" />
          ) : (
            <div className="flex h-9 items-center gap-2 rounded-lg border px-3">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  enabled ? "bg-emerald-500" : "bg-muted-foreground/40",
                )}
              />
              <span className="text-xs font-semibold">
                {enabled ? "App activa" : "Desactivada"}
              </span>
              <Switch
                checked={enabled}
                onCheckedChange={handleToggle}
                disabled={savingToggle || !isOwnerOrAdmin}
              />
            </div>
          )}
          <a
            href={homeUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(!homeUrl && "pointer-events-none opacity-50")}
          >
            <Button type="button" size="sm" className="h-9">
              Vista de cliente
              <ExternalLink className="ml-2 h-3.5 w-3.5" />
            </Button>
          </a>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-0 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
        {/* Rail izquierdo — templates */}
        <section className="space-y-2.5 overflow-y-auto py-4 xl:border-r xl:pr-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Template
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight">
              Aspecto y estilo
            </h2>
            <p className="mb-3 mt-1 text-xs leading-relaxed text-muted-foreground">
              Elige una base, ajusta colores y aplica a tu negocio. Los cambios
              se ven en vivo a la derecha.
            </p>
          </div>
          {clientAppTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              mode={previewMode}
              active={form.template_slug === template.id}
              applied={appliedTemplate === template.id}
              onClick={() => updateForm("template_slug", template.id)}
            />
          ))}
        </section>

        {/* Centro — preview en vivo */}
        <section className="flex min-h-0 flex-col xl:border-r">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
              {PREVIEW_SCREENS.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setPreviewScreen(item.id)}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-xs font-semibold transition",
                    previewScreen === item.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={form.theme_mode === "light" ? "default" : "outline"}
                className="h-8 px-2.5"
                onClick={() => updateForm("theme_mode", "light")}
                aria-label="Modo claro"
              >
                <Sun className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant={form.theme_mode === "dark" ? "default" : "outline"}
                className="h-8 px-2.5"
                onClick={() => updateForm("theme_mode", "dark")}
                aria-label="Modo oscuro"
              >
                <Moon className="h-3.5 w-3.5" />
              </Button>
              <span className="mx-1 h-5 w-px bg-border" />
              <Button
                type="button"
                size="sm"
                variant={device === "phone" ? "default" : "outline"}
                className="h-8 px-2.5"
                onClick={() => setDevice("phone")}
                aria-label="Vista móvil"
              >
                <Smartphone className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant={device === "tablet" ? "default" : "outline"}
                className="h-8 px-2.5"
                onClick={() => setDevice("tablet")}
                aria-label="Vista tablet"
              >
                <Tablet className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div
            className="grid min-h-0 flex-1 place-items-center overflow-auto p-6"
            style={{
              backgroundImage:
                "radial-gradient(color-mix(in srgb, var(--foreground) 8%, transparent) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          >
            <div
              className="overflow-hidden border"
              style={{
                width: phoneSize.width,
                height: phoneSize.height,
                borderRadius: device === "phone" ? 32 : 14,
                boxShadow: "0 30px 60px -25px rgba(0,0,0,0.4)",
                background: resolvedTheme.tokens.bg,
              }}
            >
              <ClientAppPreview
                settings={previewSettings}
                screen={previewScreen}
                tenantName={tenant?.name ?? tenantSlug}
                width={phoneSize.width}
                height={phoneSize.height}
              />
            </div>
          </div>
        </section>

        {/* Rail derecho — personalizacion + compartir */}
        <section className="flex min-h-0 flex-col xl:pl-4">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto py-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Personalización
              </p>
              <h3 className="mt-1 flex items-center gap-2 text-base font-bold tracking-tight">
                <Palette className="h-4 w-4" />
                Colores
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Sobreescribe los tokens de {selectedTemplate.name}. Vacío =
                valor base.
              </p>
            </div>

            <div className="space-y-3">
              {COLOR_FIELDS.map((field) => {
                const base =
                  resolvedTheme.template[resolvedTheme.mode][field.key];
                const current = form.custom_tokens[field.key] ?? base;
                return (
                  <div key={field.key} className="flex items-center gap-3">
                    <label
                      className="relative h-9 w-9 shrink-0 cursor-pointer rounded-lg border"
                      style={{ backgroundColor: current }}
                    >
                      <input
                        type="color"
                        value={current}
                        onChange={(event) =>
                          updateColor(field.key, event.target.value)
                        }
                        className="absolute inset-0 cursor-pointer opacity-0"
                      />
                    </label>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-tight">
                        {field.label}
                      </p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {current}
                      </p>
                    </div>
                    {form.custom_tokens[field.key] ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => resetColor(field.key)}
                        aria-label={`Restablecer ${field.label}`}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="h-px bg-border" />

            <div className="space-y-3">
              <h3 className="text-sm font-bold tracking-tight">Branding</h3>
              <div className="space-y-1.5">
                <Label className="text-xs">Nombre visible</Label>
                <Input
                  className="h-9"
                  value={form.brand_name}
                  onChange={(event) =>
                    updateForm("brand_name", event.target.value)
                  }
                  placeholder={tenant?.name ?? "Nombre del negocio"}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">URL del logo</Label>
                <Input
                  className="h-9"
                  value={form.logo_url}
                  onChange={(event) =>
                    updateForm("logo_url", event.target.value)
                  }
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Hero image URL</Label>
                <Input
                  className="h-9"
                  value={form.hero_image_url}
                  onChange={(event) =>
                    updateForm("hero_image_url", event.target.value)
                  }
                  placeholder={selectedTemplate.heroImage}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Título de bienvenida</Label>
                <Input
                  className="h-9"
                  value={form.welcome_title}
                  onChange={(event) =>
                    updateForm("welcome_title", event.target.value)
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Subtítulo</Label>
                <Textarea
                  rows={2}
                  value={form.welcome_subtitle}
                  onChange={(event) =>
                    updateForm("welcome_subtitle", event.target.value)
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <p className="text-xs font-semibold">Mostrar botón Google</p>
                  <p className="text-[11px] text-muted-foreground">
                    Solo preview visual, sin OAuth real.
                  </p>
                </div>
                <Switch
                  checked={form.show_google_login_preview}
                  onCheckedChange={(checked) =>
                    updateForm("show_google_login_preview", checked)
                  }
                />
              </div>
            </div>

            <div className="h-px bg-border" />

            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight">
                <QrCode className="h-4 w-4" />
                Compartir
              </h3>
              <UrlRow
                label="Inicio del app"
                url={homeUrl}
                copied={copiedUrl === homeUrl}
                onCopy={() => handleCopy(homeUrl, "URL")}
                disabled={!homeUrl}
              />
              <UrlRow
                label="Login"
                url={loginUrl}
                copied={copiedUrl === loginUrl}
                onCopy={() => handleCopy(loginUrl, "Login")}
                disabled={!loginUrl}
              />
              <UrlRow
                label="Registro"
                url={registerUrl}
                copied={copiedUrl === registerUrl}
                onCopy={() => handleCopy(registerUrl, "Registro")}
                disabled={!registerUrl}
              />
              <div className="flex items-center gap-3">
                <div className="grid h-24 w-24 shrink-0 place-items-center rounded-lg border bg-card p-1.5">
                  {qrDataUrl ? (
                    <div
                      role="img"
                      aria-label={`QR para ${tenantSlug}`}
                      className="h-full w-full"
                      style={{
                        backgroundImage: `url(${qrDataUrl})`,
                        backgroundSize: "contain",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                      }}
                    />
                  ) : (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={handleDownloadQr}
                    disabled={!qrDataUrl}
                  >
                    <Download className="mr-2 h-3.5 w-3.5" />
                    Descargar PNG
                  </Button>
                  <a
                    href={whatsappShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button
                      type="button"
                      size="sm"
                      className="w-full"
                      disabled={!homeUrl}
                    >
                      <MessageCircle className="mr-2 h-3.5 w-3.5" />
                      WhatsApp
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* CTA sticky */}
          <div className="space-y-2 border-t py-3">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={resetTemplateColors}
                disabled={savingSettings}
              >
                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                Restablecer todo
              </Button>
            </div>
            <Button
              type="button"
              className="h-11 w-full font-bold"
              onClick={handleSaveSettings}
              disabled={savingSettings || loadingSettings || !isOwnerOrAdmin}
            >
              {savingSettings ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Aplicar a mi tenant
            </Button>
            {justSaved && appliedTemplate === form.template_slug ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs font-semibold text-emerald-600">
                <Check className="h-3.5 w-3.5" />
                {selectedTemplate.name} aplicado · clientes verán este aspecto
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  mode,
  active,
  applied,
  onClick,
}: {
  template: ClientAppTemplate;
  mode: "light" | "dark";
  active: boolean;
  applied: boolean;
  onClick: () => void;
}) {
  const palette = template[mode];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full overflow-hidden rounded-xl border-2 bg-card text-left transition",
        active
          ? "-translate-y-px border-primary"
          : "border-border hover:border-muted-foreground/40",
      )}
    >
      <div
        className="relative flex h-20 items-end overflow-hidden"
        style={{ backgroundColor: palette.bg }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: `url(${template.heroImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, transparent 30%, ${palette.bg} 100%)`,
          }}
        />
        <div className="relative flex items-center gap-2 p-2.5">
          <span
            className="h-5 w-5 rounded-full"
            style={{ backgroundColor: palette.primary }}
          />
          <span
            className="h-5 w-5 rounded-full"
            style={{ backgroundColor: palette.accent }}
          />
          <span
            className="h-5 w-5 rounded-md border"
            style={{
              backgroundColor: palette.surface,
              borderColor: palette.border,
            }}
          />
        </div>
      </div>
      <div className="flex items-start justify-between gap-2 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold tracking-tight">
              {template.name}
            </span>
            {applied ? (
              <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-emerald-600">
                ACTIVO
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            {template.tagline}
          </p>
        </div>
        {active ? (
          <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-2.5 w-2.5" />
          </span>
        ) : null}
      </div>
    </button>
  );
}

function UrlRow({
  label,
  url,
  copied,
  onCopy,
  disabled,
}: {
  label: string;
  url: string;
  copied: boolean;
  onCopy: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <div className="flex gap-1.5">
        <Input
          value={url}
          readOnly
          disabled={disabled}
          className="h-8 font-mono text-[11px]"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onCopy}
          disabled={disabled}
          aria-label="Copiar"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
