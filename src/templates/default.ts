// src/templates/default.ts
import type { TemplateConfig } from "./types";

export const defaultTemplate: TemplateConfig = {
  id: "default",
  slug: "default",
  name: "Default Gray",
  description: "Tema gris neutral y profesional. Ideal para aplicaciones de gestión empresarial.",
  author: "Book Now Hub",
  version: "1.0.0",
  theme: {
    light: {
      // Base
      background: "oklch(1 0 0)",
      foreground: "oklch(0.13 0.028 261.692)",

      // Card
      card: "oklch(1 0 0)",
      cardForeground: "oklch(0.13 0.028 261.692)",

      // Popover
      popover: "oklch(1 0 0)",
      popoverForeground: "oklch(0.13 0.028 261.692)",

      // Primary
      primary: "oklch(0.21 0.034 264.665)",
      primaryForeground: "oklch(0.985 0.002 247.839)",

      // Secondary
      secondary: "oklch(0.967 0.003 264.542)",
      secondaryForeground: "oklch(0.21 0.034 264.665)",

      // Muted
      muted: "oklch(0.967 0.003 264.542)",
      mutedForeground: "oklch(0.551 0.027 264.364)",

      // Accent
      accent: "oklch(0.967 0.003 264.542)",
      accentForeground: "oklch(0.21 0.034 264.665)",

      // Destructive
      destructive: "oklch(0.577 0.245 27.325)",

      // Border & Input
      border: "oklch(0.928 0.006 264.531)",
      input: "oklch(0.928 0.006 264.531)",
      ring: "oklch(0.707 0.022 261.325)",

      // Sidebar
      sidebar: "oklch(0.985 0.002 247.839)",
      sidebarForeground: "oklch(0.13 0.028 261.692)",
      sidebarPrimary: "oklch(0.21 0.034 264.665)",
      sidebarPrimaryForeground: "oklch(0.985 0.002 247.839)",
      sidebarAccent: "oklch(0.967 0.003 264.542)",
      sidebarAccentForeground: "oklch(0.21 0.034 264.665)",
      sidebarBorder: "oklch(0.928 0.006 264.531)",

      // Charts
      chart1: "oklch(0.646 0.222 41.116)",
      chart2: "oklch(0.6 0.118 184.704)",
      chart3: "oklch(0.398 0.07 227.392)",
      chart4: "oklch(0.828 0.189 84.429)",
      chart5: "oklch(0.769 0.188 70.08)",
    },
    dark: {
      // Base
      background: "oklch(0.13 0.028 261.692)",
      foreground: "oklch(0.985 0.002 247.839)",

      // Card
      card: "oklch(0.21 0.034 264.665)",
      cardForeground: "oklch(0.985 0.002 247.839)",

      // Popover
      popover: "oklch(0.21 0.034 264.665)",
      popoverForeground: "oklch(0.985 0.002 247.839)",

      // Primary
      primary: "oklch(0.928 0.006 264.531)",
      primaryForeground: "oklch(0.21 0.034 264.665)",

      // Secondary
      secondary: "oklch(0.278 0.033 256.848)",
      secondaryForeground: "oklch(0.985 0.002 247.839)",

      // Muted
      muted: "oklch(0.278 0.033 256.848)",
      mutedForeground: "oklch(0.707 0.022 261.325)",

      // Accent
      accent: "oklch(0.278 0.033 256.848)",
      accentForeground: "oklch(0.985 0.002 247.839)",

      // Destructive
      destructive: "oklch(0.704 0.191 22.216)",

      // Border & Input
      border: "oklch(1 0 0 / 10%)",
      input: "oklch(1 0 0 / 15%)",
      ring: "oklch(0.551 0.027 264.364)",

      // Sidebar
      sidebar: "oklch(0.21 0.034 264.665)",
      sidebarForeground: "oklch(0.985 0.002 247.839)",
      sidebarPrimary: "oklch(0.488 0.243 264.376)",
      sidebarPrimaryForeground: "oklch(0.985 0.002 247.839)",
      sidebarAccent: "oklch(0.278 0.033 256.848)",
      sidebarAccentForeground: "oklch(0.985 0.002 247.839)",
      sidebarBorder: "oklch(1 0 0 / 10%)",

      // Charts
      chart1: "oklch(0.488 0.243 264.376)",
      chart2: "oklch(0.696 0.17 162.48)",
      chart3: "oklch(0.769 0.188 70.08)",
      chart4: "oklch(0.627 0.265 303.9)",
      chart5: "oklch(0.645 0.246 16.439)",
    },
  },
  layout: {
    borderRadius: "0.625rem",
    sidebarWidth: "16rem",
    headerHeight: "4rem",
  },
};