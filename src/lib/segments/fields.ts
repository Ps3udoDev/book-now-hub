// src/lib/segments/fields.ts
// Registro (whitelist) de campos segmentables. El motor sólo acepta campos y
// operadores declarados aquí; cualquier condición fuera de este registro se
// rechaza antes de tocar la base de datos.

import type { SegmentOperator } from "@/types";

export type FieldType =
  | "text"
  | "number"
  | "date"
  | "enum"
  | "boolean"
  | "array"
  | "special";

/**
 * Cómo se traduce el campo a la query:
 * - "direct":  se mapea a una columna de `customers` con operadores PostgREST.
 * - "special": requiere pre-cálculo en JS (fechas, edad, pre-consulta de citas).
 */
export type FieldTranslation = "direct" | "special";

export interface SegmentFieldDef {
  key: string;
  label: string;
  type: FieldType;
  operators: SegmentOperator[];
  translation: FieldTranslation;
  /** Columna real en `customers` cuando translation === "direct". */
  column?: string;
  /** Opciones para campos enum (se usan en el rule builder). */
  options?: { value: string; label: string }[];
  /** Ayuda breve mostrada en la UI. */
  hint?: string;
}

export const SEGMENT_FIELDS: SegmentFieldDef[] = [
  {
    key: "city",
    label: "Ciudad",
    type: "text",
    operators: ["eq", "ne", "in"],
    translation: "direct",
    column: "city",
  },
  {
    key: "total_spent",
    label: "Total gastado",
    type: "number",
    operators: ["gte", "lte", "between"],
    translation: "direct",
    column: "total_spent",
  },
  {
    key: "total_visits",
    label: "Total de visitas",
    type: "number",
    operators: ["gte", "lte", "eq"],
    translation: "direct",
    column: "total_visits",
  },
  {
    key: "loyalty_points",
    label: "Puntos de fidelidad",
    type: "number",
    operators: ["gte", "lte"],
    translation: "direct",
    column: "loyalty_points",
  },
  {
    key: "gender",
    label: "Género",
    type: "enum",
    operators: ["eq", "in"],
    translation: "direct",
    column: "gender",
    options: [
      { value: "male", label: "Masculino" },
      { value: "female", label: "Femenino" },
      { value: "other", label: "Otro" },
    ],
  },
  {
    key: "how_found_us",
    label: "Cómo nos conoció",
    type: "text",
    operators: ["eq", "in"],
    translation: "direct",
    column: "how_found_us",
    hint: "Ej: referido, redes, google",
  },
  {
    key: "tags",
    label: "Etiquetas",
    type: "array",
    operators: ["contains", "contains_any"],
    translation: "direct",
    column: "tags",
    hint: "contains = tiene todas; contains_any = tiene alguna",
  },
  {
    key: "accepts_marketing",
    label: "Acepta marketing",
    type: "boolean",
    operators: ["eq"],
    translation: "direct",
    column: "accepts_marketing",
  },
  {
    key: "days_since_last_visit",
    label: "Días desde última visita",
    type: "special",
    operators: ["gte", "lte"],
    translation: "special",
    hint: "gte 90 = no viene hace 90+ días",
  },
  {
    key: "age",
    label: "Edad",
    type: "special",
    operators: ["gte", "lte", "between"],
    translation: "special",
  },
  {
    key: "birthday_month",
    label: "Mes de cumpleaños",
    type: "special",
    operators: ["eq"],
    translation: "special",
    options: [
      { value: "1", label: "Enero" },
      { value: "2", label: "Febrero" },
      { value: "3", label: "Marzo" },
      { value: "4", label: "Abril" },
      { value: "5", label: "Mayo" },
      { value: "6", label: "Junio" },
      { value: "7", label: "Julio" },
      { value: "8", label: "Agosto" },
      { value: "9", label: "Septiembre" },
      { value: "10", label: "Octubre" },
      { value: "11", label: "Noviembre" },
      { value: "12", label: "Diciembre" },
    ],
  },
  {
    key: "service_consumed",
    label: "Servicio consumido",
    type: "special",
    operators: ["in", "not_in"],
    translation: "special",
    hint: "Clientes con (o sin) cita de ese servicio",
  },
];

/** Etiquetas legibles de cada operador (para la UI). */
export const OPERATOR_LABELS: Record<SegmentOperator, string> = {
  eq: "es igual a",
  ne: "es distinto de",
  gte: "mayor o igual a",
  lte: "menor o igual a",
  in: "está en",
  not_in: "no está en",
  contains: "contiene todas",
  contains_any: "contiene alguna",
  between: "entre",
};

const FIELD_MAP = new Map(SEGMENT_FIELDS.map((f) => [f.key, f]));

export function getSegmentField(key: string): SegmentFieldDef | undefined {
  return FIELD_MAP.get(key);
}
