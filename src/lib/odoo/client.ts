// src/lib/odoo/client.ts
// Cliente minimo de la API externa de Odoo (JSON-RPC, /jsonrpc) para la mesa
// de atencion (Helpdesk). Solo server-side: usa la API key del usuario de la
// integracion. Verificado contra teams4soft.odoo.com (Odoo 19 Enterprise).
//
// Env vars:
//   ODOO_URL      https://teams4soft.odoo.com
//   ODOO_DB       teams4soft
//   ODOO_USER     login del usuario de la integracion
//   ODOO_API_KEY  API key de ese usuario (Preferencias -> Seguridad de la cuenta)

interface OdooConfig {
  url: string;
  db: string;
  user: string;
  key: string;
}

export class OdooError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OdooError";
  }
}

/** Devuelve la config o null si falta alguna variable. */
export function odooConfig(): OdooConfig | null {
  const { ODOO_URL, ODOO_DB, ODOO_USER, ODOO_API_KEY } = process.env;
  if (!ODOO_URL || !ODOO_DB || !ODOO_USER || !ODOO_API_KEY) return null;
  return {
    url: ODOO_URL.replace(/\/+$/, ""),
    db: ODOO_DB,
    user: ODOO_USER,
    key: ODOO_API_KEY,
  };
}

// Cache del uid entre invocaciones de la misma instancia (Fluid Compute).
let uidCache: number | null = null;

async function rpc(
  cfg: OdooConfig,
  service: string,
  method: string,
  args: unknown[],
): Promise<unknown> {
  const res = await fetch(`${cfg.url}/jsonrpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: { service, method, args },
      id: Date.now(),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new OdooError(`HTTP ${res.status} en /jsonrpc`);

  const json = (await res.json()) as {
    result?: unknown;
    error?: { message?: string; data?: { name?: string; message?: string } };
  };
  if (json.error) {
    const d = json.error.data ?? {};
    throw new OdooError(
      `${d.name ?? json.error.message ?? "error"}: ${d.message ?? ""}`.trim(),
    );
  }
  return json.result;
}

async function uid(cfg: OdooConfig): Promise<number> {
  if (uidCache) return uidCache;
  const r = await rpc(cfg, "common", "authenticate", [
    cfg.db,
    cfg.user,
    cfg.key,
    {},
  ]);
  if (typeof r !== "number" || !r) {
    throw new OdooError(
      "autenticacion fallida (revisar ODOO_USER / ODOO_API_KEY)",
    );
  }
  uidCache = r;
  return r;
}

/** `execute_kw` autenticado sobre un modelo. */
export async function odooCall<T = unknown>(
  cfg: OdooConfig,
  model: string,
  method: string,
  args: unknown[] = [],
  kwargs: Record<string, unknown> = {},
): Promise<T> {
  const u = await uid(cfg);
  return (await rpc(cfg, "object", "execute_kw", [
    cfg.db,
    u,
    cfg.key,
    model,
    method,
    args,
    kwargs,
  ])) as T;
}

/** Busca un registro por nombre exacto; si no existe, lo crea. Devuelve el id. */
export async function buscarOCrear(
  cfg: OdooConfig,
  model: string,
  nombre: string,
  extra: Record<string, unknown> = {},
): Promise<number> {
  const ids = await odooCall<number[]>(
    cfg,
    model,
    "search",
    [[["name", "=", nombre]]],
    { limit: 1 },
  );
  if (ids.length) return ids[0];
  return odooCall<number>(cfg, model, "create", [{ name: nombre, ...extra }]);
}

export interface NuevoTicket {
  name: string;
  /** HTML */
  description: string;
  team_id: number;
  stage_id: number;
  /** "0" baja · "1" media · "2" alta · "3" urgente */
  priority: "0" | "1" | "2" | "3";
  partner_id?: number;
  tag_ids?: number[];
}

export async function crearTicket(
  cfg: OdooConfig,
  t: NuevoTicket,
): Promise<number> {
  const { tag_ids, ...resto } = t;
  return odooCall<number>(cfg, "helpdesk.ticket", "create", [
    { ...resto, ...(tag_ids?.length ? { tag_ids: [[6, 0, tag_ids]] } : {}) },
  ]);
}

/**
 * Etapa actual del ticket. `null` si el ticket ya no existe o fue archivado
 * (el `read` no filtra archivados, por eso se consulta `active`).
 */
export async function etapaTicket(
  cfg: OdooConfig,
  ticketId: number,
): Promise<{ id: number; nombre: string } | null> {
  const rows = await odooCall<
    { stage_id: [number, string] | false; active: boolean }[]
  >(cfg, "helpdesk.ticket", "read", [[ticketId]], {
    fields: ["stage_id", "active"],
  });
  // Un id inexistente devuelve [] (Odoo 19); cualquier otra falla se propaga
  // para no abrir un ticket duplicado por un error transitorio.
  const t = rows[0];
  if (!t || !t.active || !t.stage_id) return null;
  return { id: t.stage_id[0], nombre: t.stage_id[1] };
}

/**
 * Nota interna en el chatter del ticket: no notifica por correo al
 * solicitante. `body_is_html` es necesario en Odoo 18+ o el HTML se escapa.
 */
export async function agregarNotaInterna(
  cfg: OdooConfig,
  ticketId: number,
  html: string,
): Promise<void> {
  await odooCall(cfg, "helpdesk.ticket", "message_post", [ticketId], {
    body: html,
    message_type: "comment",
    subtype_xmlid: "mail.mt_note",
    body_is_html: true,
  });
}
