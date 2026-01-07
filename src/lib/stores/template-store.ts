// src/lib/stores/template-store.ts
import { create } from "zustand";
import type { TemplateConfig, ThemeColors } from "@/templates/types";
import { templates, defaultTemplate } from "@/templates";
import { applyThemeToDocument, resetThemeToDefault } from "@/templates/types";

interface TemplateState {
  // Template activo para preview
  activeTemplate: TemplateConfig;
  
  // Colores custom (si el usuario los modifica)
  customColors: {
    light: Partial<ThemeColors>;
    dark: Partial<ThemeColors>;
  };
  
  // Estado de edición
  isEditing: boolean;
  editingMode: "light" | "dark";
  
  // Cambios sin guardar
  hasUnsavedChanges: boolean;
}

interface TemplateActions {
  // Seleccionar template
  selectTemplate: (templateId: string) => void;
  
  // Edición de colores
  startEditing: () => void;
  stopEditing: () => void;
  setEditingMode: (mode: "light" | "dark") => void;
  
  // Actualizar un color específico
  updateColor: (key: keyof ThemeColors, value: string) => void;
  
  // Aplicar preview al documento
  applyPreview: () => void;
  
  // Resetear a colores originales del template
  resetToOriginal: () => void;
  
  // Resetear todo al tema por defecto del sistema
  resetToSystemDefault: () => void;
  
  // Obtener colores actuales (template + custom)
  getCurrentColors: (mode: "light" | "dark") => ThemeColors;
}

type TemplateStore = TemplateState & TemplateActions;

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  activeTemplate: defaultTemplate,
  customColors: {
    light: {},
    dark: {},
  },
  isEditing: false,
  editingMode: "light",
  hasUnsavedChanges: false,

  selectTemplate: (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      set({
        activeTemplate: template,
        customColors: { light: {}, dark: {} },
        hasUnsavedChanges: false,
      });
    }
  },

  startEditing: () => {
    set({ isEditing: true });
  },

  stopEditing: () => {
    set({ isEditing: false });
  },

  setEditingMode: (mode: "light" | "dark") => {
    set({ editingMode: mode });
  },

  updateColor: (key: keyof ThemeColors, value: string) => {
    const { editingMode, customColors } = get();
    set({
      customColors: {
        ...customColors,
        [editingMode]: {
          ...customColors[editingMode],
          [key]: value,
        },
      },
      hasUnsavedChanges: true,
    });
  },

  applyPreview: () => {
    const { editingMode } = get();
    const colors = get().getCurrentColors(editingMode);
    applyThemeToDocument(colors);
  },

  resetToOriginal: () => {
    set({
      customColors: { light: {}, dark: {} },
      hasUnsavedChanges: false,
    });
    resetThemeToDefault();
  },

  resetToSystemDefault: () => {
    set({
      activeTemplate: defaultTemplate,
      customColors: { light: {}, dark: {} },
      hasUnsavedChanges: false,
      isEditing: false,
    });
    resetThemeToDefault();
  },

  getCurrentColors: (mode: "light" | "dark") => {
    const { activeTemplate, customColors } = get();
    return {
      ...activeTemplate.theme[mode],
      ...customColors[mode],
    };
  },
}));