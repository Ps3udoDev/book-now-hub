// src/providers/theme-provider.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  resolvedMode: "light" | "dark";
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
  const [mode, setModeState] = useState<ThemeMode>(defaultMode);
  const [resolvedMode, setResolvedMode] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  // Cargar preferencia guardada al montar
  useEffect(() => {
    const stored = localStorage.getItem(storageKey) as ThemeMode | null;
    if (stored && ["light", "dark", "system"].includes(stored)) {
      setModeState(stored);
    }
    setMounted(true);
  }, [storageKey]);

  // Resolver el modo real (light/dark) basado en preferencia del sistema
  useEffect(() => {
    const updateResolvedMode = () => {
      if (mode === "system") {
        const systemPrefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
        setResolvedMode(systemPrefersDark ? "dark" : "light");
      } else {
        setResolvedMode(mode);
      }
    };

    updateResolvedMode();

    // Escuchar cambios en preferencia del sistema
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => updateResolvedMode();
    mediaQuery.addEventListener("change", handler);

    return () => mediaQuery.removeEventListener("change", handler);
  }, [mode]);

  // Aplicar clase dark al html
  useEffect(() => {
    const root = document.documentElement;

    // Toggle clase dark
    if (resolvedMode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [resolvedMode]);

  // Guardar preferencia
  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(storageKey, newMode);
  };

  // Evitar flash de contenido incorrecto
  if (!mounted) {
    return (
      <div style={{ visibility: "hidden" }}>
        {children}
      </div>
    );
  }

  return (
    <ThemeContext.Provider
      value={{
        mode,
        setMode,
        resolvedMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}