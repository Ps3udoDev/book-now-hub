// src/components/tenant/tenant-theme-applier.tsx
"use client";

import { useEffect } from "react";
import { useTenantContext } from "@/providers/tenant-provider";
import { useTenantTheme } from "@/hooks/supabase/use-appearance";
import { useTheme } from "@/providers/theme-provider";
import type { ThemeCSSVariables } from "@/types";

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

    // Aplicar variables
    const appliedKeys: string[] = [];
    for (const [key, value] of Object.entries(vars)) {
      if (value) {
        root.style.setProperty(key, value as string);
        appliedKeys.push(key);
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
