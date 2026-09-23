// src/app/api/sentry-odoo/route.ts
// Traductor Sentry -> Odoo Helpdesk. Ver docs/integracion-sentry-odoo.md.
//
// Recibe el webhook de las reglas de alerta "Ticket a Odoo" y:
//   - si el issue no tiene ticket vigente -> crea uno en Customer Care
//   - si ya lo tiene y sigue abierto      -> agrega una nota interna
//   - si el ticket vinculado ya se cerro  -> reincidencia: ticket nuevo que
//                                            referencia al anterior
// El criterio de QUE error llega aca vive en las reglas de Sentry (produccion,
// error o superior, 3+ usuarios o 2 h, nuevo o regresion). Aca solo se repiten
// los filtros baratos como defensa y se aplica el tope diario.
//
// Env vars (Vercel, scope Production):
//   SENTRY_ODOO_TOKEN          secreto compartido; va en ?token= de la URL
//   SENTRY_ODOO_CLIENT_SECRET  (opcional) Client Secret de la integracion
//                              interna, para validar Sentry-Hook-Signature
//   ODOO_URL, ODOO_DB, ODOO_USER, ODOO_API_KEY  (ver src/lib/odoo/client.ts)

import {
  type Alerta,
  firmaSentryValida,
  normalizarAlerta,
  secretosIguales,
} from "@/lib/monitoring/sentry-webhook";
import {
  agregarNotaInterna,
  buscarOCrear,
  crearTicket,
  etapaTicket,
  odooConfig,
} from "@/lib/odoo/client";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Configuracion de la mesa en teams4soft.odoo.com (sondas del 01 y 23-09-2026).
const EQUIPO_CUSTOMER_CARE = 1;
const ETAPA_NEW = 1;
// Solucionado, Cerrado, Cancelado: si el error vuelve, es reincidencia.
const ETAPAS_CERRADAS = new Set([7, 5, 10]);
const ETIQUETA = "Monitoreo";
// Sin email a proposito: la plantilla "Ticket Received" de la etapa New no
// tiene a quien mandar el acuse.
const SOLICITANTE = "Monitoreo automático";
// Tope de tickets nuevos en 24 h. Lo que exceda sigue avisando por Google Chat.
const TOPE_DIARIO = 10;

// Ids resueltos en Odoo, cacheados por instancia.
let etiquetaId: number | null = null;
let solicitanteId: number | null = null;

function escaparHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Error -> Baja (24 h de SLA); fatal -> Alta (6 h). */
function prioridad(a: Alerta): "0" | "2" {
  return a.nivel === "FATAL" ? "2" : "0";
}

function fila(etiqueta: string, valor: string): string {
  return valor ? `<li><b>${etiqueta}:</b> ${escaparHtml(valor)}</li>` : "";
}

function descripcion(a: Alerta, ticketAnterior: number | null): string {
  const enlace = a.url
    ? `<li><b>Detalle:</b> <a href="${escaparHtml(a.url)}">abrir en Sentry</a></li>`
    : "";
  const reincidencia = ticketAnterior
    ? `<p><b>🔁 Reincidencia:</b> este error ya tuvo el ticket #${ticketAnterior}, que se había cerrado.</p>`
    : "";
  return `${reincidencia}<ul>
${fila("Error", a.titulo)}
${fila("Origen", a.culprit)}
${fila("Nivel", a.nivel)}
${fila("Módulo", a.modulo)}
${fila("Proyecto", a.proyecto)}
${fila("Entorno", a.entorno)}
${fila("Release", a.release)}
${fila("Evento", a.fecha)}
${fila("Regla de Sentry", a.regla)}
${enlace}
</ul>
<p><i>Ticket generado automáticamente desde Sentry. Si el error se repite, se agrega como nota en este ticket.</i></p>`;
}

function notaRepeticion(a: Alerta, alertas: number): string {
  return `<p><b>🔁 El error volvió a dispararse</b> (alerta ${alertas})</p><ul>
${fila("Regla de Sentry", a.regla)}
${fila("Evento", a.fecha)}
${fila("Release", a.release)}
</ul>`;
}

/** Prueba de vida: abrir en el navegador debe devolver {"ok":true,...}. */
export async function GET() {
  return Response.json({
    ok: true,
    servicio: "traductor-sentry-odoo",
    configurado: Boolean(process.env.SENTRY_ODOO_TOKEN && odooConfig()),
  });
}

export async function POST(request: Request) {
  // Igual que /api/sentry-chat: nunca 5xx (Sentry marcaria la entrega fallida y
  // un error capturado aca realimentaria alerta -> webhook -> alerta). Siempre
  // 200; el resultado real queda en los logs de Vercel.
  try {
    const url = new URL(request.url);
    const expected = process.env.SENTRY_ODOO_TOKEN;
    const cfg = odooConfig();

    if (!expected || !cfg) {
      console.error("[sentry-odoo] falta configuracion (token u ODOO_*)");
      return Response.json({ ok: false, error: "no configurado" });
    }
    if (!secretosIguales(expected, url.searchParams.get("token") ?? "")) {
      console.warn("[sentry-odoo] token invalido o ausente");
      return Response.json({ ok: false, error: "no autorizado" });
    }

    const rawBody = await request.text();
    if (
      !firmaSentryValida(
        rawBody,
        request.headers,
        process.env.SENTRY_ODOO_CLIENT_SECRET,
      )
    ) {
      console.warn("[sentry-odoo] firma invalida");
      return Response.json({ ok: false, error: "firma invalida" });
    }

    const alerta = normalizarAlerta(JSON.parse(rawBody));

    // Defensa: la regla de Sentry ya filtra esto.
    if (!alerta.issueId) {
      return Response.json({ ok: false, error: "sin issue" });
    }
    if (!alerta.entorno.includes("production")) {
      console.log("[sentry-odoo] ignorado: entorno", alerta.entorno || "vacio");
      return Response.json({ ok: true, accion: "ignorado", motivo: "entorno" });
    }
    if (alerta.nivel !== "ERROR" && alerta.nivel !== "FATAL") {
      console.log("[sentry-odoo] ignorado: nivel", alerta.nivel);
      return Response.json({ ok: true, accion: "ignorado", motivo: "nivel" });
    }

    // Ticket vigente del issue (el mas reciente).
    const { data: vinculo, error: errLectura } = await supabaseAdmin
      .from("sentry_odoo_tickets")
      .select("id, odoo_ticket_id, alertas")
      .eq("sentry_issue_id", alerta.issueId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (errLectura) throw errLectura;

    let ticketAnterior: number | null = null;
    if (vinculo) {
      const etapa = await etapaTicket(cfg, vinculo.odoo_ticket_id);
      if (etapa && !ETAPAS_CERRADAS.has(etapa.id)) {
        const alertas = vinculo.alertas + 1;
        await agregarNotaInterna(
          cfg,
          vinculo.odoo_ticket_id,
          notaRepeticion(alerta, alertas),
        );
        await supabaseAdmin
          .from("sentry_odoo_tickets")
          .update({ alertas, last_alert_at: new Date().toISOString() })
          .eq("id", vinculo.id);
        console.log("[sentry-odoo] nota agregada", {
          issueId: alerta.issueId,
          ticket: vinculo.odoo_ticket_id,
          alertas,
        });
        return Response.json({
          ok: true,
          accion: "nota",
          ticket: vinculo.odoo_ticket_id,
        });
      }
      // Cerrado, cancelado o borrado: reincidencia.
      ticketAnterior = vinculo.odoo_ticket_id;
    }

    // Tope diario (ventana movil de 24 h).
    const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: errConteo } = await supabaseAdmin
      .from("sentry_odoo_tickets")
      .select("id", { count: "exact", head: true })
      .gte("created_at", desde);
    if (errConteo) throw errConteo;
    if ((count ?? 0) >= TOPE_DIARIO) {
      console.warn("[sentry-odoo] tope diario alcanzado, sin ticket", {
        issueId: alerta.issueId,
        titulo: alerta.titulo,
      });
      return Response.json({ ok: true, accion: "tope" });
    }

    etiquetaId ??= await buscarOCrear(cfg, "helpdesk.tag", ETIQUETA);
    solicitanteId ??= await buscarOCrear(cfg, "res.partner", SOLICITANTE, {
      is_company: false,
      comment: "Contacto de sistema para los tickets automáticos de Sentry.",
    });

    const ticketId = await crearTicket(cfg, {
      name: `[Monitoreo] ${alerta.titulo}`.slice(0, 200),
      description: descripcion(alerta, ticketAnterior),
      team_id: EQUIPO_CUSTOMER_CARE,
      stage_id: ETAPA_NEW,
      priority: prioridad(alerta),
      partner_id: solicitanteId,
      tag_ids: [etiquetaId],
    });

    const { error: errInsert } = await supabaseAdmin
      .from("sentry_odoo_tickets")
      .insert({
        sentry_issue_id: alerta.issueId,
        sentry_project: alerta.proyecto,
        odoo_ticket_id: ticketId,
        titulo: alerta.titulo.slice(0, 500),
        ticket_anterior: ticketAnterior,
      });
    if (errInsert) {
      // El ticket existe en Odoo pero sin vinculo: la proxima alerta crearia
      // otro. Queda en logs para corregirlo a mano.
      console.error("[sentry-odoo] ticket creado SIN vinculo", {
        ticketId,
        issueId: alerta.issueId,
        error: errInsert.message,
      });
    }

    console.log("[sentry-odoo] ticket creado", {
      issueId: alerta.issueId,
      ticket: ticketId,
      reincidencia: ticketAnterior,
    });
    return Response.json({ ok: true, accion: "ticket", ticket: ticketId });
  } catch (error) {
    console.error("[sentry-odoo] fallo", error);
    return Response.json({ ok: false, error: String(error) });
  }
}
