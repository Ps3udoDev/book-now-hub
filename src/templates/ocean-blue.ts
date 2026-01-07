// src/templates/ocean-blue.ts
import type { TemplateConfig } from "./types";

export const oceanBlueTemplate: TemplateConfig = {
  id: "ocean-blue",
  slug: "ocean-blue",
  name: "Ocean Blue",
  description: "Tema azul vibrante y moderno. Perfecto para startups y aplicaciones creativas.",
  author: "Book Now Hub",
  version: "1.0.0",
  theme: {
    light: {
      // Base - Fondo ligeramente azulado
      background: "oklch(0.99 0.005 240)",
      foreground: "oklch(0.15 0.03 250)",

      // Card
      card: "oklch(1 0 0)",
      cardForeground: "oklch(0.15 0.03 250)",

      // Popover
      popover: "oklch(1 0 0)",
      popoverForeground: "oklch(0.15 0.03 250)",

      // Primary - Azul vibrante
      primary: "oklch(0.55 0.2 250)",
      primaryForeground: "oklch(0.98 0.01 250)",

      // Secondary
      secondary: "oklch(0.95 0.02 250)",
      secondaryForeground: "oklch(0.25 0.05 250)",

      // Muted
      muted: "oklch(0.96 0.015 250)",
      mutedForeground: "oklch(0.5 0.03 250)",

      // Accent - Cyan/Turquesa
      accent: "oklch(0.92 0.04 200)",
      accentForeground: "oklch(0.2 0.05 200)",

      // Destructive
      destructive: "oklch(0.55 0.22 25)",

      // Border & Input
      border: "oklch(0.9 0.02 250)",
      input: "oklch(0.9 0.02 250)",
      ring: "oklch(0.55 0.2 250)",

      // Sidebar - Azul oscuro
      sidebar: "oklch(0.25 0.06 250)",
      sidebarForeground: "oklch(0.95 0.01 250)",
      sidebarPrimary: "oklch(0.65 0.18 250)",
      sidebarPrimaryForeground: "oklch(0.98 0.01 250)",
      sidebarAccent: "oklch(0.35 0.06 250)",
      sidebarAccentForeground: "oklch(0.95 0.01 250)",
      sidebarBorder: "oklch(0.35 0.05 250)",

      // Charts
      chart1: "oklch(0.55 0.2 250)",
      chart2: "oklch(0.65 0.15 180)",
      chart3: "oklch(0.7 0.18 150)",
      chart4: "oklch(0.75 0.15 280)",
      chart5: "oklch(0.6 0.2 320)",
    },
    dark: {
      // Base - Fondo azul muy oscuro
      background: "oklch(0.15 0.03 250)",
      foreground: "oklch(0.95 0.01 250)",

      // Card
      card: "oklch(0.2 0.04 250)",
      cardForeground: "oklch(0.95 0.01 250)",

      // Popover
      popover: "oklch(0.2 0.04 250)",
      popoverForeground: "oklch(0.95 0.01 250)",

      // Primary - Azul más claro para contraste
      primary: "oklch(0.7 0.18 250)",
      primaryForeground: "oklch(0.15 0.03 250)",

      // Secondary
      secondary: "oklch(0.28 0.05 250)",
      secondaryForeground: "oklch(0.9 0.02 250)",

      // Muted
      muted: "oklch(0.28 0.04 250)",
      mutedForeground: "oklch(0.65 0.03 250)",

      // Accent
      accent: "oklch(0.3 0.06 200)",
      accentForeground: "oklch(0.9 0.02 200)",

      // Destructive
      destructive: "oklch(0.65 0.2 25)",

      // Border & Input
      border: "oklch(0.3 0.04 250)",
      input: "oklch(0.25 0.04 250)",
      ring: "oklch(0.6 0.15 250)",

      // Sidebar
      sidebar: "oklch(0.12 0.025 250)",
      sidebarForeground: "oklch(0.95 0.01 250)",
      sidebarPrimary: "oklch(0.65 0.18 250)",
      sidebarPrimaryForeground: "oklch(0.98 0.01 250)",
      sidebarAccent: "oklch(0.25 0.04 250)",
      sidebarAccentForeground: "oklch(0.95 0.01 250)",
      sidebarBorder: "oklch(0.25 0.03 250)",

      // Charts
      chart1: "oklch(0.65 0.18 250)",
      chart2: "oklch(0.7 0.15 180)",
      chart3: "oklch(0.75 0.18 150)",
      chart4: "oklch(0.7 0.2 280)",
      chart5: "oklch(0.65 0.22 320)",
    },
  },
  layout: {
    borderRadius: "0.75rem",
    sidebarWidth: "16rem",
    headerHeight: "4rem",
  },
};