// src/app/t/[tenant]/settings/appearance/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Loader2,
  Palette,
  RotateCcw,
  Save,
  Sun,
  Moon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useThemes, useTenantTheme } from "@/hooks/supabase/use-appearance";
import { appearanceService } from "@/lib/services/appearance";
import type { Theme, ThemeCSSVariables } from "@/types";

// Variables CSS principales que se pueden personalizar
const EDITABLE_VARIABLES = [
  {
    key: "--primary",
    label: "Primario",
    description: "Color principal de la marca",
  },
  {
    key: "--primary-foreground",
    label: "Texto primario",
    description: "Texto sobre el color primario",
  },
  { key: "--secondary", label: "Secundario", description: "Color secundario" },
  {
    key: "--secondary-foreground",
    label: "Texto secundario",
    description: "Texto sobre el secundario",
  },
  {
    key: "--background",
    label: "Fondo",
    description: "Color de fondo general",
  },
  {
    key: "--foreground",
    label: "Texto",
    description: "Color de texto principal",
  },
  { key: "--card", label: "Tarjeta", description: "Fondo de tarjetas" },
  {
    key: "--card-foreground",
    label: "Texto tarjeta",
    description: "Texto en tarjetas",
  },
  {
    key: "--muted",
    label: "Atenuado",
    description: "Fondo de elementos atenuados",
  },
  {
    key: "--muted-foreground",
    label: "Texto atenuado",
    description: "Texto atenuado",
  },
  { key: "--accent", label: "Acento", description: "Color de acento" },
  {
    key: "--accent-foreground",
    label: "Texto acento",
    description: "Texto sobre acento",
  },
  {
    key: "--destructive",
    label: "Destructivo",
    description: "Color de acciones peligrosas",
  },
  { key: "--border", label: "Bordes", description: "Color de bordes" },
  {
    key: "--ring",
    label: "Anillo de foco",
    description: "Color del anillo de foco",
  },
] as const;

/**
 * Convierte oklch(...) a un hex aproximado para el input color
 * Si no es oklch, retorna el valor directo
 */
function cssToHex(value: string): string {
  if (!value) return "#000000";

  // Si ya es hex
  if (value.startsWith("#")) return value;

  // Intentar parsear oklch
  const match = value.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (!match) return "#000000";

  const [, L, C, H] = match.map(Number);

  // Conversión oklch -> sRGB aproximada
  const l = L;
  const c = C;
  const h = (H * Math.PI) / 180;

  const a_ = c * Math.cos(h);
  const b_ = c * Math.sin(h);

  // OKLab to linear sRGB
  const l_ = l + 0.3963377774 * a_ + 0.2158037573 * b_;
  const m_ = l - 0.1055613458 * a_ - 0.0638541728 * b_;
  const s_ = l - 0.0894841775 * a_ - 1.291485548 * b_;

  const lc = l_ * l_ * l_;
  const mc = m_ * m_ * m_;
  const sc = s_ * s_ * s_;

  const r = 4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc;
  const g = -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc;
  const b = -0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc;

  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const toGamma = (v: number) =>
    v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  const toHex = (v: number) =>
    Math.round(clamp(toGamma(clamp(v))) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Convierte hex a oklch(...)
 */
function hexToOklch(hex: string): string {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;

  // sRGB to linear
  const toLinear = (v: number) =>
    v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  const rl = toLinear(r);
  const gl = toLinear(g);
  const bl = toLinear(b);

  // Linear sRGB to OKLab
  const l_ = Math.cbrt(
    0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl,
  );
  const m_ = Math.cbrt(
    0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl,
  );
  const s_ = Math.cbrt(
    0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl,
  );

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const C = Math.sqrt(A * A + B * B);
  let H = (Math.atan2(B, A) * 180) / Math.PI;
  if (H < 0) H += 360;

  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(3)})`;
}

/**
 * Obtener las variables CSS actuales del documento
 */
function getCurrentCSSVariables(): Record<string, string> {
  const root = document.documentElement;
  const styles = getComputedStyle(root);
  const vars: Record<string, string> = {};

  for (const { key } of EDITABLE_VARIABLES) {
    const value = styles.getPropertyValue(key).trim();
    if (value) vars[key] = value;
  }

  return vars;
}

export default function AppearancePage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenant as string;
  const { tenant } = useAuthStore();
  const tenantId = tenant?.id || null;
  const { themes, isLoading: loadingThemes } = useThemes();
  const {
    themeId,
    customTheme,
    theme: currentTheme,
    isLoading: loadingTenantTheme,
    mutate,
  } = useTenantTheme(tenantId);

  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [editedVars, setEditedVars] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState<"light" | "dark">("light");

  // Inicializar estado desde datos del tenant
  useEffect(() => {
    if (loadingTenantTheme) return;
    setSelectedThemeId(themeId);
  }, [themeId, loadingTenantTheme]);

  // Cargar variables actuales al montar o cambiar editMode
  useEffect(() => {
    if (loadingTenantTheme) return;

    if (customTheme?.[editMode]) {
      // Si hay tema personalizado, usarlo
      setEditedVars(customTheme[editMode]);
    } else if (currentTheme?.css_variables) {
      // Si hay tema base seleccionado, usar sus variables
      const themeVars =
        currentTheme.css_variables as unknown as ThemeCSSVariables;
      if (themeVars[editMode]) {
        setEditedVars(themeVars[editMode]);
      }
    } else {
      // Leer las variables CSS actuales del documento
      setEditedVars(getCurrentCSSVariables());
    }
  }, [editMode, customTheme, currentTheme, loadingTenantTheme]);

  const handleVariableChange = useCallback((key: string, hexValue: string) => {
    const oklchValue = hexToOklch(hexValue);
    setEditedVars((prev) => ({ ...prev, [key]: oklchValue }));

    // Vista previa en vivo
    document.documentElement.style.setProperty(key, oklchValue);
  }, []);

  const handleSelectTheme = useCallback(
    async (theme: Theme) => {
      setSelectedThemeId(theme.id);
      const themeVars = theme.css_variables as unknown as ThemeCSSVariables;
      const modeVars = themeVars[editMode] || {};
      setEditedVars(modeVars);

      // Vista previa en vivo
      for (const [key, value] of Object.entries(modeVars)) {
        document.documentElement.style.setProperty(key, value as string);
      }
    },
    [editMode],
  );

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);

    try {
      // Construir el custom_theme con ambos modos
      const otherMode = editMode === "light" ? "dark" : "light";
      const existingOtherMode = customTheme?.[otherMode] || {};

      const newCustomTheme: ThemeCSSVariables = {
        [editMode]: editedVars,
        [otherMode]: existingOtherMode,
      } as unknown as ThemeCSSVariables;

      await appearanceService.updateTenantAppearance(tenantId, {
        theme_id: selectedThemeId,
        custom_theme: newCustomTheme,
      });

      await mutate();
      toast.success("Apariencia actualizada correctamente");
    } catch {
      toast.error("Error al guardar la apariencia");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = useCallback(() => {
    // Limpiar estilos inline y recargar variables del documento
    for (const { key } of EDITABLE_VARIABLES) {
      document.documentElement.style.removeProperty(key);
    }
    setEditedVars(getCurrentCSSVariables());
    setSelectedThemeId(themeId);
    toast.info("Cambios descartados");
  }, [themeId]);

  if (loadingThemes || loadingTenantTheme) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/t/${tenantSlug}/settings`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Apariencia</h1>
            <p className="text-muted-foreground">
              Personaliza los colores y el estilo visual de tu negocio
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Descartar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar cambios
          </Button>
        </div>
      </div>

      {/* Temas predefinidos */}
      {themes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Temas predefinidos</CardTitle>
            <CardDescription>
              Selecciona un tema base para tu negocio. Puedes personalizarlo
              después.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {themes.map((theme) => {
                const isSelected = selectedThemeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => handleSelectTheme(theme)}
                    className={`relative flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all hover:border-primary/50 ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <Check className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className="h-10 w-10 rounded-full border"
                      style={{
                        backgroundColor: theme.preview_color || "#6366f1",
                      }}
                    />
                    <span className="text-sm font-medium">{theme.name}</span>
                    {theme.description && (
                      <span className="text-xs text-muted-foreground text-center line-clamp-1">
                        {theme.description}
                      </span>
                    )}
                    {theme.is_default && (
                      <Badge variant="secondary" className="text-[10px]">
                        Por defecto
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Editor de colores */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Personalizar colores
              </CardTitle>
              <CardDescription>
                Ajusta cada color de la paleta. Los cambios se previsualizan en
                tiempo real.
              </CardDescription>
            </div>
            {/* Toggle modo claro/oscuro para editar */}
            <div className="flex items-center gap-1 rounded-lg border p-1">
              <Button
                variant={editMode === "light" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2.5"
                onClick={() => setEditMode("light")}
              >
                <Sun className="mr-1.5 h-3.5 w-3.5" />
                Claro
              </Button>
              <Button
                variant={editMode === "dark" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2.5"
                onClick={() => setEditMode("dark")}
              >
                <Moon className="mr-1.5 h-3.5 w-3.5" />
                Oscuro
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {EDITABLE_VARIABLES.map(({ key, label, description }) => {
              const value = editedVars[key] || "";
              const hexValue = cssToHex(value);

              return (
                <div key={key} className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="color"
                      value={hexValue}
                      onChange={(e) =>
                        handleVariableChange(key, e.target.value)
                      }
                      className="h-10 w-10 cursor-pointer rounded-lg border p-0.5"
                      style={{ appearance: "auto" }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Label className="text-sm font-medium">{label}</Label>
                    <p className="text-xs text-muted-foreground truncate">
                      {description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Vista previa */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vista previa</CardTitle>
          <CardDescription>
            Así se verán los elementos principales con la paleta actual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Botones */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Botones
              </Label>
              <div className="flex flex-wrap gap-2">
                <Button size="sm">Primario</Button>
                <Button size="sm" variant="secondary">
                  Secundario
                </Button>
                <Button size="sm" variant="outline">
                  Contorno
                </Button>
                <Button size="sm" variant="destructive">
                  Destructivo
                </Button>
                <Button size="sm" variant="ghost">
                  Ghost
                </Button>
              </div>
            </div>

            <Separator />

            {/* Badges */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Badges
              </Label>
              <div className="flex flex-wrap gap-2">
                <Badge>Primario</Badge>
                <Badge variant="secondary">Secundario</Badge>
                <Badge variant="outline">Contorno</Badge>
                <Badge variant="destructive">Destructivo</Badge>
              </div>
            </div>

            <Separator />

            {/* Cards */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Tarjetas
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Tarjeta ejemplo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      Este es un ejemplo de cómo se ve una tarjeta con la paleta
                      actual.
                    </p>
                  </CardContent>
                </Card>
                <div className="rounded-lg border bg-muted p-4">
                  <p className="text-sm font-medium">Fondo atenuado</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ejemplo de área con fondo muted y texto atenuado.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Texto */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Tipografía
              </Label>
              <div className="space-y-1">
                <p className="text-sm font-bold">
                  Texto en negrita (foreground)
                </p>
                <p className="text-sm text-muted-foreground">
                  Texto atenuado (muted-foreground)
                </p>
                <p className="text-sm text-primary">Texto primario (primary)</p>
                <p className="text-sm text-destructive">
                  Texto destructivo (destructive)
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
