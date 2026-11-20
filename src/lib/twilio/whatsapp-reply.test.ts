// Tests del webhook de WhatsApp. Ejecutar: node --test src/lib/twilio/whatsapp-reply.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import twilio from "twilio";
import {
  type CustomerPhone,
  processWhatsAppReply,
  type ReplyIntent,
  type ReplyTarget,
  type SentNotification,
  verifyTwilioRequest,
  type WhatsAppReplyStore,
} from "./whatsapp-reply.ts";

const NOW = new Date("2026-09-16T12:00:00Z");
const HOURS = 60 * 60 * 1000;

const config = {
  authToken: "test_auth_token_0123456789abcdef",
  accountSid: "AC00000000000000000000000000000001",
  webhookUrl: "https://booknow.example.com/api/webhooks/twilio",
};

const params = {
  AccountSid: config.accountSid,
  MessageSid: "SM0123456789abcdef0123456789abcdef",
  From: "whatsapp:+584121234567",
  To: "whatsapp:+14155238886",
  Body: "Si",
};

function sign(token: string, url: string, p: Record<string, string>) {
  return twilio.getExpectedTwilioSignature(token, url, p);
}

type Appointment = {
  id: string;
  tenant_id: string;
  customer_id: string;
  status: string;
  scheduled_at: string;
};

// Store en memoria que replica los filtros del store de Supabase
function memoryStore(data: {
  notifications: (SentNotification & {
    channel?: string;
    notification_type?: string;
    status?: string;
  })[];
  customers: CustomerPhone[];
  appointments: Appointment[];
}) {
  const logged: { target: ReplyTarget; intent: ReplyIntent }[] = [];
  const store: WhatsAppReplyStore = {
    async findRecentWhatsAppNotifications(sinceIso, limit) {
      return data.notifications
        .filter(
          (n) =>
            (n.channel ?? "whatsapp") === "whatsapp" &&
            (n.notification_type ?? "appointment_reminder") !==
              "appointment_response" &&
            ["sent", "delivered", "read"].includes(n.status ?? "sent") &&
            (n.created_at ?? "") > sinceIso,
        )
        .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
        .slice(0, limit);
    },
    async findCustomersByIds(ids) {
      return data.customers.filter((c) => ids.includes(c.id));
    },
    async updateAppointmentStatus(target, intent, nowIso) {
      const a = data.appointments.find(
        (x) =>
          x.id === target.appointmentId &&
          x.tenant_id === target.tenantId &&
          x.customer_id === target.customerId &&
          ["pending", "confirmed"].includes(x.status) &&
          x.scheduled_at > nowIso,
      );
      if (!a) return false;
      a.status = intent === "confirm" ? "confirmed" : "cancelled";
      return true;
    },
    async logResponse(target, intent) {
      logged.push({ target, intent });
    },
  };
  return { store, logged, data };
}

const iso = (offsetMs: number) =>
  new Date(NOW.getTime() + offsetMs).toISOString();

describe("B1 — firma de Twilio", () => {
  it("firma válida → ok", () => {
    const signature = sign(config.authToken, config.webhookUrl, params);
    assert.equal(verifyTwilioRequest(config, signature, params), "ok");
  });

  it("firma ausente → forbidden", () => {
    assert.equal(verifyTwilioRequest(config, null, params), "forbidden");
  });

  it("parámetro alterado tras firmar → forbidden", () => {
    const signature = sign(config.authToken, config.webhookUrl, params);
    const tampered = { ...params, Body: "No" };
    assert.equal(verifyTwilioRequest(config, signature, tampered), "forbidden");
  });

  it("firmada con otro token → forbidden", () => {
    const signature = sign("otro_token", config.webhookUrl, params);
    assert.equal(verifyTwilioRequest(config, signature, params), "forbidden");
  });

  it("firmada para otra URL → forbidden", () => {
    const signature = sign(
      config.authToken,
      "https://evil.example.com/x",
      params,
    );
    assert.equal(verifyTwilioRequest(config, signature, params), "forbidden");
  });

  it("firma válida pero AccountSid de otra cuenta → forbidden", () => {
    const other = {
      ...params,
      AccountSid: "AC00000000000000000000000000000002",
    };
    const signature = sign(config.authToken, config.webhookUrl, other);
    assert.equal(verifyTwilioRequest(config, signature, other), "forbidden");
  });

  it("sin token, SID o URL → unavailable", () => {
    const signature = sign(config.authToken, config.webhookUrl, params);
    for (const key of ["authToken", "accountSid", "webhookUrl"] as const) {
      const partial = { ...config, [key]: undefined };
      assert.equal(
        verifyTwilioRequest(partial, signature, params),
        "unavailable",
      );
    }
  });
});

describe("B2 + B3 — resolución por notificación enviada", () => {
  it("confirma la cita notificada", async () => {
    const { store, logged, data } = memoryStore({
      notifications: [
        {
          tenant_id: "T1",
          recipient_id: "C1",
          reference_id: "A1",
          created_at: iso(-2 * HOURS),
        },
      ],
      customers: [
        {
          id: "C1",
          tenant_id: "T1",
          phone: "4121234567",
          phone_country_code: "+58",
        },
      ],
      appointments: [
        {
          id: "A1",
          tenant_id: "T1",
          customer_id: "C1",
          status: "pending",
          scheduled_at: iso(24 * HOURS),
        },
      ],
    });
    const out = await processWhatsAppReply(
      store,
      { from: params.From, body: "Sí" },
      NOW,
    );
    assert.equal(out, "applied");
    assert.equal(data.appointments[0].status, "confirmed");
    assert.deepEqual(logged, [
      {
        target: { tenantId: "T1", customerId: "C1", appointmentId: "A1" },
        intent: "confirm",
      },
    ]);
  });

  it("mismo teléfono en dos negocios con notificaciones en la ventana → no toca ninguna cita", async () => {
    const { store, logged, data } = memoryStore({
      notifications: [
        {
          tenant_id: "T1",
          recipient_id: "C1",
          reference_id: "A1",
          created_at: iso(-3 * HOURS),
        },
        {
          tenant_id: "T2",
          recipient_id: "C2",
          reference_id: "A2",
          created_at: iso(-1 * HOURS),
        },
      ],
      customers: [
        {
          id: "C1",
          tenant_id: "T1",
          phone: "4121234567",
          phone_country_code: "+58",
        },
        {
          id: "C2",
          tenant_id: "T2",
          phone: "412-123-4567",
          phone_country_code: "+58",
        },
      ],
      appointments: [
        {
          id: "A1",
          tenant_id: "T1",
          customer_id: "C1",
          status: "pending",
          scheduled_at: iso(24 * HOURS),
        },
        {
          id: "A2",
          tenant_id: "T2",
          customer_id: "C2",
          status: "pending",
          scheduled_at: iso(24 * HOURS),
        },
      ],
    });
    const out = await processWhatsAppReply(
      store,
      { from: params.From, body: "no" },
      NOW,
    );
    assert.equal(out, "ambiguous_tenant");
    assert.deepEqual(
      data.appointments.map((a) => a.status),
      ["pending", "pending"],
    );
    assert.equal(logged.length, 0);
  });

  it("teléfono de otro negocio sin notificación → no se usa (sin búsqueda global por dígitos)", async () => {
    const { store, data } = memoryStore({
      notifications: [
        {
          tenant_id: "T1",
          recipient_id: "C1",
          reference_id: "A1",
          created_at: iso(-1 * HOURS),
        },
      ],
      customers: [
        // Mismos últimos 10 dígitos, otro país: el código antiguo lo habría tomado
        {
          id: "C1",
          tenant_id: "T1",
          phone: "4121234567",
          phone_country_code: "+57",
        },
      ],
      appointments: [
        {
          id: "A1",
          tenant_id: "T1",
          customer_id: "C1",
          status: "pending",
          scheduled_at: iso(24 * HOURS),
        },
      ],
    });
    const out = await processWhatsAppReply(
      store,
      { from: params.From, body: "si" },
      NOW,
    );
    assert.equal(out, "unresolved");
    assert.equal(data.appointments[0].status, "pending");
  });

  it("cliente con dos citas → cambia la notificada, no la de scheduled_at más alto", async () => {
    const { store, data } = memoryStore({
      notifications: [
        {
          tenant_id: "T1",
          recipient_id: "C1",
          reference_id: "A-NEAR",
          created_at: iso(-1 * HOURS),
        },
      ],
      customers: [
        {
          id: "C1",
          tenant_id: "T1",
          phone: "4121234567",
          phone_country_code: "+58",
        },
      ],
      appointments: [
        {
          id: "A-NEAR",
          tenant_id: "T1",
          customer_id: "C1",
          status: "pending",
          scheduled_at: iso(24 * HOURS),
        },
        {
          id: "A-FAR",
          tenant_id: "T1",
          customer_id: "C1",
          status: "pending",
          scheduled_at: iso(240 * HOURS),
        },
      ],
    });
    const out = await processWhatsAppReply(
      store,
      { from: params.From, body: "cancelar" },
      NOW,
    );
    assert.equal(out, "applied");
    assert.equal(data.appointments[0].status, "cancelled");
    assert.equal(data.appointments[1].status, "pending");
  });

  it("notificación de hace más de 48 h → no hace nada", async () => {
    const { store, data, logged } = memoryStore({
      notifications: [
        {
          tenant_id: "T1",
          recipient_id: "C1",
          reference_id: "A1",
          created_at: iso(-49 * HOURS),
        },
      ],
      customers: [
        {
          id: "C1",
          tenant_id: "T1",
          phone: "4121234567",
          phone_country_code: "+58",
        },
      ],
      appointments: [
        {
          id: "A1",
          tenant_id: "T1",
          customer_id: "C1",
          status: "pending",
          scheduled_at: iso(24 * HOURS),
        },
      ],
    });
    const out = await processWhatsAppReply(
      store,
      { from: params.From, body: "si" },
      NOW,
    );
    assert.equal(out, "unresolved");
    assert.equal(data.appointments[0].status, "pending");
    assert.equal(logged.length, 0);
  });

  it("una respuesta registrada (appointment_response) no cuenta como notificación enviada", async () => {
    const { store, data } = memoryStore({
      notifications: [
        {
          tenant_id: "T1",
          recipient_id: "C1",
          reference_id: "A1",
          created_at: iso(-1 * HOURS),
          notification_type: "appointment_response",
          status: "delivered",
        },
      ],
      customers: [
        {
          id: "C1",
          tenant_id: "T1",
          phone: "4121234567",
          phone_country_code: "+58",
        },
      ],
      appointments: [
        {
          id: "A1",
          tenant_id: "T1",
          customer_id: "C1",
          status: "pending",
          scheduled_at: iso(24 * HOURS),
        },
      ],
    });
    const out = await processWhatsAppReply(
      store,
      { from: params.From, body: "si" },
      NOW,
    );
    assert.equal(out, "unresolved");
    assert.equal(data.appointments[0].status, "pending");
  });

  it("cita pasada o completada → not_applicable", async () => {
    const { store, data, logged } = memoryStore({
      notifications: [
        {
          tenant_id: "T1",
          recipient_id: "C1",
          reference_id: "A1",
          created_at: iso(-1 * HOURS),
        },
      ],
      customers: [
        {
          id: "C1",
          tenant_id: "T1",
          phone: "4121234567",
          phone_country_code: "+58",
        },
      ],
      appointments: [
        {
          id: "A1",
          tenant_id: "T1",
          customer_id: "C1",
          status: "pending",
          scheduled_at: iso(-1 * HOURS),
        },
      ],
    });
    assert.equal(
      await processWhatsAppReply(store, { from: params.From, body: "si" }, NOW),
      "not_applicable",
    );
    data.appointments[0].scheduled_at = iso(24 * HOURS);
    data.appointments[0].status = "completed";
    assert.equal(
      await processWhatsAppReply(store, { from: params.From, body: "si" }, NOW),
      "not_applicable",
    );
    assert.equal(logged.length, 0);
  });

  it("mensaje sin palabra clave → ignored, sin consultar la base", async () => {
    const store = memoryStore({
      notifications: [],
      customers: [],
      appointments: [],
    }).store;
    store.findRecentWhatsAppNotifications = async () => {
      throw new Error("no debería consultar");
    };
    assert.equal(
      await processWhatsAppReply(
        store,
        { from: params.From, body: "hola" },
        NOW,
      ),
      "ignored",
    );
  });
});
