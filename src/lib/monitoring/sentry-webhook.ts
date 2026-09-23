// src/lib/monitoring/sentry-webhook.ts
// Piezas comunes de los webhooks entrantes de Sentry (/api/sentry-chat y
// /api/sentry-odoo): comparacion de secretos, firma HMAC y normalizacion de
// los dos formatos de payload que manda Sentry.
import crypto from "node:crypto";

export interface Alerta {
  issueId: string;
  proyecto: string;
  titulo: string;
  culprit: string;
  nivel: string;
  entorno: string;
  url: string;
  regla: string;
  /** Fecha del evento que disparo la alerta (ISO), si viene. */
  fecha: string;
  /** Tag `module` del evento (ej. `auth`), si viene. */
  modulo: string;
  release: string;
}

/** Comparacion en tiempo constante; evita filtrar el secreto por timing. */
export function secretosIguales(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** HMAC-SHA256 del cuerpo con el Client Secret de la integracion de Sentry. */
export function firmaEsperada(rawBody: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");
}

/**
 * Valida el header `Sentry-Hook-Signature`. Sin secret configurado la
 * verificacion es opcional y se da por valida.
 */
export function firmaSentryValida(
  rawBody: string,
  headers: Headers,
  secret: string | undefined,
): boolean {
  if (!secret) return true;
  const firma = headers.get("sentry-hook-signature");
  return (
    firma !== null && secretosIguales(firmaEsperada(rawBody, secret), firma)
  );
}

/** Los tags de Sentry llegan como pares [["environment","production"], ...]. */
function valorDeTag(tags: unknown, clave: string): string {
  if (!Array.isArray(tags)) return "";
  for (const par of tags) {
    if (Array.isArray(par) && par[0] === clave) return String(par[1] ?? "");
  }
  return "";
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

/** Sentry manda `datetime` (ISO) o `timestamp` (epoch en segundos). */
function fechaDe(ev: Record<string, unknown>): string {
  if (typeof ev.datetime === "string") return ev.datetime;
  if (typeof ev.timestamp === "number") {
    return new Date(ev.timestamp * 1000).toISOString();
  }
  return "";
}

/** Aplana los dos formatos que manda Sentry a una sola estructura. */
export function normalizarAlerta(p: Record<string, unknown>): Alerta {
  const data = p.data as Record<string, unknown> | undefined;

  // Formato A - Integracion interna: { action, data: { event | issue } }
  if (data && (data.event || data.issue)) {
    const ev = (data.event ?? data.issue) as Record<string, unknown>;
    return {
      issueId: String(ev.issue_id ?? ev.id ?? ""),
      proyecto: texto(ev.project_slug) || texto(ev.project) || "desconocido",
      titulo: texto(ev.title) || texto(ev.message) || "Error sin titulo",
      culprit: texto(ev.culprit),
      nivel: (texto(ev.level) || "error").toUpperCase(),
      entorno: texto(ev.environment) || valorDeTag(ev.tags, "environment"),
      url: texto(ev.web_url) || texto(ev.url),
      regla: texto(data.triggered_rule),
      fecha: fechaDe(ev),
      modulo: valorDeTag(ev.tags, "module"),
      release: texto(ev.release) || valorDeTag(ev.tags, "release"),
    };
  }

  // Formato B - Legacy WebHooks plugin: { id, project, culprit, level, ... }
  const ev = (p.event ?? {}) as Record<string, unknown>;
  return {
    issueId: String(p.id ?? ev.issue_id ?? ""),
    proyecto: texto(p.project) || "desconocido",
    titulo: texto(p.message) || texto(ev.title) || "Error sin titulo",
    culprit: texto(p.culprit) || texto(ev.culprit),
    nivel: (texto(p.level) || texto(ev.level) || "error").toUpperCase(),
    entorno: texto(ev.environment) || valorDeTag(ev.tags, "environment"),
    url: texto(p.url) || texto(ev.web_url),
    regla: "",
    fecha: fechaDe(ev),
    modulo: valorDeTag(ev.tags, "module"),
    release: texto(ev.release) || valorDeTag(ev.tags, "release"),
  };
}
