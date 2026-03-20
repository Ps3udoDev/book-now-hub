// src/app/api/exchange-rates/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";

/**
 * GET /api/exchange-rates?tenant_id=X&from=USD&to=VES
 * Retorna la tasa vigente entre dos monedas para un tenant.
 * Si from === to devuelve rate: 1.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSB();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenant_id");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!tenantId || !from || !to) {
      return NextResponse.json(
        { error: "Parámetros requeridos: tenant_id, from, to" },
        { status: 400 },
      );
    }

    if (from === to) {
      return NextResponse.json({
        rate: 1,
        from_currency: from,
        to_currency: to,
      });
    }

    // Tasa vigente = valid_until IS NULL, la más reciente
    const { data, error } = await supabaseAdmin
      .from("exchange_rates")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("from_currency", from)
      .eq("to_currency", to)
      .is("valid_until", null)
      .order("valid_from", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: `No hay tasa configurada para ${from} → ${to}` },
          { status: 404 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rate: data });
  } catch (error) {
    console.error("Error in GET /api/exchange-rates:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

interface UpdateRateBody {
  tenant_id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
}

/**
 * PUT /api/exchange-rates
 * Actualiza la tasa entre dos monedas para un tenant.
 * Solo owner o admin del tenant pueden ejecutarlo.
 *
 * Lógica:
 *   1. Expirar la tasa vigente (valid_until = now())
 *   2. Insertar nueva fila con valid_from = now(), valid_until = null
 *   3. Registrar en exchange_rate_logs (auditoría manual)
 */
export async function PUT(request: NextRequest) {
  try {
    // 1. Verificar autenticación
    const supabase = await createServerSB();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // 2. Leer body
    const body: UpdateRateBody = await request.json();

    if (
      !body.tenant_id ||
      !body.from_currency ||
      !body.to_currency ||
      body.rate == null
    ) {
      return NextResponse.json(
        {
          error:
            "Campos requeridos: tenant_id, from_currency, to_currency, rate",
        },
        { status: 400 },
      );
    }

    if (body.rate <= 0) {
      return NextResponse.json(
        { error: "La tasa debe ser un número mayor a 0" },
        { status: 400 },
      );
    }

    if (body.from_currency === body.to_currency) {
      return NextResponse.json(
        { error: "Las monedas de origen y destino deben ser diferentes" },
        { status: 400 },
      );
    }

    // 3. Verificar permisos — solo owner o admin del tenant
    const { data: userRole } = await supabaseAdmin
      .from("tenant_users")
      .select("role")
      .eq("auth_user_id", currentUser.id)
      .eq("tenant_id", body.tenant_id)
      .single();

    if (!userRole || !["owner", "admin"].includes(userRole.role)) {
      return NextResponse.json(
        { error: "No tienes permisos para configurar tasas de cambio" },
        { status: 403 },
      );
    }

    // 4. Verificar que ambas monedas existen y están activas
    const { data: currencies } = await supabaseAdmin
      .from("currencies")
      .select("code")
      .in("code", [body.from_currency, body.to_currency])
      .eq("is_active", true);

    const activeCodes = (currencies || []).map((c) => c.code);
    if (!activeCodes.includes(body.from_currency)) {
      return NextResponse.json(
        { error: `Moneda no activa: ${body.from_currency}` },
        { status: 400 },
      );
    }
    if (!activeCodes.includes(body.to_currency)) {
      return NextResponse.json(
        { error: `Moneda no activa: ${body.to_currency}` },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();

    // 5. Obtener la tasa vigente actual (para el log de auditoría)
    const { data: currentRate } = await supabaseAdmin
      .from("exchange_rates")
      .select("id, rate")
      .eq("tenant_id", body.tenant_id)
      .eq("from_currency", body.from_currency)
      .eq("to_currency", body.to_currency)
      .is("valid_until", null)
      .order("valid_from", { ascending: false })
      .limit(1)
      .single();

    // 6. Expirar la tasa vigente anterior (si existe)
    if (currentRate) {
      await supabaseAdmin
        .from("exchange_rates")
        .update({ valid_until: now })
        .eq("id", currentRate.id);
    }

    // 7. Insertar nueva tasa vigente
    const { data: newRate, error: insertError } = await supabaseAdmin
      .from("exchange_rates")
      .insert({
        tenant_id: body.tenant_id,
        from_currency: body.from_currency,
        to_currency: body.to_currency,
        rate: body.rate,
        created_by: currentUser.id,
        valid_from: now,
        valid_until: null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting exchange rate:", insertError);
      return NextResponse.json(
        { error: `Error al guardar tasa: ${insertError.message}` },
        { status: 500 },
      );
    }

    // 8. Registrar en log de auditoría
    await supabaseAdmin.from("exchange_rate_logs").insert({
      tenant_id: body.tenant_id,
      from_currency: body.from_currency,
      to_currency: body.to_currency,
      old_rate: currentRate?.rate ?? null,
      new_rate: body.rate,
      changed_by: currentUser.id,
    });

    return NextResponse.json({ success: true, rate: newRate });
  } catch (error) {
    console.error("Error in PUT /api/exchange-rates:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
