// src/components/tenant/tenant-theme-applier.tsx
"use client";

import { useEffect } from "react";
import { useTenantTheme } from "@/hooks/supabase/use-appearance";
import {
  applyTenantThemeToDocument,
  clearTenantThemeFromDocument,
  resolveTenantThemeVariables,
} from "@/lib/theme-utils";
import { useTenantContext } from "@/providers/tenant-provider";

/**
 * Componente que aplica las variables CSS del tema asignado al tenant.
 * Siempre aplica la paleta propia de la empresa (sin modo claro/oscuro del navegador)
 * y limpia variables previas para que el sidebar y el layout se mantengan sincronizados.
 * Debe montarse dentro de TenantProvider.
 */
export function TenantThemeApplier() {
  const { tenant } = useTenantContext();
  const { customTheme, theme } = useTenantTheme(tenant?.id || null);

  useEffect(() => {
    const vars = resolveTenantThemeVariables(customTheme, theme);
    const themeFonts = (theme?.fonts ?? null) as Record<string, string> | null;

    applyTenantThemeToDocument(vars, themeFonts);

    return () => {
      clearTenantThemeFromDocument();
    };
  }, [customTheme, theme]);

  return null;
}
