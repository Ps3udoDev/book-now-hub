// src/templates/index.ts
import { defaultTemplate } from "./default";
import { oceanBlueTemplate } from "./ocean-blue";
import type { TemplateConfig } from "./types";

// Exportar todos los templates
export const templates: TemplateConfig[] = [
  defaultTemplate,
  oceanBlueTemplate,
];

// Exportar templates individuales
export { defaultTemplate, oceanBlueTemplate };

// Exportar tipos
export * from "./types";

// Helper para obtener un template por slug
export function getTemplateBySlug(slug: string): TemplateConfig | undefined {
  return templates.find((t) => t.slug === slug);
}

// Helper para obtener un template por id
export function getTemplateById(id: string): TemplateConfig | undefined {
  return templates.find((t) => t.id === id);
}