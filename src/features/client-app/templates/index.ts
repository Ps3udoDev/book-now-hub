import type { CSSProperties } from "react";
import type { Json } from "@/types/supabase";

export type ClientAppTemplateSlug =
  | "beauty"
  | "dental"
  | "wellness"
  | "barber"
  | "studio";

export type ClientAppThemeMode = "light" | "dark" | "system";

export type ClientAppDensity = "compact" | "comfortable" | "spacious";

export interface ClientAppPalette {
  bg: string;
  surface: string;
  surfaceAlt: string;
  fg: string;
  fgMuted: string;
  fgFaint: string;
  border: string;
  primary: string;
  primaryFg: string;
  accent: string;
  accentFg: string;
  success: string;
  shadow: string;
  shadowSoft: string;
}

export interface ClientAppTemplate {
  id: ClientAppTemplateSlug;
  name: string;
  tagline: string;
  description: string;
  fonts: {
    display: string;
    body: string;
  };
  googleFonts: string[];
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  density: ClientAppDensity;
  heroImage: string;
  light: ClientAppPalette;
  dark: ClientAppPalette;
}

export type ClientAppTokenOverrides = Partial<
  Pick<
    ClientAppPalette,
    "primary" | "accent" | "bg" | "surface" | "fg" | "surfaceAlt" | "fgMuted"
  >
>;

export interface ClientAppSettingsShape {
  tenant_id: string;
  tenant_slug?: string;
  tenant_name?: string;
  client_app_enabled?: boolean;
  template_slug: string;
  theme_mode: string;
  brand_name: string | null;
  logo_url: string | null;
  hero_image_url: string | null;
  welcome_title: string | null;
  welcome_subtitle: string | null;
  google_login_enabled: boolean;
  show_google_login_preview: boolean;
  custom_tokens: Json;
  custom_sections: Json;
}

export interface ResolvedClientAppTheme {
  template: ClientAppTemplate;
  mode: "light" | "dark";
  density: ClientAppDensity;
  tokens: ClientAppPalette & {
    fontDisplay: string;
    fontBody: string;
    radSm: string;
    radMd: string;
    radLg: string;
    radXl: string;
  };
}

export const clientAppTemplates: ClientAppTemplate[] = [
  {
    id: "beauty",
    name: "Beauty Luxe",
    tagline: "Salon de belleza premium",
    description:
      "Calido, dorado tierra y serif editorial para salones premium.",
    fonts: {
      display: '"Cormorant Garamond", "Playfair Display", Georgia, serif',
      body: '"Inter", system-ui, sans-serif',
    },
    googleFonts: [
      "Cormorant+Garamond:wght@400;500;600;700",
      "Inter:wght@300;400;500;600;700",
    ],
    radius: { sm: 6, md: 14, lg: 22, xl: 32 },
    density: "comfortable",
    heroImage:
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=900&q=80",
    light: {
      bg: "#f2edde",
      surface: "#fbf7e9",
      surfaceAlt: "#e8ddc4",
      fg: "#2a2117",
      fgMuted: "#6b5d49",
      fgFaint: "#a89880",
      border: "rgba(42, 33, 23, 0.10)",
      primary: "#4b561a",
      primaryFg: "#fbf7e9",
      accent: "#b59e7d",
      accentFg: "#2a2117",
      success: "#4b561a",
      shadow: "0 14px 40px -16px rgba(75, 86, 26, 0.20)",
      shadowSoft: "0 2px 8px rgba(42,33,23,0.04)",
    },
    dark: {
      bg: "#1c160f",
      surface: "#2a2117",
      surfaceAlt: "#3a2f22",
      fg: "#f0e6d2",
      fgMuted: "#b8a785",
      fgFaint: "#7a6c54",
      border: "rgba(240, 230, 210, 0.08)",
      primary: "#b59e7d",
      primaryFg: "#1c160f",
      accent: "#8a8a2a",
      accentFg: "#f0e6d2",
      success: "#b59e7d",
      shadow: "0 14px 40px -16px rgba(0,0,0,0.55)",
      shadowSoft: "0 2px 8px rgba(0,0,0,0.25)",
    },
  },
  {
    id: "dental",
    name: "Dental Pure",
    tagline: "Clinica odontologica",
    description: "Limpio, higienico, azul confianza con acentos menta.",
    fonts: {
      display: '"DM Sans", system-ui, sans-serif',
      body: '"DM Sans", system-ui, sans-serif',
    },
    googleFonts: ["DM+Sans:wght@400;500;600;700;800"],
    radius: { sm: 8, md: 16, lg: 24, xl: 32 },
    density: "spacious",
    heroImage:
      "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=900&q=80",
    light: {
      bg: "#f4f8fc",
      surface: "#ffffff",
      surfaceAlt: "#e8f1f9",
      fg: "#0d2a4a",
      fgMuted: "#5a738f",
      fgFaint: "#9bb0c4",
      border: "rgba(13, 42, 74, 0.08)",
      primary: "#2563d9",
      primaryFg: "#ffffff",
      accent: "#4fd1c5",
      accentFg: "#0d2a4a",
      success: "#10b981",
      shadow: "0 12px 36px -14px rgba(37, 99, 217, 0.18)",
      shadowSoft: "0 1px 4px rgba(13,42,74,0.04)",
    },
    dark: {
      bg: "#0b1424",
      surface: "#152340",
      surfaceAlt: "#1f2f50",
      fg: "#e6efff",
      fgMuted: "#8ea3c4",
      fgFaint: "#5a6f90",
      border: "rgba(230, 239, 255, 0.08)",
      primary: "#5b9bff",
      primaryFg: "#0b1424",
      accent: "#4fd1c5",
      accentFg: "#0b1424",
      success: "#34d399",
      shadow: "0 12px 36px -14px rgba(0,0,0,0.55)",
      shadowSoft: "0 1px 4px rgba(0,0,0,0.25)",
    },
  },
  {
    id: "wellness",
    name: "Wellness Serenity",
    tagline: "Spa y centro de bienestar",
    description: "Sage, lavanda y composicion tranquila para spas.",
    fonts: {
      display: '"Fraunces", "Cormorant Garamond", Georgia, serif',
      body: '"Manrope", system-ui, sans-serif',
    },
    googleFonts: [
      "Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600",
      "Manrope:wght@300;400;500;600",
    ],
    radius: { sm: 4, md: 10, lg: 18, xl: 28 },
    density: "spacious",
    heroImage:
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=900&q=80",
    light: {
      bg: "#f4f1ea",
      surface: "#fbf9f3",
      surfaceAlt: "#e7e2d4",
      fg: "#2c3328",
      fgMuted: "#6b7464",
      fgFaint: "#9ea592",
      border: "rgba(44, 51, 40, 0.08)",
      primary: "#5c7361",
      primaryFg: "#fbf9f3",
      accent: "#a39ec0",
      accentFg: "#2c3328",
      success: "#5c7361",
      shadow: "0 12px 36px -14px rgba(92, 115, 97, 0.16)",
      shadowSoft: "0 1px 4px rgba(44,51,40,0.04)",
    },
    dark: {
      bg: "#1a1f1b",
      surface: "#252b25",
      surfaceAlt: "#323a32",
      fg: "#e8ebe3",
      fgMuted: "#9aa294",
      fgFaint: "#6a7268",
      border: "rgba(232, 235, 227, 0.08)",
      primary: "#8ba593",
      primaryFg: "#1a1f1b",
      accent: "#a39ec0",
      accentFg: "#1a1f1b",
      success: "#8ba593",
      shadow: "0 12px 36px -14px rgba(0,0,0,0.5)",
      shadowSoft: "0 1px 4px rgba(0,0,0,0.25)",
    },
  },
  {
    id: "barber",
    name: "Barber Bold",
    tagline: "Barberia y grooming",
    description: "Negro profundo, burgundy, dorado y tipografia condensada.",
    fonts: {
      display: '"Oswald", "Bebas Neue", Impact, sans-serif',
      body: '"IBM Plex Sans", system-ui, sans-serif',
    },
    googleFonts: [
      "Oswald:wght@400;500;600;700",
      "IBM+Plex+Sans:wght@300;400;500;600",
    ],
    radius: { sm: 2, md: 4, lg: 6, xl: 10 },
    density: "compact",
    heroImage:
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=900&q=80",
    light: {
      bg: "#f3ede2",
      surface: "#faf5eb",
      surfaceAlt: "#e5dcc8",
      fg: "#1a1410",
      fgMuted: "#4a3f33",
      fgFaint: "#8a7a66",
      border: "rgba(26, 20, 16, 0.12)",
      primary: "#6b1f2c",
      primaryFg: "#faf5eb",
      accent: "#c5a572",
      accentFg: "#1a1410",
      success: "#6b1f2c",
      shadow: "0 14px 40px -16px rgba(26,20,16,0.20)",
      shadowSoft: "0 1px 4px rgba(26,20,16,0.06)",
    },
    dark: {
      bg: "#0d0907",
      surface: "#1a130f",
      surfaceAlt: "#251c16",
      fg: "#f5ecdb",
      fgMuted: "#a89878",
      fgFaint: "#6a5d48",
      border: "rgba(245, 236, 219, 0.08)",
      primary: "#c5a572",
      primaryFg: "#0d0907",
      accent: "#8a2434",
      accentFg: "#f5ecdb",
      success: "#c5a572",
      shadow: "0 14px 40px -16px rgba(0,0,0,0.7)",
      shadowSoft: "0 2px 8px rgba(0,0,0,0.3)",
    },
  },
  {
    id: "studio",
    name: "Studio Modern",
    tagline: "Multiproposito premium",
    description: "Neutro contemporaneo con acento electrico.",
    fonts: {
      display: '"Geist", "Inter", system-ui, sans-serif',
      body: '"Geist", "Inter", system-ui, sans-serif',
    },
    googleFonts: ["Geist:wght@300;400;500;600;700;800"],
    radius: { sm: 6, md: 12, lg: 18, xl: 24 },
    density: "comfortable",
    heroImage:
      "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=900&q=80",
    light: {
      bg: "#fafaf9",
      surface: "#ffffff",
      surfaceAlt: "#f0efed",
      fg: "#0c0c0c",
      fgMuted: "#525252",
      fgFaint: "#a3a3a3",
      border: "rgba(12, 12, 12, 0.08)",
      primary: "#18181b",
      primaryFg: "#fafaf9",
      accent: "#e26d3a",
      accentFg: "#fafaf9",
      success: "#22c55e",
      shadow: "0 16px 40px -18px rgba(12,12,12,0.18)",
      shadowSoft: "0 1px 3px rgba(12,12,12,0.04)",
    },
    dark: {
      bg: "#0a0a0a",
      surface: "#161616",
      surfaceAlt: "#222222",
      fg: "#fafaf9",
      fgMuted: "#a3a3a3",
      fgFaint: "#5a5a5a",
      border: "rgba(250, 250, 249, 0.08)",
      primary: "#fafaf9",
      primaryFg: "#0a0a0a",
      accent: "#e26d3a",
      accentFg: "#fafaf9",
      success: "#34d399",
      shadow: "0 16px 40px -18px rgba(0,0,0,0.7)",
      shadowSoft: "0 1px 3px rgba(0,0,0,0.3)",
    },
  },
];

export const defaultClientAppTemplate = clientAppTemplates[0];

export function getClientAppTemplate(slug?: string | null) {
  return (
    clientAppTemplates.find((template) => template.id === slug) ||
    defaultClientAppTemplate
  );
}

export function normalizeClientAppOverrides(
  raw: Json | null | undefined,
): ClientAppTokenOverrides {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const source = raw as Record<string, unknown>;
  const allowed = [
    "primary",
    "accent",
    "bg",
    "surface",
    "fg",
    "surfaceAlt",
    "fgMuted",
  ] as const;
  const result: ClientAppTokenOverrides = {};
  for (const key of allowed) {
    if (typeof source[key] === "string") {
      result[key] = source[key] as string;
    }
  }
  return result;
}

export function resolveClientAppTheme(
  settings?: Partial<ClientAppSettingsShape> | null,
): ResolvedClientAppTheme {
  const template = getClientAppTemplate(settings?.template_slug);
  const requestedMode = settings?.theme_mode;
  const mode =
    requestedMode === "dark"
      ? "dark"
      : requestedMode === "system" &&
          typeof window !== "undefined" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  const overrides = normalizeClientAppOverrides(settings?.custom_tokens);
  const palette = {
    ...template[mode],
    ...overrides,
  };

  return {
    template,
    mode,
    density: template.density,
    tokens: {
      ...palette,
      fontDisplay: template.fonts.display,
      fontBody: template.fonts.body,
      radSm: `${template.radius.sm}px`,
      radMd: `${template.radius.md}px`,
      radLg: `${template.radius.lg}px`,
      radXl: `${template.radius.xl}px`,
    },
  };
}

export function getClientAppThemeStyle(
  settings?: Partial<ClientAppSettingsShape> | null,
): CSSProperties {
  const { tokens } = resolveClientAppTheme(settings);
  return {
    "--client-bg": tokens.bg,
    "--client-surface": tokens.surface,
    "--client-surface-alt": tokens.surfaceAlt,
    "--client-fg": tokens.fg,
    "--client-fg-muted": tokens.fgMuted,
    "--client-fg-faint": tokens.fgFaint,
    "--client-border": tokens.border,
    "--client-primary": tokens.primary,
    "--client-primary-fg": tokens.primaryFg,
    "--client-accent": tokens.accent,
    "--client-accent-fg": tokens.accentFg,
    "--client-success": tokens.success,
    "--client-shadow": tokens.shadow,
    "--client-shadow-soft": tokens.shadowSoft,
    "--client-font-display": tokens.fontDisplay,
    "--client-font-body": tokens.fontBody,
    "--client-rad-sm": tokens.radSm,
    "--client-rad-md": tokens.radMd,
    "--client-rad-lg": tokens.radLg,
    "--client-rad-xl": tokens.radXl,
    "--background": tokens.bg,
    "--foreground": tokens.fg,
    "--card": tokens.surface,
    "--card-foreground": tokens.fg,
    "--popover": tokens.surface,
    "--popover-foreground": tokens.fg,
    "--primary": tokens.primary,
    "--primary-foreground": tokens.primaryFg,
    "--secondary": tokens.surfaceAlt,
    "--secondary-foreground": tokens.fg,
    "--muted": tokens.surfaceAlt,
    "--muted-foreground": tokens.fgMuted,
    "--accent": tokens.surfaceAlt,
    "--accent-foreground": tokens.fg,
    "--border": tokens.border,
    "--input": tokens.border,
    "--ring": tokens.primary,
    "--radius": tokens.radMd,
    "--font-heading": tokens.fontDisplay,
    "--font-body": tokens.fontBody,
  } as CSSProperties;
}

export function getClientAppFontHref() {
  const families = new Set<string>();
  for (const template of clientAppTemplates) {
    for (const font of template.googleFonts) families.add(font);
  }
  return `https://fonts.googleapis.com/css2?${Array.from(families)
    .map((family) => `family=${family}`)
    .join("&")}&display=swap`;
}
