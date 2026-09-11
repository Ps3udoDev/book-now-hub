import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getBusinessSnapshotCapability } from "@/lib/capabilities/analytics";
import {
  getScheduleSummaryCapability,
  listAppointmentsCapability,
  listAvailableSlotsCapability,
} from "@/lib/capabilities/appointments";
import { searchCustomersCapability } from "@/lib/capabilities/customers";
import {
  confirmAppointmentDraftCapability,
  createAppointmentDraftCapability,
} from "@/lib/capabilities/drafts";
import { logToolCall } from "./audit";
import type { McpRequestContext } from "./types";

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Valida si el contexto cuenta con el scope requerido.
 * Si el token solo incluye scopes estándar de OIDC (openid, profile), se autoriza
 * por rol de tenant. Si incluye scopes de dominio con dos puntos, se exige el scope exacto.
 */
function checkScope(ctx: McpRequestContext, requiredScope: string): void {
  const hasDomainScopes = Array.from(ctx.scopes).some((s) => s.includes(":"));
  if (hasDomainScopes && !ctx.scopes.has(requiredScope)) {
    throw new Error(
      `Permiso denegado: esta herramienta requiere el scope '${requiredScope}'.`,
    );
  }
}

/**
 * Crea y configura una instancia de McpServer vinculada a un request autenticado.
 */
export function createBookNowMcpServer(ctx: McpRequestContext): McpServer {
  const server = new McpServer({
    name: "BookNow Business MCP",
    version: "1.0.0",
  });

  // 1. get_business_snapshot
  server.tool(
    "get_business_snapshot",
    "Obtiene métricas y KPIs agregados del negocio (citas hoy, citas por estado, especialistas, servicios más solicitados) sin exponer PII.",
    {},
    async () => {
      const start = Date.now();
      try {
        checkScope(ctx, "analytics:read");
        const data = await getBusinessSnapshotCapability(ctx);
        await logToolCall({
          context: ctx,
          toolName: "get_business_snapshot",
          riskLevel: "read",
          status: "succeeded",
          durationMs: Date.now() - start,
        });

        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      } catch (err: unknown) {
        const errorMsg = getErrorMessage(err);
        await logToolCall({
          context: ctx,
          toolName: "get_business_snapshot",
          riskLevel: "read",
          status: "failed",
          errorCode: errorMsg,
          durationMs: Date.now() - start,
        });
        return {
          isError: true,
          content: [{ type: "text", text: `Error: ${errorMsg}` }],
        };
      }
    },
  );

  // 2. get_schedule_summary
  server.tool(
    "get_schedule_summary",
    "Obtiene resumen de ocupación y citas por fecha y especialista en un rango de fechas (máximo 31 días).",
    {
      startDate: z.string().describe("Fecha inicial en formato YYYY-MM-DD"),
      endDate: z.string().describe("Fecha final en formato YYYY-MM-DD"),
      branchId: z.string().optional().describe("ID de sucursal opcional"),
      specialistId: z
        .string()
        .optional()
        .describe("ID de especialista opcional"),
    },
    async (args) => {
      const start = Date.now();
      try {
        checkScope(ctx, "appointments:read");
        const data = await getScheduleSummaryCapability(ctx, args);
        await logToolCall({
          context: ctx,
          toolName: "get_schedule_summary",
          riskLevel: "read",
          status: "succeeded",
          args,
          durationMs: Date.now() - start,
        });

        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      } catch (err: unknown) {
        const errorMsg = getErrorMessage(err);
        await logToolCall({
          context: ctx,
          toolName: "get_schedule_summary",
          riskLevel: "read",
          status: "failed",
          args,
          errorCode: errorMsg,
          durationMs: Date.now() - start,
        });
        return {
          isError: true,
          content: [{ type: "text", text: `Error: ${errorMsg}` }],
        };
      }
    },
  );

  // 3. list_available_slots
  server.tool(
    "list_available_slots",
    "Calcula los horarios (slots) disponibles para reservar un servicio en una fecha determinada.",
    {
      serviceId: z.string().describe("ID del servicio a agendar"),
      branchId: z.string().describe("ID de la sucursal"),
      date: z.string().describe("Fecha en formato YYYY-MM-DD"),
      specialistId: z
        .string()
        .optional()
        .describe("ID del especialista opcional"),
    },
    async (args) => {
      const start = Date.now();
      try {
        checkScope(ctx, "appointments:read");
        const data = await listAvailableSlotsCapability(ctx, args);
        await logToolCall({
          context: ctx,
          toolName: "list_available_slots",
          riskLevel: "read",
          status: "succeeded",
          args,
          durationMs: Date.now() - start,
        });

        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      } catch (err: unknown) {
        const errorMsg = getErrorMessage(err);
        await logToolCall({
          context: ctx,
          toolName: "list_available_slots",
          riskLevel: "read",
          status: "failed",
          args,
          errorCode: errorMsg,
          durationMs: Date.now() - start,
        });
        return {
          isError: true,
          content: [{ type: "text", text: `Error: ${errorMsg}` }],
        };
      }
    },
  );

  // 4. list_appointments
  server.tool(
    "list_appointments",
    "Lista citas agendadas dentro de un rango de fechas con paginación y datos de cliente (teléfono enmascarado).",
    {
      startDate: z
        .string()
        .describe("Fecha inicial en formato ISO o YYYY-MM-DD"),
      endDate: z.string().describe("Fecha final en formato ISO o YYYY-MM-DD"),
      status: z
        .string()
        .optional()
        .describe(
          "Filtrar por estado: pending, confirmed, completed, cancelled",
        ),
      page: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Número de página (default: 1)"),
      limit: z
        .number()
        .int()
        .positive()
        .max(100)
        .optional()
        .describe("Límite de resultados (máximo 100)"),
    },
    async (args) => {
      const start = Date.now();
      try {
        checkScope(ctx, "appointments:read");
        const data = await listAppointmentsCapability(ctx, args);
        await logToolCall({
          context: ctx,
          toolName: "list_appointments",
          riskLevel: "read",
          status: "succeeded",
          args,
          durationMs: Date.now() - start,
        });

        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      } catch (err: unknown) {
        const errorMsg = getErrorMessage(err);
        await logToolCall({
          context: ctx,
          toolName: "list_appointments",
          riskLevel: "read",
          status: "failed",
          args,
          errorCode: errorMsg,
          durationMs: Date.now() - start,
        });
        return {
          isError: true,
          content: [{ type: "text", text: `Error: ${errorMsg}` }],
        };
      }
    },
  );

  // 5. search_customers
  server.tool(
    "search_customers",
    "Busca clientes por nombre, apellido o teléfono (mínimo 3 caracteres). Devuelve teléfonos enmascarados para proteger privacidad.",
    {
      query: z
        .string()
        .min(3)
        .describe("Término de búsqueda (mínimo 3 caracteres)"),
      limit: z
        .number()
        .int()
        .positive()
        .max(100)
        .optional()
        .describe("Límite de resultados (máximo 100)"),
    },
    async (args) => {
      const start = Date.now();
      try {
        checkScope(ctx, "customers:read");
        const data = await searchCustomersCapability(ctx, args);
        await logToolCall({
          context: ctx,
          toolName: "search_customers",
          riskLevel: "read",
          status: "succeeded",
          args,
          durationMs: Date.now() - start,
        });

        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      } catch (err: unknown) {
        const errorMsg = getErrorMessage(err);
        await logToolCall({
          context: ctx,
          toolName: "search_customers",
          riskLevel: "read",
          status: "failed",
          args,
          errorCode: errorMsg,
          durationMs: Date.now() - start,
        });
        return {
          isError: true,
          content: [{ type: "text", text: `Error: ${errorMsg}` }],
        };
      }
    },
  );

  // 6. create_appointment_draft
  server.tool(
    "create_appointment_draft",
    "Paso 1 para agendar: Valida y crea un borrador de cita con TTL de 10 minutos para aprobación humana. No bloquea el slot en la agenda.",
    {
      customer_id: z.string().describe("ID del cliente"),
      service_id: z.string().describe("ID del servicio"),
      service_variant_id: z
        .string()
        .optional()
        .nullable()
        .describe("ID de variante de servicio si aplica"),
      branch_id: z.string().describe("ID de la sucursal"),
      scheduled_at: z.string().describe("Fecha y hora en formato ISO 8601"),
      specialist_id: z
        .string()
        .optional()
        .nullable()
        .describe("ID de especialista si se desea asignar"),
      customer_notes: z
        .string()
        .optional()
        .nullable()
        .describe("Notas opcionales del cliente"),
      idempotency_key: z
        .string()
        .describe("Clave única de idempotencia generada por el cliente"),
    },
    async (args) => {
      const start = Date.now();
      try {
        checkScope(ctx, "appointments:write");
        const data = await createAppointmentDraftCapability(ctx, args);
        await logToolCall({
          context: ctx,
          toolName: "create_appointment_draft",
          riskLevel: "write",
          status: "succeeded",
          args,
          durationMs: Date.now() - start,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: "draft_created",
                  draft_id: data.draft.id,
                  expires_at: data.expires_at,
                  human_summary: data.summary,
                  instruction:
                    "Por favor solicita confirmación explícita al usuario con este resumen antes de invocar 'confirm_appointment_draft'.",
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err: unknown) {
        const errorMsg = getErrorMessage(err);
        await logToolCall({
          context: ctx,
          toolName: "create_appointment_draft",
          riskLevel: "write",
          status: "failed",
          args,
          errorCode: errorMsg,
          durationMs: Date.now() - start,
        });
        return {
          isError: true,
          content: [{ type: "text", text: `Error: ${errorMsg}` }],
        };
      }
    },
  );

  // 7. confirm_appointment_draft
  server.tool(
    "confirm_appointment_draft",
    "Paso 2 para agendar: Confirma atómicamente un borrador aprobado, valida disponibilidad definitiva y crea la cita oficial en estado 'pending'.",
    {
      draft_id: z
        .string()
        .describe("ID del borrador obtenido en create_appointment_draft"),
      idempotency_key: z
        .string()
        .describe("Clave única de idempotencia de la confirmación"),
    },
    async (args) => {
      const start = Date.now();
      try {
        checkScope(ctx, "appointments:write");
        const data = await confirmAppointmentDraftCapability(ctx, args);
        await logToolCall({
          context: ctx,
          toolName: "confirm_appointment_draft",
          riskLevel: "write",
          status: "succeeded",
          args,
          durationMs: Date.now() - start,
        });

        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      } catch (err: unknown) {
        const errorMsg = getErrorMessage(err);
        await logToolCall({
          context: ctx,
          toolName: "confirm_appointment_draft",
          riskLevel: "write",
          status: "failed",
          args,
          errorCode: errorMsg,
          durationMs: Date.now() - start,
        });
        return {
          isError: true,
          content: [{ type: "text", text: `Error: ${errorMsg}` }],
        };
      }
    },
  );

  return server;
}
