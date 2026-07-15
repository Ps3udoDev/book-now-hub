// src/lib/ai/campaign-suggester.ts
// Genera propuestas de campaña con Claude vía AI Gateway a partir del snapshot.
import { generateObject } from "ai";
import { z } from "zod";
import type { AiProposal, TenantSnapshot } from "@/types";

// Modelo confirmado vía https://ai-gateway.vercel.sh/v1/models (Sonnet más nuevo disponible).
const MODEL = "anthropic/claude-sonnet-5";

// Esquema de una condición de segmento (refleja SegmentCondition).
const conditionSchema = z.object({
  field: z.string(),
  operator: z.enum([
    "eq",
    "ne",
    "gte",
    "lte",
    "in",
    "not_in",
    "contains",
    "contains_any",
    "between",
  ]),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.union([z.string(), z.number()])),
  ]),
});

const proposalSchema = z.object({
  proposals: z
    .array(
      z.object({
        title: z.string(),
        rationale: z.string(),
        campaign_type: z.enum([
          "reactivation",
          "last_minute",
          "transformation",
          "birthday",
          "custom",
        ]),
        channel: z.enum(["whatsapp", "email", "sms"]),
        rules: z.object({
          match: z.enum(["all", "any"]),
          conditions: z.array(conditionSchema),
        }),
        message_template: z.string(),
      }),
    )
    .max(4),
});

export async function suggestCampaigns(
  snapshot: TenantSnapshot,
): Promise<AiProposal[]> {
  const instructions = [
    "Eres un experto en marketing para clínicas de belleza y estética.",
    "Propones campañas segmentadas ACCIONABLES a partir de datos agregados.",
    "Reglas duras:",
    "- Usa SOLO los campos y operadores de la lista `segmentFields`. No inventes campos.",
    "- Cada propuesta debe apuntar a un segmento que exista en los datos (usa los conteos del snapshot).",
    "- El mensaje va en español, cálido, con el placeholder {{first_name}}, listo para WhatsApp.",
    "- Devuelve entre 2 y 4 propuestas, priorizando las de mayor impacto.",
  ].join("\n");

  const { object } = await generateObject({
    model: MODEL,
    schema: proposalSchema,
    instructions,
    prompt: `Datos del negocio (agregados, sin datos personales):\n${JSON.stringify(
      snapshot,
      null,
      2,
    )}`,
  });

  return object.proposals as AiProposal[];
}
