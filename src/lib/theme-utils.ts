// src/lib/theme-utils.ts
import type { Theme, ThemeCSSVariables } from "@/types";

// Mapeo de fallback: si el tema NO define una variable de sidebar explícitamente,
// la derivamos a partir de la variable general equivalente. El tema puede forzar
// un sidebar con su propio color (p.ej. primary) definiendo --sidebar directamente.
export const SIDEBAR_VAR_MAPPING: Record<string, string> = {
  "--background": "--sidebar",
  "--foreground": "--sidebar-foreground",
  "--primary": "--sidebar-primary",
  "--primary-foreground": "--sidebar-primary-foreground",
  "--accent": "--sidebar-accent",
  "--accent-foreground": "--sidebar-accent-foreground",
  "--border": "--sidebar-border",
  "--ring": "--sidebar-ring",
};

// Mapeo inverso para mostrar el valor efectivo de cada variable del sidebar en el editor
export const SIDEBAR_FALLBACK_SOURCE: Record<string, string> =
  Object.fromEntries(
    Object.entries(SIDEBAR_VAR_MAPPING).map(([themeVar, sidebarVar]) => [
      sidebarVar,
      themeVar,
    ]),
  );

// Fuentes del tema -> variables CSS que consume globals.css
export const FONT_VAR_MAPPING: Record<string, string> = {
  sans: "--font-body",
  serif: "--font-heading",
  mono: "--font-mono",
};

// Lista completa de variables CSS gestionadas por temas de tenant
export const MANAGED_THEME_CSS_VARS = [
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
  "--destructive-foreground",
  "--border",
  "--input",
  "--ring",
  "--radius",
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
  "--sidebar",
  "--sidebar-foreground",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--sidebar-accent",
  "--sidebar-accent-foreground",
  "--sidebar-border",
  "--sidebar-ring",
  "--font-body",
  "--font-heading",
  "--font-mono",
] as const;

// Rastrea cualquier variable adicional aplicada al documento para garantizar limpieza total
const appliedCustomKeys = new Set<string>();

function getNonEmptyVars(
  vars?: Record<string, string> | null,
): Record<string, string> | null {
  if (!vars || typeof vars !== "object") return null;
  const entries = Object.entries(vars).filter(
    ([, value]) => typeof value === "string" && value.trim().length > 0,
  );
  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

/**
 * Extrae las variables base de un tema de empresa.
 * Los tenants usan una sola paleta fija (sin alternar modo claro/oscuro del navegador).
 */
export function getThemeBaseVariables(
  theme: Pick<Theme, "css_variables"> | null | undefined,
): Record<string, string> {
  const themeVars = theme?.css_variables as unknown as ThemeCSSVariables | null;
  return (
    getNonEmptyVars(themeVars?.light) || getNonEmptyVars(themeVars?.dark) || {}
  );
}

/**
 * Resuelve las variables finales del tema asignado a un tenant.
 * Si existe custom_theme con valores, se combina sobre las variables del tema base.
 */
export function resolveTenantThemeVariables(
  customTheme: ThemeCSSVariables | null | undefined,
  theme: Pick<Theme, "css_variables"> | null | undefined,
): Record<string, string> {
  const baseVars = getThemeBaseVariables(theme);
  const customVars =
    getNonEmptyVars(customTheme?.light) || getNonEmptyVars(customTheme?.dark);

  if (customVars) {
    return { ...baseVars, ...customVars };
  }

  return baseVars;
}

/**
 * Elimina todas las variables CSS de tema aplicadas inline en documentElement.
 */
export function clearTenantThemeFromDocument(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  for (const key of MANAGED_THEME_CSS_VARS) {
    root.style.removeProperty(key);
  }
  for (const key of appliedCustomKeys) {
    root.style.removeProperty(key);
  }
  appliedCustomKeys.clear();
}

/**
 * Aplica el tema del tenant al documento limpiando primero cualquier variable previa
 * (incluyendo overrides de --sidebar*) y desactivando la clase .dark.
 */
export function applyTenantThemeToDocument(
  vars: Record<string, string>,
  fonts?: Record<string, string> | null,
): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // Asegurar que el modo oscuro del navegador no interfiera con el tema de la empresa
  root.classList.remove("dark");

  // Limpiar siempre antes de aplicar para evitar que queden colores residuales (p.ej. --sidebar)
  clearTenantThemeFromDocument();

  for (const [key, value] of Object.entries(vars)) {
    if (typeof value === "string" && value.trim().length > 0) {
      root.style.setProperty(key, value);
      appliedCustomKeys.add(key);
    }
  }

  // Sincronizar variables del sidebar: si el tema no define --sidebar* explícitamente,
  // derivarlas de las variables generales equivalentes.
  for (const [themeVar, sidebarVar] of Object.entries(SIDEBAR_VAR_MAPPING)) {
    const explicitSidebarValue = vars[sidebarVar];
    if (
      typeof explicitSidebarValue === "string" &&
      explicitSidebarValue.trim().length > 0
    ) {
      continue;
    }
    const fallbackValue = vars[themeVar];
    if (typeof fallbackValue === "string" && fallbackValue.trim().length > 0) {
      root.style.setProperty(sidebarVar, fallbackValue);
      appliedCustomKeys.add(sidebarVar);
    }
  }

  // Aplicar fuentes del tema si existen
  if (fonts) {
    for (const [fontKey, cssVar] of Object.entries(FONT_VAR_MAPPING)) {
      const value = fonts[fontKey];
      if (typeof value === "string" && value.trim().length > 0) {
        root.style.setProperty(cssVar, value);
        appliedCustomKeys.add(cssVar);
      }
    }
  }
}
