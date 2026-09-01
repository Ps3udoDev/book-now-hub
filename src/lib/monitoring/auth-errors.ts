// src/lib/monitoring/auth-errors.ts
// Instrumentacion de fallas de acceso para Sentry.
//
// Objetivo: que la regla de alerta "Falla de acceso" (tag `module` = `auth`)
// dispare SOLO ante fallas inesperadas de infraestructura -- Supabase caido,
// 5xx, red inalcanzable, excepciones no previstas -- y nunca ante errores
// normales de usuario (contrasena incorrecta, email sin confirmar, magic link
// expirado, rate limit). Si alertaramos de esos ultimos el canal se satura y
// el equipo lo silencia, que es el mayor riesgo de esta integracion.
import * as Sentry from "@sentry/nextjs";

/** Flujo de autenticacion donde ocurrio la falla. */
export type AuthFlow =
  | "login-global"
  | "login-tenant"
  | "login-client"
  | "hydrate-global"
  | "hydrate-tenant"
  | "magic-link"
  | "oauth-google"
  | "password-reset"
  | "auth-callback"
  | "logout";

/** Superficie de la app donde vive el flujo. */
export type AuthSurface = "admin" | "tenant" | "client";

export interface AuthErrorContext {
  flow: AuthFlow;
  surface?: AuthSurface;
  tenantSlug?: string | null;
}

/**
 * Error de negocio esperado en un flujo de auth (ej: "no perteneces a este
 * tenant"). Se lanza a proposito y NO debe generar alerta.
 */
export class ExpectedAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExpectedAuthError";
  }
}

function readNumber(error: unknown, key: string): number | null {
  const value = (error as Record<string, unknown> | null)?.[key];
  return typeof value === "number" ? value : null;
}

function readString(error: unknown, key: string): string | null {
  const value = (error as Record<string, unknown> | null)?.[key];
  return typeof value === "string" ? value : null;
}

/**
 * Un error es "esperado" si lo lanzamos nosotros a proposito o si Supabase
 * devolvio un 4xx (credenciales, link expirado, rate limit, validacion).
 * Nota: los errores de red de supabase-js llegan con `status` 0 o undefined,
 * asi que NO caen aqui y si generan alerta -- que es justo lo que queremos.
 */
function isExpected(error: unknown): boolean {
  if (error instanceof ExpectedAuthError) return true;

  const status = readNumber(error, "status");
  if (status !== null && status >= 400 && status < 500) return true;

  return false;
}

/**
 * Reporta una falla de acceso a Sentry si amerita alerta.
 * Devuelve `true` si el evento se envio, `false` si se descarto por esperado.
 *
 * No se incluye el email ni ningun dato personal: solo flujo, superficie,
 * tenant y el codigo/status que devolvio Supabase.
 */
export function captureAuthError(
  error: unknown,
  ctx: AuthErrorContext,
): boolean {
  if (isExpected(error)) return false;

  Sentry.withScope((scope) => {
    scope.setTag("module", "auth");
    scope.setTag("auth.flow", ctx.flow);
    if (ctx.surface) scope.setTag("auth.surface", ctx.surface);
    scope.setLevel("error");
    scope.setContext("auth", {
      flow: ctx.flow,
      surface: ctx.surface ?? null,
      tenant: ctx.tenantSlug ?? null,
      status: readNumber(error, "status"),
      code: readString(error, "code"),
    });

    Sentry.captureException(
      error instanceof Error ? error : new Error(String(error)),
    );
  });

  return true;
}
