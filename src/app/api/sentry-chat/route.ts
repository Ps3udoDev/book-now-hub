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
import {
  type Alerta,
  firmaEsperada,
  normalizarAlerta,
  secretosIguales,
} from "@/lib/monitoring/sentry-webhook";

export const dynamic = "force-dynamic";

/**
 * Sentry firma el cuerpo con HMAC-SHA256 usando el Client Secret de la
 * integracion. Apps Script no podia leer ese header; aqui si.
 */
function firmaValida(rawBody: string, headers: Headers): boolean {
  const secret = process.env.SENTRY_CHAT_CLIENT_SECRET;
  if (!secret) return true; // verificacion opcional: sin secret, no se exige

  const firma = headers.get("sentry-hook-signature");
  const esperada = firmaEsperada(rawBody, secret);
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
    const alerta = normalizarAlerta(payload);
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
