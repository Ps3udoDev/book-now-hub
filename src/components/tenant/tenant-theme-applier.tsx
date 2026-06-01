// src/components/tenant/tenant-theme-applier.tsx
"use client";

import { useEffect } from "react";
import { useTenantTheme } from "@/hooks/supabase/use-appearance";
import { useTenantContext } from "@/providers/tenant-provider";
import { useTheme } from "@/providers/theme-provider";
import type { ThemeCSSVariables } from "@/types";

// Mapeo de fallback: si el tema NO define una variable de sidebar explícitamente,
// la derivamos a partir de la variable general equivalente. El tema puede forzar
// un sidebar con su propio color (p.ej. primary) definiendo --sidebar directamente.
const SIDEBAR_VAR_MAPPING: Record<string, string> = {
  "--background": "--sidebar",
  "--foreground": "--sidebar-foreground",
  "--primary": "--sidebar-primary",
  "--primary-foreground": "--sidebar-primary-foreground",
  "--accent": "--sidebar-accent",
  "--accent-foreground": "--sidebar-accent-foreground",
  "--border": "--sidebar-border",
  "--ring": "--sidebar-ring",
};

// Fuentes del tema → variables CSS que consume globals.css
const FONT_VAR_MAPPING: Record<string, string> = {
  sans: "--font-body",
  serif: "--font-heading",
  mono: "--font-mono",
};

/**
 * Componente que aplica las variables CSS del tema del tenant al documento.
 * Debe montarse dentro de TenantProvider.
 */
export function TenantThemeApplier() {
  const { tenant } = useTenantContext();
  const { resolvedMode } = useTheme();
  const { customTheme, theme } = useTenantTheme(tenant?.id || null);

  useEffect(() => {
    const root = document.documentElement;

    // Determinar qué variables aplicar
    let vars: Record<string, string> = {};

    if (customTheme?.[resolvedMode]) {
      // Prioridad 1: Tema personalizado del tenant
      vars = customTheme[resolvedMode];
    } else if (theme?.css_variables) {
      // Prioridad 2: Tema base seleccionado
      const themeVars = theme.css_variables as unknown as ThemeCSSVariables;
      if (themeVars[resolvedMode]) {
        vars = themeVars[resolvedMode];
      }
    }

    // Aplicar variables del tema
    const appliedKeys: string[] = [];
    for (const [key, value] of Object.entries(vars)) {
      if (value) {
        root.style.setProperty(key, value as string);
        appliedKeys.push(key);
      }
    }

    // Sincronizar variables del sidebar con las del tema
    // Si el tema define --background, el sidebar también lo usa
    for (const [themeVar, sidebarVar] of Object.entries(SIDEBAR_VAR_MAPPING)) {
      // Si el tema ya define la variable del sidebar explícitamente, respetar eso
      if (vars[sidebarVar]) continue;
      // Si el tema define la variable general, derivar la del sidebar
      const value = vars[themeVar];
      if (value) {
        root.style.setProperty(sidebarVar, value as string);
        appliedKeys.push(sidebarVar);
      }
    }

    // Aplicar fuentes del tema (serif para títulos, sans para body)
    const themeFonts = (theme?.fonts ?? null) as Record<string, string> | null;
    if (themeFonts) {
      for (const [fontKey, cssVar] of Object.entries(FONT_VAR_MAPPING)) {
        const value = themeFonts[fontKey];
        if (value) {
          root.style.setProperty(cssVar, value);
          appliedKeys.push(cssVar);
        }
      }
    }

    // Limpiar al desmontar
    return () => {
      for (const key of appliedKeys) {
        root.style.removeProperty(key);
      }
    };
  }, [customTheme, theme, resolvedMode]);

  return null;
}
