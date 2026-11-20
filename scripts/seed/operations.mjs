const TENANT_ID = "d699061e-e6ee-4b8c-a675-65a7bbbaa252";
const BRANCH_ID = "1dcbd4e0-79f9-4ee4-9c56-1cc66693d387";
const MIGUEL_ID = "52d563f1-64ef-4439-b50c-02119170e198";
const JAVIER_ID = "776f9e16-1796-4324-b75e-64e5859c5da6";
const SERVICE_CORTE_ID = "4a95f396-2322-4c10-9477-b0440cc0bcd7";
const SERVICE_BALLAGE_ID = "278f1076-07e0-4d3d-ba7d-439828be945b";

const uid = (n) =>
  `d699061e-3000-4000-8000-${String(n).padStart(12, "0")}`;

const daysAgoIso = (days, hour = 10, minute = 0) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hour + 5, minute, 0, 0); // UTC-5 (Ecuador)
  return d.toISOString();
};

const CUSTOMERS_DATA = [
  { first: "Sofía", last: "Mendoza", daysAgo: 5, birth: "1992-11-15", visits: 12, spent: 480, tags: ["VIP", "Coloración"] },
  { first: "Valentina", last: "Cordero", daysAgo: 5, birth: "1995-11-22", visits: 9, spent: 340, tags: ["VIP", "Frecuente"] },
  { first: "Camila", last: "Jaramillo", daysAgo: 5, birth: "1990-03-14", visits: 7, spent: 215, tags: ["Frecuente"] },
  { first: "Isabella", last: "Burneo", daysAgo: 15, birth: "1989-11-08", visits: 10, spent: 390, tags: ["VIP", "Novias"] },
  { first: "Lucía", last: "Valdivieso", daysAgo: 15, birth: "1994-06-19", visits: 6, spent: 185, tags: ["Frecuente"] },
  { first: "Daniela", last: "Espinosa", daysAgo: 15, birth: "1998-11-27", visits: 5, spent: 150, tags: ["Coloración"] },
  { first: "Andrea", last: "Rojas", daysAgo: 45, birth: "1991-08-03", visits: 4, spent: 120, tags: ["Frecuente"] },
  { first: "Mateo", last: "Samaniego", daysAgo: 45, birth: "1988-01-25", visits: 8, spent: 95, tags: ["Frecuente"] },
  { first: "Paula", last: "Aguirre", daysAgo: 45, birth: "1996-09-12", visits: 3, spent: 85, tags: ["Novias"] },
  { first: "Sebastián", last: "Carrión", daysAgo: 75, birth: "1993-04-30", visits: 3, spent: 60, tags: ["Frecuente"] },
  { first: "María José", last: "Loaiza", daysAgo: 75, birth: "1987-07-17", visits: 5, spent: 210, tags: ["VIP", "Coloración"] },
  { first: "Gabriela", last: "Vivanco", daysAgo: 75, birth: "1997-02-11", visits: 2, spent: 55, tags: ["Novias"] },
  { first: "Fernanda", last: "Córdova", daysAgo: 110, birth: "1990-12-05", visits: 2, spent: 50, tags: ["Coloración"] },
  { first: "Diego", last: "Palacios", daysAgo: 110, birth: "1985-05-20", visits: 1, spent: 25, tags: ["Frecuente"] },
  { first: "Natalia", last: "Morocho", daysAgo: 110, birth: "1993-10-09", visits: 4, spent: 140, tags: ["VIP"] },
];

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

// Inserta o actualiza los datos operativos de demo para el tenant dev-test.
export async function seedOperations(supabase) {
  // 1. 15 clientes con textura para IA
  const customers = CUSTOMERS_DATA.map((c, idx) => ({
    id: uid(idx + 1),
    tenant_id: TENANT_ID,
    first_name: c.first,
    last_name: c.last,
    full_name: `${c.first} ${c.last}`,
    email: `demo.cliente.${idx + 1}@dev-test.ec`,
    phone: `0990000${String(idx + 10).padStart(2, "0")}`,
    phone_country_code: "+593",
    city: "Loja",
    preferred_branch_id: BRANCH_ID,
    birth_date: c.birth,
    last_visit_at: daysAgoIso(c.daysAgo, 11, 0),
    total_visits: c.visits,
    total_spent: c.spent,
    tags: c.tags,
    is_active: true,
    accepts_marketing: true,
  }));

  const { error: custErr } = await supabase
    .from("customers")
    .upsert(customers, { onConflict: "id" });
  if (custErr) throw new Error(`customers upsert: ${custErr.message}`);

  // 2. Horarios semanales (lunes a sábado, 08:00-18:00) respetando filas existentes
  const { data: existingSchedules, error: schedFetchErr } = await supabase
    .from("specialist_schedules")
    .select("id, specialist_id, day_of_week")
    .eq("tenant_id", TENANT_ID)
    .eq("branch_id", BRANCH_ID);
  if (schedFetchErr) throw new Error(`specialist_schedules select: ${schedFetchErr.message}`);

  const schedMap = new Map(
    (existingSchedules ?? []).map((s) => [`${s.specialist_id}:${s.day_of_week}`, s.id]),
  );

  const schedulesToUpsert = [];
  let schedSeq = 21;
  for (const specialistId of [MIGUEL_ID, JAVIER_ID]) {
    for (const day of DAYS) {
      const existingId = schedMap.get(`${specialistId}:${day}`);
      schedulesToUpsert.push({
        id: existingId ?? uid(schedSeq++),
        tenant_id: TENANT_ID,
        branch_id: BRANCH_ID,
        specialist_id: specialistId,
        day_of_week: day,
        start_time: "08:00",
        end_time: "18:00",
        is_active: true,
      });
    }
  }
  const { error: schedErr } = await supabase
    .from("specialist_schedules")
    .upsert(schedulesToUpsert, { onConflict: "id" });
  if (schedErr) throw new Error(`specialist_schedules upsert: ${schedErr.message}`);

  // Vincular ambos especialistas a Corte y Ballage
  const { data: existingSpecSvcs, error: ssvcFetchErr } = await supabase
    .from("specialist_services")
    .select("id, specialist_id, service_id")
    .eq("tenant_id", TENANT_ID);
  if (ssvcFetchErr) throw new Error(`specialist_services select: ${ssvcFetchErr.message}`);

  const ssvcMap = new Map(
    (existingSpecSvcs ?? []).map((s) => [`${s.specialist_id}:${s.service_id}`, s.id]),
  );

  const specServicesToUpsert = [];
  let ssvcSeq = 41;
  for (const specialistId of [MIGUEL_ID, JAVIER_ID]) {
    for (const serviceId of [SERVICE_CORTE_ID, SERVICE_BALLAGE_ID]) {
      const existingId = ssvcMap.get(`${specialistId}:${serviceId}`);
      specServicesToUpsert.push({
        id: existingId ?? uid(ssvcSeq++),
        tenant_id: TENANT_ID,
        specialist_id: specialistId,
        service_id: serviceId,
        is_active: true,
      });
    }
  }
  const { error: ssvcErr } = await supabase
    .from("specialist_services")
    .upsert(specServicesToUpsert, { onConflict: "id" });
  if (ssvcErr) throw new Error(`specialist_services upsert: ${ssvcErr.message}`);

  // 3. 6 citas (2 completadas en días previos, 3 hoy, 1 mañana)
  const appointments = [
    {
      id: uid(51),
      tenant_id: TENANT_ID,
      branch_id: BRANCH_ID,
      customer_id: uid(1),
      specialist_id: MIGUEL_ID,
      service_id: SERVICE_BALLAGE_ID,
      scheduled_at: daysAgoIso(2, 10, 0),
      ends_at: daysAgoIso(2, 10, 30),
      duration_minutes: 30,
      estimated_price: 25,
      currency_code: "USD",
      status: "completed",
      completed_at: daysAgoIso(2, 10, 30),
    },
    {
      id: uid(52),
      tenant_id: TENANT_ID,
      branch_id: BRANCH_ID,
      customer_id: uid(2),
      specialist_id: JAVIER_ID,
      service_id: SERVICE_CORTE_ID,
      scheduled_at: daysAgoIso(1, 15, 0),
      ends_at: daysAgoIso(1, 15, 30),
      duration_minutes: 30,
      estimated_price: 5,
      currency_code: "USD",
      status: "completed",
      completed_at: daysAgoIso(1, 15, 30),
    },
    {
      id: uid(53),
      tenant_id: TENANT_ID,
      branch_id: BRANCH_ID,
      customer_id: uid(3),
      specialist_id: MIGUEL_ID,
      service_id: SERVICE_BALLAGE_ID,
      scheduled_at: daysAgoIso(0, 9, 30),
      ends_at: daysAgoIso(0, 10, 0),
      duration_minutes: 30,
      estimated_price: 25,
      currency_code: "USD",
      status: "confirmed",
      confirmed_at: daysAgoIso(1, 18, 0),
    },
    {
      id: uid(54),
      tenant_id: TENANT_ID,
      branch_id: BRANCH_ID,
      customer_id: uid(4),
      specialist_id: JAVIER_ID,
      service_id: SERVICE_BALLAGE_ID,
      scheduled_at: daysAgoIso(0, 14, 0),
      ends_at: daysAgoIso(0, 14, 30),
      duration_minutes: 30,
      estimated_price: 25,
      currency_code: "USD",
      status: "in_progress",
      confirmed_at: daysAgoIso(1, 18, 0),
    },
    {
      id: uid(55),
      tenant_id: TENANT_ID,
      branch_id: BRANCH_ID,
      customer_id: uid(5),
      specialist_id: MIGUEL_ID,
      service_id: SERVICE_CORTE_ID,
      scheduled_at: daysAgoIso(0, 16, 30),
      ends_at: daysAgoIso(0, 17, 0),
      duration_minutes: 30,
      estimated_price: 5,
      currency_code: "USD",
      status: "pending",
    },
    {
      id: uid(56),
      tenant_id: TENANT_ID,
      branch_id: BRANCH_ID,
      customer_id: uid(6),
      specialist_id: JAVIER_ID,
      service_id: SERVICE_BALLAGE_ID,
      scheduled_at: daysAgoIso(-1, 11, 0),
      ends_at: daysAgoIso(-1, 11, 30),
      duration_minutes: 30,
      estimated_price: 25,
      currency_code: "USD",
      status: "confirmed",
      confirmed_at: daysAgoIso(0, 12, 0),
    },
  ];

  const { error: apptErr } = await supabase
    .from("appointments")
    .upsert(appointments, { onConflict: "id" });
  if (apptErr) throw new Error(`appointments upsert: ${apptErr.message}`);

  // 4. Reglas de comisión (30% Miguel, 40% Javier)
  const commissionRules = [
    {
      id: uid(61),
      tenant_id: TENANT_ID,
      specialist_id: MIGUEL_ID,
      scope: "all",
      commission_type: "percentage",
      value: 30,
      currency_code: "USD",
      is_active: true,
      notes: "Regla demo 30% Miguel",
    },
    {
      id: uid(62),
      tenant_id: TENANT_ID,
      specialist_id: JAVIER_ID,
      scope: "all",
      commission_type: "percentage",
      value: 40,
      currency_code: "USD",
      is_active: true,
      notes: "Regla demo 40% Javier Calva",
    },
  ];

  const { error: ruleErr } = await supabase
    .from("commission_rules")
    .upsert(commissionRules, { onConflict: "id" });
  if (ruleErr) throw new Error(`commission_rules upsert: ${ruleErr.message}`);

  // 5. Sesión de caja abierta para Caja Principal Loja
  const { data: cashRegisters, error: crErr } = await supabase
    .from("cash_registers")
    .select("id, name")
    .eq("tenant_id", TENANT_ID)
    .eq("branch_id", BRANCH_ID)
    .limit(1);
  if (crErr) throw new Error(`cash_registers select: ${crErr.message}`);
  if (!cashRegisters?.length) {
    throw new Error("No se encontró cash_registers para dev-test / Loja Centro");
  }
  const cashRegisterId = cashRegisters[0].id;

  const { data: openSessions, error: openSessErr } = await supabase
    .from("cash_register_sessions")
    .select("id")
    .eq("cash_register_id", cashRegisterId)
    .eq("status", "open")
    .limit(1);
  if (openSessErr) throw new Error(`cash_register_sessions select: ${openSessErr.message}`);

  let sessionCreatedOrExisting = openSessions?.[0]?.id ?? null;
  if (!sessionCreatedOrExisting) {
    const sessionId = uid(71);
    const { error: sessErr } = await supabase
      .from("cash_register_sessions")
      .upsert(
        {
          id: sessionId,
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          cash_register_id: cashRegisterId,
          opened_by: JAVIER_ID,
          opening_amount: 100,
          status: "open",
          opened_at: daysAgoIso(0, 8, 0),
          notes: "Sesión demo abierta para presentación",
        },
        { onConflict: "id" },
      );
    if (sessErr) throw new Error(`cash_register_sessions upsert: ${sessErr.message}`);
    sessionCreatedOrExisting = sessionId;
  }

  // 6. 3 comandas (2 paid + 1 sent en caja), sus items, facturas y comisiones
  const orders = [
    {
      id: uid(81),
      tenant_id: TENANT_ID,
      branch_id: BRANCH_ID,
      customer_id: uid(1),
      specialist_id: MIGUEL_ID,
      appointment_id: uid(51),
      status: "paid",
      total: 30,
      currency_code: "USD",
      sent_at: daysAgoIso(2, 10, 35),
      paid_at: daysAgoIso(2, 10, 40),
      notes: "Comanda demo cobrada hace 2 días",
    },
    {
      id: uid(82),
      tenant_id: TENANT_ID,
      branch_id: BRANCH_ID,
      customer_id: uid(2),
      specialist_id: JAVIER_ID,
      status: "paid",
      total: 25,
      currency_code: "USD",
      sent_at: daysAgoIso(0, 11, 15),
      paid_at: daysAgoIso(0, 11, 20),
      notes: "Comanda demo cobrada hoy",
    },
    {
      id: uid(83),
      tenant_id: TENANT_ID,
      branch_id: BRANCH_ID,
      customer_id: uid(3),
      specialist_id: MIGUEL_ID,
      appointment_id: uid(53),
      status: "sent",
      total: 25,
      currency_code: "USD",
      sent_at: daysAgoIso(0, 12, 5),
      notes: "Comanda en caja lista para cobrar en vivo",
    },
  ];

  const { error: ordErr } = await supabase
    .from("orders")
    .upsert(orders, { onConflict: "id" });
  if (ordErr) throw new Error(`orders upsert: ${ordErr.message}`);

  const orderItems = [
    {
      id: uid(91),
      order_id: uid(81),
      item_id: SERVICE_BALLAGE_ID,
      type: "service",
      description: "Ballage",
      quantity: 1,
      unit_price: 25,
      subtotal: 25,
      currency_code: "USD",
      buyer_type: "customer",
    },
    {
      id: uid(92),
      order_id: uid(81),
      item_id: SERVICE_CORTE_ID,
      type: "service",
      description: "Corte de cabello",
      quantity: 1,
      unit_price: 5,
      subtotal: 5,
      currency_code: "USD",
      buyer_type: "customer",
    },
    {
      id: uid(93),
      order_id: uid(82),
      item_id: SERVICE_BALLAGE_ID,
      type: "service",
      description: "Ballage",
      quantity: 1,
      unit_price: 25,
      subtotal: 25,
      currency_code: "USD",
      buyer_type: "customer",
    },
    {
      id: uid(94),
      order_id: uid(83),
      item_id: SERVICE_BALLAGE_ID,
      type: "service",
      description: "Ballage",
      quantity: 1,
      unit_price: 25,
      subtotal: 25,
      currency_code: "USD",
      buyer_type: "customer",
    },
  ];

  const { error: oiErr } = await supabase
    .from("order_items")
    .upsert(orderItems, { onConflict: "id" });
  if (oiErr) throw new Error(`order_items upsert: ${oiErr.message}`);

  const invoices = [
    {
      id: uid(101),
      tenant_id: TENANT_ID,
      branch_id: BRANCH_ID,
      order_id: uid(81),
      appointment_id: uid(51),
      customer_id: uid(1),
      customer_name: "Sofía Mendoza",
      invoice_number: "FAC-DEMO-0001",
      document_type: "invoice",
      type: "full",
      status: "paid",
      subtotal: 30,
      discount_amount: 0,
      tax_amount: 0,
      total: 30,
      amount_local: 30,
      currency_iso: "USD",
      paid_at: daysAgoIso(2, 10, 40),
      created_by: JAVIER_ID,
    },
    {
      id: uid(102),
      tenant_id: TENANT_ID,
      branch_id: BRANCH_ID,
      order_id: uid(82),
      customer_id: uid(2),
      customer_name: "Valentina Cordero",
      invoice_number: "FAC-DEMO-0002",
      document_type: "invoice",
      type: "full",
      status: "paid",
      subtotal: 25,
      discount_amount: 0,
      tax_amount: 0,
      total: 25,
      amount_local: 25,
      currency_iso: "USD",
      paid_at: daysAgoIso(0, 11, 20),
      created_by: JAVIER_ID,
    },
  ];

  const { error: invErr } = await supabase
    .from("invoices")
    .upsert(invoices, { onConflict: "id" });
  if (invErr) throw new Error(`invoices upsert: ${invErr.message}`);

  const commissions = [
    {
      id: uid(111),
      tenant_id: TENANT_ID,
      specialist_id: MIGUEL_ID,
      order_id: uid(81),
      order_item_id: uid(91),
      invoice_id: uid(101),
      rule_id: uid(61),
      commission_type: "percentage",
      commission_rate: 30,
      base_amount: 25,
      commission_amount: 7.5,
      currency_code: "USD",
      status: "approved",
      approved_at: daysAgoIso(1, 9, 0),
      approved_by: JAVIER_ID,
    },
    {
      id: uid(112),
      tenant_id: TENANT_ID,
      specialist_id: MIGUEL_ID,
      order_id: uid(81),
      order_item_id: uid(92),
      invoice_id: uid(101),
      rule_id: uid(61),
      commission_type: "percentage",
      commission_rate: 30,
      base_amount: 5,
      commission_amount: 1.5,
      currency_code: "USD",
      status: "approved",
      approved_at: daysAgoIso(1, 9, 0),
      approved_by: JAVIER_ID,
    },
    {
      id: uid(113),
      tenant_id: TENANT_ID,
      specialist_id: JAVIER_ID,
      order_id: uid(82),
      order_item_id: uid(93),
      invoice_id: uid(102),
      rule_id: uid(62),
      commission_type: "percentage",
      commission_rate: 40,
      base_amount: 25,
      commission_amount: 10,
      currency_code: "USD",
      status: "pending",
    },
  ];

  const { error: commErr } = await supabase
    .from("commissions")
    .upsert(commissions, { onConflict: "id" });
  if (commErr) throw new Error(`commissions upsert: ${commErr.message}`);

  return {
    customers: customers.length,
    specialist_schedules: schedulesToUpsert.length,
    specialist_services: specServicesToUpsert.length,
    appointments: appointments.length,
    commission_rules: commissionRules.length,
    cash_register_session_id: sessionCreatedOrExisting,
    orders: orders.length,
    order_items: orderItems.length,
    invoices: invoices.length,
    commissions: commissions.length,
  };
}
