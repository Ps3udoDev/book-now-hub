// src/app/api/sentry-alert-test/route.ts
// Endpoint TEMPORAL de QA para verificar las reglas de alerta Sentry -> Google Chat.
// Ver docs/integracion-sentry-google-chat.md (Fase 6).
//
// Protegido por `ALERT_TEST_KEY`: si la variable no esta definida o la key no
// coincide, responde 404 y no hace nada. Borrar esta ruta al terminar el QA.
//
// Uso:
//   ?key=...&msg=Prueba-nuevo-123           -> issue nuevo   (Regla 1)
//   ?key=...&msg=Prueba-pico-volumen        -> repetir 51x   (Regla 3)
//   ?key=...&msg=...&module=auth            -> tag module    (Regla 4)
//   ?key=...&msg=...&throw=1                -> error server no capturado
import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";

class SentryAlertTestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SentryAlertTestError";
  }
}

export async function GET(request: Request) {
  const expectedKey = process.env.ALERT_TEST_KEY;
  const url = new URL(request.url);

  // Sin key configurada la ruta no existe.
  if (!expectedKey || url.searchParams.get("key") !== expectedKey) {
    return new Response("Not found", { status: 404 });
  }

  const message = (
    url.searchParams.get("msg") || "Prueba de alerta Sentry"
  ).slice(0, 200);
  const moduleTag = url.searchParams.get("module");
  const level = url.searchParams.get("level") === "fatal" ? "fatal" : "error";

  // `throw=1` deja escapar el error para probar el camino real de Next
  // (`onRequestError` en src/instrumentation.ts), no `captureException`.
  if (url.searchParams.get("throw") === "1") {
    throw new SentryAlertTestError(message);
  }

  const eventId = Sentry.withScope((scope) => {
    if (moduleTag) scope.setTag("module", moduleTag);
    scope.setTag("alert_test", "true");
    scope.setLevel(level);
    // Sentry agrupa las excepciones por STACK TRACE, no por mensaje: sin esto
    // todos los eventos de esta ruta caen en un unico issue (mismo `throw`,
    // misma linea) y la regla "A new issue is created" solo dispara la
    // primera vez. Con el fingerprint, cada `msg` distinto = issue distinto.
    scope.setFingerprint(["sentry-alert-test", message]);
    return Sentry.captureException(new SentryAlertTestError(message));
  });

  // En serverless hay que vaciar la cola antes de responder.
  await Sentry.flush(2000);

  return Response.json({
    sent: true,
    eventId,
    message,
    module: moduleTag,
    level,
    environment: process.env.VERCEL_ENV
      ? `vercel-${process.env.VERCEL_ENV}`
      : process.env.NODE_ENV,
  });
}
