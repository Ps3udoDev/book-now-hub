// src/app/api/sentry-chat/route.ts
// Traductor Sentry -> Google Chat.
//
// Reemplaza al Apps Script de docs/integracion-sentry-google-chat.md: `/exec`
// siempre responde 302 hacia script.googleusercontent.com y el cliente de
// webhooks de Sentry ni sigue redirects ni espera el arranque en frio, asi que
// todas las entregas quedaban en `302` o `timeout` (verificado el 01-09-2026 en
// el log de la integracion interna). Aqui no hay redirect y responde en ms.
//
// Env vars (Vercel, scope Production):
//   SENTRY_CHAT_TOKEN            secreto compartido; va en ?token= de la URL
//   SENTRY_CHAT_WEBHOOK_DEFAULT  webhook del espacio de Chat por defecto
//   SENTRY_CHAT_ROUTES           (opcional) JSON { "<slug|id|space>": "<webhook>" }
//   SENTRY_CHAT_CLIENT_SECRET    (opcional) Client Secret de la integracion,
//                                para validar la firma Sentry-Hook-Signature
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

interface Alerta {
  issueId: string;
  proyecto: string;
  titulo: string;
  culprit: string;
  nivel: string;
  entorno: string;
  url: string;
  regla: string;
}

/** Comparacion en tiempo constante; evita filtrar el secreto por timing. */
function secretosIguales(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Sentry firma el cuerpo con HMAC-SHA256 usando el Client Secret de la
 * integracion. Apps Script no podia leer ese header; aqui si.
 */
function firmaValida(rawBody: string, headers: Headers): boolean {
  const secret = process.env.SENTRY_CHAT_CLIENT_SECRET;
  if (!secret) return true; // verificacion opcional: sin secret, no se exige

  const firma = headers.get("sentry-hook-signature");
  const esperada = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");
  const ok = firma !== null && secretosIguales(esperada, firma);

  if (!ok) {
    // Diagnostico: NO imprime el secreto ni la firma completa, solo lo justo
    // para distinguir "header ausente" de "secreto equivocado" de "secreto con
    // espacios/salto de linea pegado de mas". Borrar cuando el QA pase.
    console.warn("[sentry-chat] diagnostico de firma", {
      recurso: headers.get("sentry-hook-resource"),
      requestId: headers.get("request-id"),
      firmaRecibida: firma
        ? `${firma.slice(0, 8)}...(${firma.length})`
        : "AUSENTE",
      firmaEsperada: `${esperada.slice(0, 8)}...(${esperada.length})`,
      secretLen: secret.length,
      secretLenSinEspacios: secret.trim().length,
      bodyLen: rawBody.length,
    });
  }
  return ok;
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

/** Aplana los dos formatos que manda Sentry a una sola estructura. */
function normalizar(p: Record<string, unknown>): Alerta {
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
  };
}

/**
 * Prioridad de enrutamiento:
 *   1. ?space=xxx en la URL registrada en Sentry (control explicito)
 *   2. slug o ID numerico del proyecto que reporta
 *   3. canal por defecto
 */
function resolverDestino(alerta: Alerta, space: string | null): string | null {
  let rutas: Record<string, string> = {};
  try {
    rutas = JSON.parse(process.env.SENTRY_CHAT_ROUTES || "{}");
  } catch {
    console.error("[sentry-chat] SENTRY_CHAT_ROUTES no es JSON valido");
  }

  if (space && rutas[space]) return rutas[space];
  if (rutas[alerta.proyecto]) return rutas[alerta.proyecto];
  return process.env.SENTRY_CHAT_WEBHOOK_DEFAULT ?? null;
}

function construirTarjeta(a: Alerta): Record<string, unknown> {
  const icono = a.nivel === "FATAL" || a.nivel === "ERROR" ? "🔴" : "🟠";
  const entorno = a.entorno || "sin entorno";

  const widgets: Record<string, unknown>[] = [
    { decoratedText: { topLabel: "Mensaje", text: a.titulo, wrapText: true } },
  ];
  if (a.culprit) {
    widgets.push({
      decoratedText: { topLabel: "Origen", text: a.culprit, wrapText: true },
    });
  }
  if (a.regla) {
    widgets.push({
      decoratedText: { topLabel: "Regla", text: a.regla, wrapText: true },
    });
  }
  if (a.url) {
    widgets.push({
      buttonList: {
        buttons: [
          { text: "Abrir en Sentry", onClick: { openLink: { url: a.url } } },
        ],
      },
    });
  }

  const cuerpo: Record<string, unknown> = {
    cardsV2: [
      {
        cardId: `sentry-${a.issueId || Date.now()}`,
        card: {
          header: {
            title: `${icono}  ${a.nivel} en ${entorno}`,
            subtitle: a.proyecto,
          },
          sections: [{ widgets }],
        },
      },
    ],
  };

  // Todos los eventos del mismo issue caen en el mismo hilo.
  if (a.issueId) {
    cuerpo.thread = { threadKey: `sentry-issue-${a.issueId}` };
  }
  return cuerpo;
}

async function publicarEnChat(
  webhookUrl: string,
  cuerpo: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; body?: string }> {
  const url = cuerpo.thread
    ? `${webhookUrl}&messageReplyOption=REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD`
    : webhookUrl;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(cuerpo),
  });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, status: res.status, body: body.slice(0, 500) };
  }
  return { ok: true, status: res.status };
}

/** Prueba de vida: abrir en el navegador debe devolver {"ok":true,...}. */
export async function GET() {
  return Response.json({
    ok: true,
    servicio: "traductor-sentry-chat",
    configurado: Boolean(
      process.env.SENTRY_CHAT_TOKEN && process.env.SENTRY_CHAT_WEBHOOK_DEFAULT,
    ),
  });
}

export async function POST(request: Request) {
  // Nunca lanzamos: un 5xx aqui haria que Sentry marque la entrega fallida y,
  // si ese error se captura, se realimenta el ciclo alerta -> webhook -> alerta.
  // Siempre 200; el detalle del fallo queda en los logs de Vercel.
  try {
    const url = new URL(request.url);
    const expected = process.env.SENTRY_CHAT_TOKEN;

    if (!expected) {
      console.error("[sentry-chat] falta SENTRY_CHAT_TOKEN");
      return Response.json({ ok: false, error: "no configurado" });
    }
    const token = url.searchParams.get("token") ?? "";
    if (!secretosIguales(expected, token)) {
      console.warn("[sentry-chat] token invalido o ausente");
      return Response.json({ ok: false, error: "no autorizado" });
    }

    const rawBody = await request.text();
    if (!firmaValida(rawBody, request.headers)) {
      console.warn("[sentry-chat] firma invalida");
      return Response.json({ ok: false, error: "firma invalida" });
    }

    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const alerta = normalizar(payload);
    const destino = resolverDestino(alerta, url.searchParams.get("space"));

    if (!destino) {
      console.error("[sentry-chat] sin webhook destino", {
        proyecto: alerta.proyecto,
      });
      return Response.json({ ok: false, error: "sin destino" });
    }

    const resultado = await publicarEnChat(destino, construirTarjeta(alerta));

    if (!resultado.ok) {
      console.error("[sentry-chat] Google Chat respondio", resultado);
      return Response.json({ ok: false, chat: resultado.status });
    }

    console.log("[sentry-chat] publicado", {
      issueId: alerta.issueId,
      proyecto: alerta.proyecto,
      entorno: alerta.entorno,
    });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[sentry-chat] fallo", error);
    return Response.json({ ok: false, error: String(error) });
  }
}
