// Lógica del webhook de respuestas de WhatsApp (Twilio).
// Sin imports de Next ni alias "@/" para poder probarla con `node --test`.
import twilio from "twilio";

// Palabras clave para confirmar o cancelar (B4 lo resuelve el servicio Go, aquí no se toca)
const CONFIRM_KEYWORDS = ["yes", "si", "sí", "confirmar", "confirmo"];
const CANCEL_KEYWORDS = ["no", "cancelar", "cancelo"];

// Ventana de resolución (decisión D8.a)
export const RESOLUTION_WINDOW_MS = 48 * 60 * 60 * 1000;

// Tope de notificaciones leídas por mensaje. Si se alcanza no se actúa (falla cerrado).
export const NOTIFICATIONS_LIMIT = 200;

export type TwilioConfig = {
  authToken: string | undefined;
  accountSid: string | undefined;
  webhookUrl: string | undefined;
};

export type ReplyIntent = "confirm" | "cancel";

export type SentNotification = {
  tenant_id: string;
  recipient_id: string;
  reference_id: string | null;
  created_at: string | null;
};

export type CustomerPhone = {
  id: string;
  tenant_id: string;
  phone: string | null;
  phone_country_code: string | null;
};

export type ReplyTarget = {
  tenantId: string;
  customerId: string;
  appointmentId: string;
};

export type ReplyOutcome =
  | "applied"
  | "ignored"
  | "invalid_phone"
  | "unresolved"
  | "ambiguous_tenant"
  | "too_many_notifications"
  | "not_applicable";

export interface WhatsAppReplyStore {
  // Notificaciones de WhatsApp de citas enviadas a clientes desde `sinceIso`, más recientes primero
  findRecentWhatsAppNotifications(
    sinceIso: string,
    limit: number,
  ): Promise<SentNotification[]>;
  findCustomersByIds(ids: string[]): Promise<CustomerPhone[]>;
  // Update condicionado (negocio, cliente, estado y fecha futura). Devuelve si cambió una fila.
  updateAppointmentStatus(
    target: ReplyTarget,
    intent: ReplyIntent,
    nowIso: string,
  ): Promise<boolean>;
  logResponse(target: ReplyTarget, intent: ReplyIntent): Promise<void>;
}

// B1: valida configuración, firma y cuenta. Solo si devuelve "ok" se puede usar algún campo.
export function verifyTwilioRequest(
  config: TwilioConfig,
  signature: string | null,
  params: Record<string, string>,
): "ok" | "forbidden" | "unavailable" {
  const { authToken, accountSid, webhookUrl } = config;
  if (!authToken || !accountSid || !webhookUrl) return "unavailable";
  if (!signature) return "forbidden";

  // La URL es exactamente la configurada en Twilio, nunca derivada de la petición
  if (!twilio.validateRequest(authToken, signature, webhookUrl, params)) {
    return "forbidden";
  }

  if (params.AccountSid !== accountSid) return "forbidden";
  return "ok";
}

// "whatsapp:+58 412-123.4567" -> "+584121234567" (E.164) o null si no es válido
export function normalizeWhatsAppPhone(from: string): string | null {
  const raw = from.trim().replace(/^whatsapp:/i, "");
  if (!raw.startsWith("+")) return null;
  const e164 = `+${raw.replace(/\D/g, "")}`;
  return /^\+[1-9]\d{7,14}$/.test(e164) ? e164 : null;
}

// Mismo criterio que la consulta SQL: phone_country_code || regexp_replace(phone, '\D', '', 'g')
export function customerE164(customer: CustomerPhone): string | null {
  if (customer.phone_country_code == null || customer.phone == null) {
    return null;
  }
  return `${customer.phone_country_code}${customer.phone.replace(/\D/g, "")}`;
}

export function parseIntent(body: string): ReplyIntent | null {
  const text = body.trim().toLowerCase();
  if (!text) return null;
  if (CONFIRM_KEYWORDS.some((kw) => text.includes(kw))) return "confirm";
  if (CANCEL_KEYWORDS.some((kw) => text.includes(kw))) return "cancel";
  return null;
}

// B2 + B3 (D8.a): negocio y cita salen de la notificación enviada a ese teléfono.
// `notifications` debe venir ordenado por created_at desc.
export function resolveNotifiedAppointment(
  notifications: SentNotification[],
  customers: CustomerPhone[],
  phone: string,
): ReplyTarget | "ambiguous_tenant" | null {
  const customersById = new Map(customers.map((c) => [c.id, c]));

  const matches = notifications.filter((n) => {
    const customer = customersById.get(n.recipient_id);
    return (
      !!n.reference_id &&
      !!customer &&
      customer.tenant_id === n.tenant_id &&
      customerE164(customer) === phone
    );
  });

  if (matches.length === 0) return null;

  // Nunca "gana la más reciente" entre negocios distintos
  const tenants = new Set(matches.map((n) => n.tenant_id));
  if (tenants.size > 1) return "ambiguous_tenant";

  const latest = matches[0];
  return {
    tenantId: latest.tenant_id,
    customerId: latest.recipient_id,
    appointmentId: latest.reference_id as string,
  };
}

export async function processWhatsAppReply(
  store: WhatsAppReplyStore,
  input: { from: string; body: string },
  now: Date = new Date(),
): Promise<ReplyOutcome> {
  const intent = parseIntent(input.body);
  if (!intent) return "ignored";

  const phone = normalizeWhatsAppPhone(input.from);
  if (!phone) return "invalid_phone";

  const since = new Date(now.getTime() - RESOLUTION_WINDOW_MS).toISOString();
  const notifications = await store.findRecentWhatsAppNotifications(
    since,
    NOTIFICATIONS_LIMIT,
  );
  if (notifications.length === 0) return "unresolved";
  if (notifications.length >= NOTIFICATIONS_LIMIT) {
    return "too_many_notifications";
  }

  const recipientIds = [...new Set(notifications.map((n) => n.recipient_id))];
  const customers = await store.findCustomersByIds(recipientIds);

  const target = resolveNotifiedAppointment(notifications, customers, phone);
  if (target === null) return "unresolved";
  if (target === "ambiguous_tenant") return "ambiguous_tenant";

  const changed = await store.updateAppointmentStatus(
    target,
    intent,
    now.toISOString(),
  );
  if (!changed) return "not_applicable";

  await store.logResponse(target, intent);
  return "applied";
}
