/**
 * Formateadores y utilidades de sanitización para BookNow Business MCP.
 */

/**
 * Enmascara un número de teléfono para no exponer PII a los modelos de lenguaje.
 * Regla:
 * - Si no existe o está vacío: retorna null.
 * - Si tiene al menos 7 dígitos: preserva prefijo y los últimos 3 dígitos (ej: +593******123).
 * - Si es muy corto: retorna asteriscos completos.
 */
export function maskPhone(phone?: string | null): string | null {
  if (!phone || !phone.trim()) {
    return null;
  }

  const clean = phone.trim();
  const digits = clean.replace(/\D/g, "");

  if (digits.length < 6) {
    return "******";
  }

  const isPlus = clean.startsWith("+");
  const last3 = clean.slice(-3);
  const prefixLength = isPlus ? 4 : 2;
  const prefix = clean.slice(0, prefixLength);

  return `${prefix}${"*".repeat(Math.max(4, clean.length - prefixLength - 3))}${last3}`;
}

/**
 * Sanitiza parámetros de llamadas para auditoría en mcp_tool_calls.
 * Elimina tokens, contraseñas, secretos y recorta cadenas extensas.
 */
export function sanitizeSafeSummary(obj: unknown): Record<string, unknown> {
  if (!obj || typeof obj !== "object") {
    return {};
  }

  const sanitized: Record<string, unknown> = {};
  const sensitiveKeys = new Set([
    "token",
    "access_token",
    "refresh_token",
    "password",
    "secret",
    "authorization",
    "client_secret",
  ]);

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.has(lowerKey)) {
      sanitized[key] = "[REDACTED]";
      continue;
    }

    if (lowerKey === "phone" && typeof value === "string") {
      sanitized[key] = maskPhone(value);
      continue;
    }

    if (typeof value === "string" && value.length > 200) {
      sanitized[key] = `${value.slice(0, 197)}...`;
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
}
