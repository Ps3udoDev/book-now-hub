"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  resolvedMode: "light" | "dark";
  mounted: boolean; // 👈 opcional por si quieres usarlo en el toggle
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultMode?: ThemeMode;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultMode = "system",
  storageKey = "theme-mode",
}: ThemeProviderProps) {
  const pathname = usePathname();
  // Las rutas de tenant (/t/...) y app cliente (/c/...) usan únicamente el tema asignado a la empresa,
  // sin aplicar el modo oscuro/claro del navegador.
  const isTenantScopedRoute =
    Boolean(pathname?.startsWith("/t/")) ||
    Boolean(pathname?.startsWith("/c/"));

  const [mode, setModeState] = useState<ThemeMode>(defaultMode);
  const [resolvedMode, setResolvedMode] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey) as ThemeMode | null;
    if (stored && ["light", "dark", "system"].includes(stored)) {
      setModeState(stored);
    }
    setMounted(true);
  }, [storageKey]);

  useEffect(() => {
    const updateResolvedMode = () => {
      if (mode === "system") {
        const systemPrefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)",
        ).matches;
        setResolvedMode(systemPrefersDark ? "dark" : "light");
      } else {
        setResolvedMode(mode);
      }
    };

    updateResolvedMode();

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => updateResolvedMode();
    mediaQuery.addEventListener("change", handler);

    return () => mediaQuery.removeEventListener("change", handler);
  }, [mode]);

  const effectiveResolvedMode: "light" | "dark" = isTenantScopedRoute
    ? "light"
    : resolvedMode;

  useEffect(() => {
    const root = document.documentElement;
    if (effectiveResolvedMode === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [effectiveResolvedMode]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(storageKey, newMode);
  };

  return (
    <ThemeContext.Provider
      value={{ mode, setMode, resolvedMode: effectiveResolvedMode, mounted }}
    >
      <div style={{ visibility: mounted ? "visible" : "hidden" }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
}
