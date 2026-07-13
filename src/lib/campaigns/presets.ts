// src/lib/campaigns/presets.ts
// Presets de campaña: pre-cargan reglas de segmento + plantilla de mensaje
// según el tipo. Cubren los 3 pilares del análisis + cumpleaños.

import type { CampaignType, SegmentRules } from "@/types";

export interface CampaignPreset {
  type: CampaignType;
  name: string;
  description: string;
  defaultRules: SegmentRules;
  defaultMessage: string;
}

/** Mes actual (1-12) para el preset de cumpleaños. */
function currentMonth(): number {
  return new Date().getMonth() + 1;
}

export function getPresets(): CampaignPreset[] {
  return [
    {
      type: "reactivation",
      name: "Reactivación",
      description: "Clientes que no vienen hace 90+ días.",
      defaultRules: {
        match: "all",
        conditions: [
          { field: "days_since_last_visit", operator: "gte", value: 90 },
        ],
      },
      defaultMessage:
        "Hola {{first_name}} 👋 ¡Te extrañamos! Vuelve y disfruta un beneficio especial en tu próxima visita.",
    },
    {
      type: "last_minute",
      name: "Última hora",
      description:
        "Clientes con visita reciente y que aceptan marketing, para rellenar huecos.",
      defaultRules: {
        match: "all",
        conditions: [
          { field: "accepts_marketing", operator: "eq", value: true },
          { field: "days_since_last_visit", operator: "lte", value: 30 },
        ],
      },
      defaultMessage:
        "Hola {{first_name}} 🎉 ¡Tenemos un cupo disponible hoy! Reserva ahora y aprovéchalo.",
    },
    {
      type: "transformation",
      name: "Transformación",
      description:
        "Clientes con pocas visitas, para convertirlos en recurrentes.",
      defaultRules: {
        match: "all",
        conditions: [{ field: "total_visits", operator: "lte", value: 1 }],
      },
      defaultMessage:
        "Hola {{first_name}} ✨ Queremos que vuelvas a vernos. Te preparamos una experiencia pensada para ti.",
    },
    {
      type: "birthday",
      name: "Cumpleaños",
      description: "Clientes que cumplen años este mes.",
      defaultRules: {
        match: "all",
        conditions: [
          { field: "birthday_month", operator: "eq", value: currentMonth() },
        ],
      },
      defaultMessage:
        "¡Feliz cumpleaños {{first_name}}! 🎂 Celébralo con nosotros: te espera un regalo especial este mes.",
    },
    {
      type: "custom",
      name: "Personalizada",
      description: "Define tus propias reglas de segmento y mensaje.",
      defaultRules: { match: "all", conditions: [] },
      defaultMessage: "Hola {{first_name}}, ",
    },
  ];
}

export function getPreset(type: CampaignType): CampaignPreset {
  const preset = getPresets().find((p) => p.type === type);
  // custom siempre existe como fallback
  return preset ?? getPresets()[getPresets().length - 1];
}
