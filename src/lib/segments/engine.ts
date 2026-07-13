// src/lib/segments/engine.ts
// Motor de traducción de reglas de segmento → query sobre `customers`.
// Decisión A del spec: la segmentación vive en TypeScript (no en SQL/SP).

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Customer,
  Database,
  SegmentCondition,
  SegmentRules,
} from "@/types";
import { getSegmentField } from "./fields";

type SB = SupabaseClient<Database>;

// biome-ignore lint/suspicious/noExplicitAny: el query builder de PostgREST no expone un tipo encadenable estable
type CustomerQuery = any;

export class SegmentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SegmentValidationError";
  }
}

/**
 * Valida que las reglas sólo usen campos/operadores del registro y que el
 * `value` tenga la forma esperada. Lanza SegmentValidationError si algo falla.
 */
export function validateRules(rules: unknown): SegmentRules {
  if (!rules || typeof rules !== "object") {
    throw new SegmentValidationError("Reglas inválidas");
  }
  const r = rules as Partial<SegmentRules>;
  const match = r.match === "any" ? "any" : "all";
  const conditions = Array.isArray(r.conditions) ? r.conditions : [];

  for (const cond of conditions) {
    const field = getSegmentField(cond?.field);
    if (!field) {
      throw new SegmentValidationError(`Campo no permitido: ${cond?.field}`);
    }
    if (!field.operators.includes(cond.operator)) {
      throw new SegmentValidationError(
        `Operador "${cond.operator}" no permitido para ${field.key}`,
      );
    }
    // Validación de shape del value
    if (cond.operator === "between") {
      if (!Array.isArray(cond.value) || cond.value.length !== 2) {
        throw new SegmentValidationError(
          `El operador "between" requiere [min, max] en ${field.key}`,
        );
      }
    } else if (
      cond.operator === "in" ||
      cond.operator === "not_in" ||
      cond.operator === "contains" ||
      cond.operator === "contains_any"
    ) {
      if (!Array.isArray(cond.value) || cond.value.length === 0) {
        throw new SegmentValidationError(
          `El operador "${cond.operator}" requiere una lista no vacía en ${field.key}`,
        );
      }
    } else if (
      cond.value === null ||
      cond.value === undefined ||
      Array.isArray(cond.value)
    ) {
      throw new SegmentValidationError(`Valor inválido para ${field.key}`);
    }

    // Los campos "special" no se soportan en modo OR (v1)
    if (match === "any" && field.translation === "special") {
      throw new SegmentValidationError(
        `El campo "${field.label}" no puede combinarse con OR en esta versión`,
      );
    }
  }

  return { match, conditions };
}

// ── Helpers de fechas para campos "special" ────────────────────────────

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

/** Fecha de nacimiento más reciente para tener al menos `age` años. */
function ageToLatestBirthDate(age: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  return d.toISOString().slice(0, 10);
}

/** Fecha de nacimiento más antigua para tener a lo sumo `age` años. */
function ageToEarliestBirthDate(age: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - (age + 1));
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// ── Aplicación de condiciones directas ─────────────────────────────────

function applyDirectCondition(
  query: CustomerQuery,
  column: string,
  cond: SegmentCondition,
): CustomerQuery {
  const { operator, value } = cond;
  switch (operator) {
    case "eq":
      return query.eq(column, value);
    case "ne":
      return query.neq(column, value);
    case "gte":
      return query.gte(column, value);
    case "lte":
      return query.lte(column, value);
    case "in":
      return query.in(column, value as (string | number)[]);
    case "not_in":
      return query.not(
        column,
        "in",
        `(${(value as (string | number)[]).join(",")})`,
      );
    case "contains":
      return query.contains(column, value as (string | number)[]);
    case "contains_any":
      return query.overlaps(column, value as (string | number)[]);
    case "between": {
      const [min, max] = value as [number, number];
      return query.gte(column, min).lte(column, max);
    }
    default:
      return query;
  }
}

/** Traduce una condición directa a un fragmento del or-string de PostgREST. */
function conditionToOrFragment(column: string, cond: SegmentCondition): string {
  const { operator, value } = cond;
  switch (operator) {
    case "eq":
      return `${column}.eq.${value}`;
    case "ne":
      return `${column}.neq.${value}`;
    case "gte":
      return `${column}.gte.${value}`;
    case "lte":
      return `${column}.lte.${value}`;
    case "in":
      return `${column}.in.(${(value as (string | number)[]).join(",")})`;
    case "contains":
      return `${column}.cs.{${(value as (string | number)[]).join(",")}}`;
    case "contains_any":
      return `${column}.ov.{${(value as (string | number)[]).join(",")}}`;
    default:
      throw new SegmentValidationError(
        `Operador "${operator}" no soportado en modo OR`,
      );
  }
}

/**
 * Pre-consulta: customer_ids que tienen (o no) una cita con alguno de los
 * servicios indicados.
 */
async function customerIdsWithService(
  supabase: SB,
  tenantId: string,
  serviceIds: string[],
): Promise<string[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select("customer_id")
    .eq("tenant_id", tenantId)
    .in("service_id", serviceIds);
  if (error) throw error;
  const ids = new Set<string>();
  for (const row of data ?? []) {
    if (row.customer_id) ids.add(row.customer_id);
  }
  return [...ids];
}

interface ResolveOptions {
  /** Columnas a seleccionar. Por defecto "*". */
  columns?: string;
}

/**
 * Resuelve un segmento y devuelve los clientes que cumplen las reglas.
 * Aplica todo lo posible en la base de datos; sólo `birthday_month` se
 * post-filtra en JS (dataset pequeño, ver §1.4 del spec).
 */
export async function resolveSegmentCustomers(
  supabase: SB,
  tenantId: string,
  rawRules: unknown,
  opts: ResolveOptions = {},
): Promise<Customer[]> {
  const rules = validateRules(rawRules);
  const columns = opts.columns ?? "*";

  let query: CustomerQuery = supabase
    .from("customers")
    .select(columns)
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  // Post-filtros que no se pueden expresar en la query
  let birthdayMonth: number | null = null;

  if (rules.match === "any") {
    // Modo OR: sólo campos directos (validado). Construimos el or-string.
    const fragments: string[] = [];
    for (const cond of rules.conditions) {
      const field = getSegmentField(cond.field);
      if (!field?.column) continue;
      fragments.push(conditionToOrFragment(field.column, cond));
    }
    if (fragments.length > 0) {
      query = query.or(fragments.join(","));
    }
  } else {
    // Modo AND: encadenamos condición por condición.
    for (const cond of rules.conditions) {
      const field = getSegmentField(cond.field);
      if (!field) continue;

      if (field.translation === "direct" && field.column) {
        query = applyDirectCondition(query, field.column, cond);
        continue;
      }

      // Campos special
      switch (field.key) {
        case "days_since_last_visit": {
          const cutoff = daysAgoISO(Number(cond.value));
          query = query.not("last_visit_at", "is", null);
          // gte N días sin visitar → last_visit_at <= cutoff
          // lte N días sin visitar → last_visit_at >= cutoff
          query =
            cond.operator === "gte"
              ? query.lte("last_visit_at", cutoff)
              : query.gte("last_visit_at", cutoff);
          break;
        }
        case "age": {
          query = query.not("birth_date", "is", null);
          if (cond.operator === "between") {
            const [min, max] = cond.value as [number, number];
            query = query
              .lte("birth_date", ageToLatestBirthDate(min))
              .gte("birth_date", ageToEarliestBirthDate(max));
          } else if (cond.operator === "gte") {
            query = query.lte(
              "birth_date",
              ageToLatestBirthDate(Number(cond.value)),
            );
          } else if (cond.operator === "lte") {
            query = query.gte(
              "birth_date",
              ageToEarliestBirthDate(Number(cond.value)),
            );
          }
          break;
        }
        case "birthday_month": {
          query = query.not("birth_date", "is", null);
          birthdayMonth = Number(cond.value);
          break;
        }
        case "service_consumed": {
          const ids = await customerIdsWithService(
            supabase,
            tenantId,
            cond.value as string[],
          );
          if (cond.operator === "in") {
            if (ids.length === 0) return []; // nadie califica
            query = query.in("id", ids);
          } else if (cond.operator === "not_in") {
            if (ids.length > 0) {
              query = query.not("id", "in", `(${ids.join(",")})`);
            }
          }
          break;
        }
        default:
          break;
      }
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  let customers = (data ?? []) as unknown as Customer[];

  if (birthdayMonth !== null) {
    customers = customers.filter((c) => {
      if (!c.birth_date) return false;
      // birth_date es "YYYY-MM-DD": el mes es el segundo componente.
      const month = Number(c.birth_date.slice(5, 7));
      return month === birthdayMonth;
    });
  }

  return customers;
}

/**
 * Preview de un segmento: conteo real + muestra (~10 clientes).
 */
export async function previewSegment(
  supabase: SB,
  tenantId: string,
  rawRules: unknown,
): Promise<{ count: number; sample: Customer[] }> {
  const customers = await resolveSegmentCustomers(supabase, tenantId, rawRules);
  return { count: customers.length, sample: customers.slice(0, 10) };
}
