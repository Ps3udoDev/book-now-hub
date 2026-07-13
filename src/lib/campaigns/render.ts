// src/lib/campaigns/render.ts
// Renderiza plantillas de mensaje sustituyendo variables {{var}} con datos
// del cliente. Variable desconocida → se deja literal y se registra.

import type { Customer } from "@/types";

export interface RenderResult {
  message: string;
  /** Variables que no se pudieron resolver (quedaron literales). */
  unknownVars: string[];
}

/** Variables disponibles en las plantillas (para chips en la UI). */
export const TEMPLATE_VARIABLES: { key: string; label: string }[] = [
  { key: "first_name", label: "Nombre" },
  { key: "last_name", label: "Apellido" },
  { key: "full_name", label: "Nombre completo" },
  { key: "city", label: "Ciudad" },
];

function resolveVar(customer: Customer, key: string): string | null {
  switch (key) {
    case "first_name":
      return customer.first_name ?? "";
    case "last_name":
      return customer.last_name ?? "";
    case "full_name":
      return (
        customer.full_name ||
        `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim()
      );
    case "city":
      return customer.city ?? "";
    default:
      return null;
  }
}

export function renderMessage(
  template: string,
  customer: Customer,
): RenderResult {
  const unknownVars: string[] = [];
  const message = template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, rawKey) => {
    const key = String(rawKey);
    const value = resolveVar(customer, key);
    if (value === null) {
      if (!unknownVars.includes(key)) unknownVars.push(key);
      return match; // se deja literal
    }
    return value;
  });
  return { message, unknownVars };
}
