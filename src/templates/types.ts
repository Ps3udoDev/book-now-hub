// src/templates/types.ts

export interface ThemeColors {
  // Base
  background: string;
  foreground: string;

  // Card
  card: string;
  cardForeground: string;

  // Popover
  popover: string;
  popoverForeground: string;

  // Primary
  primary: string;
  primaryForeground: string;

  // Secondary
  secondary: string;
  secondaryForeground: string;

  // Muted
  muted: string;
  mutedForeground: string;

  // Accent
  accent: string;
  accentForeground: string;

  // Destructive
  destructive: string;

  // Border & Input
  border: string;
  input: string;
  ring: string;

  // Sidebar
  sidebar: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;

  // Charts (opcional)
  chart1?: string;
  chart2?: string;
  chart3?: string;
  chart4?: string;
  chart5?: string;
}

export interface ThemeConfig {
  light: ThemeColors;
  dark: ThemeColors;
}

export interface TemplateConfig {
  id: string;
  slug: string;
  name: string;
  description: string;
  author: string;
  version: string;
  previewImage?: string;
  theme: ThemeConfig;
  // Configuración de layout
  layout: {
    borderRadius: string; // "0.5rem", "0.625rem", "0.75rem"
    sidebarWidth: string;
    headerHeight: string;
  };
}

// Helper para convertir ThemeColors a CSS variables
export function themeColorsToCSSVariables(colors: ThemeColors): Record<string, string> {
  return {
    "--background": colors.background,
    "--foreground": colors.foreground,
    "--card": colors.card,
    "--card-foreground": colors.cardForeground,
    "--popover": colors.popover,
    "--popover-foreground": colors.popoverForeground,
    "--primary": colors.primary,
    "--primary-foreground": colors.primaryForeground,
    "--secondary": colors.secondary,
    "--secondary-foreground": colors.secondaryForeground,
    "--muted": colors.muted,
    "--muted-foreground": colors.mutedForeground,
    "--accent": colors.accent,
    "--accent-foreground": colors.accentForeground,
    "--destructive": colors.destructive,
    "--border": colors.border,
    "--input": colors.input,
    "--ring": colors.ring,
    "--sidebar": colors.sidebar,
    "--sidebar-foreground": colors.sidebarForeground,
    "--sidebar-primary": colors.sidebarPrimary,
    "--sidebar-primary-foreground": colors.sidebarPrimaryForeground,
    "--sidebar-accent": colors.sidebarAccent,
    "--sidebar-accent-foreground": colors.sidebarAccentForeground,
    "--sidebar-border": colors.sidebarBorder,
  };
}

// Helper para aplicar variables CSS al documento
export function applyThemeToDocument(colors: ThemeColors) {
  const root = document.documentElement;
  const variables = themeColorsToCSSVariables(colors);

  Object.entries(variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

// Helper para resetear al tema por defecto
export function resetThemeToDefault() {
  const root = document.documentElement;
  const variables = [
    "--background",
    "--foreground",
    "--card",
    "--card-foreground",
    "--popover",
    "--popover-foreground",
    "--primary",
    "--primary-foreground",
    "--secondary",
    "--secondary-foreground",
    "--muted",
    "--muted-foreground",
    "--accent",
    "--accent-foreground",
    "--destructive",
    "--border",
    "--input",
    "--ring",
    "--sidebar",
    "--sidebar-foreground",
    "--sidebar-primary",
    "--sidebar-primary-foreground",
    "--sidebar-accent",
    "--sidebar-accent-foreground",
    "--sidebar-border",
  ];

  variables.forEach((key) => {
    root.style.removeProperty(key);
  });
}