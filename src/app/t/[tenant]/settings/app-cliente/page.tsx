// src/app/t/[tenant]/settings/app-cliente/page.tsx
// Configuracion visual y operativa de la app del cliente final.
"use client";

import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  Lock,
  MessageCircle,
  Moon,
  Palette,
  QrCode,
  RotateCcw,
  Save,
  Smartphone,
  Sun,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ClientAppPreview } from "@/features/client-app/components/client-app-preview";
import {
  type ClientAppSettingsShape,
  type ClientAppTemplateSlug,
  type ClientAppThemeMode,
  type ClientAppTokenOverrides,
  clientAppTemplates,
  getClientAppTemplate,
  normalizeClientAppOverrides,
  resolveClientAppTheme,
} from "@/features/client-app/templates";
import { useTenantClientAppSettings } from "@/hooks/supabase/use-client-app-settings";
import { clientAppSettingsService } from "@/lib/services/client-app-settings";
import { useAuthStore } from "@/lib/stores/auth-store";
import { cn } from "@/lib/utils";

type PreviewScreen = "home" | "services" | "booking" | "success" | "profile";

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

const PREVIEW_SCREENS: Array<{ id: PreviewScreen; label: string }> = [
  { id: "home", label: "Inicio" },
  { id: "services", label: "Servicios" },
  { id: "booking", label: "Booking" },
  { id: "success", label: "Exito" },
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
  const [previewScreen, setPreviewScreen] = useState<PreviewScreen>("home");
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const {
    settings,
    isLoading: loadingSettings,
    mutate,
  } = useTenantClientAppSettings(tenantId);

  const isOwnerOrAdmin = tenantUser
    ? ["owner", "admin"].includes(tenantUser.role)
    : false;

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
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateColor = (key: keyof ClientAppTokenOverrides, value: string) => {
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
      toast.success("Aspecto de la app cliente actualizado");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo guardar",
      );
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="max-w-7xl space-y-6">
      <Link
        href={`/t/${tenantSlug}/settings`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Configuración
      </Link>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Smartphone className="h-6 w-6" />
            App del cliente
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Activa el acceso, comparte la app y personaliza el look que verán
            tus clientes al agendar, iniciar sesión y revisar su historial.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={resetTemplateColors}
            disabled={savingSettings}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Restablecer colores
          </Button>
          <Button
            type="button"
            onClick={handleSaveSettings}
            disabled={savingSettings || loadingSettings || !isOwnerOrAdmin}
          >
            {savingSettings ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar aspecto
          </Button>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)_360px]">
        <section className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="h-5 w-5" />
                Estado del acceso
              </CardTitle>
              <CardDescription>
                Si está desactivada, los clientes verán un aviso de app no
                disponible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingStatus ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">
                      {enabled
                        ? "App del cliente activa"
                        : "App del cliente desactivada"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {enabled
                        ? "Los clientes pueden registrarse y agendar"
                        : "Las rutas /c/[tenant] muestran un aviso"}
                    </p>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={handleToggle}
                    disabled={savingToggle || !isOwnerOrAdmin}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Templates</CardTitle>
              <CardDescription>
                Elige una base visual prefabricada y ajusta sus tokens.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {clientAppTemplates.map((template) => {
                const active = form.template_slug === template.id;
                const palette =
                  template[form.theme_mode === "dark" ? "dark" : "light"];
                return (
                  <button
                    type="button"
                    key={template.id}
                    className={cn(
                      "w-full overflow-hidden rounded-xl border-2 bg-card text-left transition",
                      active ? "border-primary" : "border-border",
                    )}
                    onClick={() => updateForm("template_slug", template.id)}
                  >
                    <div
                      className="relative h-24"
                      style={{ backgroundColor: palette.bg }}
                    >
                      <img
                        src={template.heroImage}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover opacity-45"
                      />
                      <div
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(180deg, transparent 20%, ${palette.bg} 100%)`,
                        }}
                      />
                      <div className="absolute bottom-3 left-3 flex gap-2">
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
                          style={{ backgroundColor: palette.surface }}
                        />
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">{template.name}</p>
                        {active ? (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            Activo
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {template.tagline}
                      </p>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-base">Preview en vivo</CardTitle>
                <CardDescription>
                  {selectedTemplate.description}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={form.theme_mode === "light" ? "default" : "outline"}
                  onClick={() => updateForm("theme_mode", "light")}
                >
                  <Sun className="mr-1.5 h-3.5 w-3.5" />
                  Claro
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={form.theme_mode === "dark" ? "default" : "outline"}
                  onClick={() => updateForm("theme_mode", "dark")}
                >
                  <Moon className="mr-1.5 h-3.5 w-3.5" />
                  Oscuro
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {PREVIEW_SCREENS.map((item) => (
                  <Button
                    type="button"
                    key={item.id}
                    size="sm"
                    variant={previewScreen === item.id ? "default" : "outline"}
                    onClick={() => setPreviewScreen(item.id)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
              <div className="rounded-2xl border bg-muted/40 p-4">
                <ClientAppPreview
                  settings={previewSettings}
                  screen={previewScreen}
                  tenantName={tenant?.name ?? tenantSlug}
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Enlaces</CardTitle>
                <CardDescription>
                  Copia y comparte el enlace que más se ajuste al canal.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <QrCode className="h-5 w-5" />
                  QR y compartir
                </CardTitle>
                <CardDescription>
                  Listo para imprimir o enviar por WhatsApp.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="grid h-28 w-28 place-items-center rounded-lg border bg-card p-2">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt={`QR para ${tenantSlug}`}
                        className="max-h-full max-w-full"
                      />
                    ) : (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <Button
                      type="button"
                      className="w-full"
                      variant="outline"
                      onClick={handleDownloadQr}
                      disabled={!qrDataUrl}
                    >
                      <Download className="mr-2 h-4 w-4" />
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
                        className="w-full"
                        disabled={!homeUrl}
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        WhatsApp
                      </Button>
                    </a>
                    <a
                      href={homeUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={!homeUrl}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Abrir app
                      </Button>
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Branding</CardTitle>
              <CardDescription>
                Textos e imagen principal del primer impacto.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre visible</Label>
                <Input
                  value={form.brand_name}
                  onChange={(event) =>
                    updateForm("brand_name", event.target.value)
                  }
                  placeholder={tenant?.name ?? "Nombre del negocio"}
                />
              </div>
              <div className="space-y-2">
                <Label>URL del logo</Label>
                <Input
                  value={form.logo_url}
                  onChange={(event) =>
                    updateForm("logo_url", event.target.value)
                  }
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Hero image URL</Label>
                <Input
                  value={form.hero_image_url}
                  onChange={(event) =>
                    updateForm("hero_image_url", event.target.value)
                  }
                  placeholder={selectedTemplate.heroImage}
                />
              </div>
              <div className="space-y-2">
                <Label>Título de bienvenida</Label>
                <Input
                  value={form.welcome_title}
                  onChange={(event) =>
                    updateForm("welcome_title", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Subtítulo</Label>
                <Textarea
                  rows={3}
                  value={form.welcome_subtitle}
                  onChange={(event) =>
                    updateForm("welcome_subtitle", event.target.value)
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-5 w-5" />
                Colores
              </CardTitle>
              <CardDescription>
                Vacío equivale al color base de {selectedTemplate.name}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {COLOR_FIELDS.map((field) => {
                const base =
                  resolvedTheme.template[resolvedTheme.mode][field.key];
                const current = form.custom_tokens[field.key] ?? base;
                return (
                  <div key={field.key} className="flex items-center gap-3">
                    <label
                      className="relative h-10 w-10 shrink-0 cursor-pointer rounded-lg border"
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
                      <p className="text-sm font-medium">{field.label}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {current}
                      </p>
                    </div>
                    {form.custom_tokens[field.key] ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => resetColor(field.key)}
                        aria-label={`Restablecer ${field.label}`}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Login social</CardTitle>
              <CardDescription>
                Google se muestra solo como preview visual por ahora.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Mostrar botón Google</p>
                  <p className="text-xs text-muted-foreground">
                    No iniciará OAuth hasta activar la integración real.
                  </p>
                </div>
                <Switch
                  checked={form.show_google_login_preview}
                  onCheckedChange={(checked) =>
                    updateForm("show_google_login_preview", checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
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
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <div className="flex gap-2">
        <Input
          value={url}
          readOnly
          disabled={disabled}
          className="font-mono text-xs"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onCopy}
          disabled={disabled}
          aria-label="Copiar"
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
