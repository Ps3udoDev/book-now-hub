// src/app/api/client/auth/register/route.ts
// Registro de cliente final con email + password.
// Crea el auth.user, envia el correo de verificacion y vincula
// (o crea) un registro en customers para el tenant indicado.
import { type NextRequest, NextResponse } from "next/server";
import {
  createAuthUser,
  getAuthUserByEmail,
  supabaseAdmin,
} from "@/lib/supabase/admin";

interface RegisterBody {
  tenant_slug: string;
  email: string;
  password: string;
  full_name: string;
  phone?: string | null;
  phone_country_code?: string | null;
  preferred_language?: string | null;
  preferred_currency?: string | null;
  marketing_consent?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RegisterBody;

    if (!body.tenant_slug || !body.email || !body.password || !body.full_name) {
      return NextResponse.json(
        {
          error: "Campos requeridos: tenant_slug, email, password, full_name",
        },
        { status: 400 },
      );
    }

    if (body.password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 },
      );
    }

    const admin = supabaseAdmin as any;

    const { data: tenant, error: tenantError } = await admin
      .from("tenants")
      .select("id, slug, status")
      .eq("slug", body.tenant_slug)
      .maybeSingle();

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: "Tenant no encontrado" },
        { status: 404 },
      );
    }

    if (!["active", "trial"].includes(tenant.status)) {
      return NextResponse.json(
        { error: "Este tenant no esta aceptando nuevos registros" },
        { status: 403 },
      );
    }

    const email = body.email.toLowerCase().trim();
    const fullName = body.full_name.trim();
    const phone = body.phone?.replace(/\D/g, "") || null;

    // Si ya existe un auth.user, NO sobrescribir el password.
    // Lo vinculamos al customer (si no esta vinculado) y pedimos
    // que use su login existente.
    let authUser = await getAuthUserByEmail(email);
    let createdAuthUser = false;

    if (!authUser) {
      // email_confirm: false → Supabase envia correo de verificacion.
      // 3.2 pide verificacion obligatoria antes de poder agendar.
      try {
        authUser = await createAuthUser(email, body.password, {
          full_name: fullName,
          tenant_slug: tenant.slug,
          user_type: "customer",
        });
        createdAuthUser = true;
      } catch (error) {
        return NextResponse.json(
          { error: `Error al crear usuario: ${(error as Error).message}` },
          { status: 500 },
        );
      }
    }

    if (!authUser) {
      return NextResponse.json(
        { error: "No se pudo crear el usuario" },
        { status: 500 },
      );
    }

    // get_or_create_customer_for_user busca por user_id, luego por email
    // (vincula si encuentra customer huerfano), o crea uno nuevo.
    const { data: customerId, error: rpcError } = await admin.rpc(
      "get_or_create_customer_for_user",
      {
        p_tenant_id: tenant.id,
        p_user_id: authUser.id,
        p_email: email,
        p_full_name: fullName,
        p_phone: phone,
      },
    );

    if (rpcError) {
      // Rollback solo si nosotros creamos el auth.user en este request
      if (createdAuthUser) {
        await admin.auth.admin.deleteUser(authUser.id);
      }
      return NextResponse.json(
        { error: `Error al crear cliente: ${rpcError.message}` },
        { status: 500 },
      );
    }

    // Aplicar campos de preferencia y phone_country_code que el RPC no setea.
    const updates: Record<string, unknown> = {};
    if (body.phone_country_code) {
      updates.phone_country_code = body.phone_country_code;
    }
    if (body.preferred_language) {
      updates.preferred_language = body.preferred_language;
    }
    if (body.preferred_currency) {
      updates.preferred_currency = body.preferred_currency;
    }
    if (body.marketing_consent !== undefined) {
      updates.accepts_marketing = body.marketing_consent;
    }

    if (Object.keys(updates).length > 0) {
      await admin.from("customers").update(updates).eq("id", customerId);
    }

    return NextResponse.json(
      {
        success: true,
        user_id: authUser.id,
        customer_id: customerId,
        already_existed: !createdAuthUser,
        verification_required: !authUser.email_confirmed_at,
      },
      { status: createdAuthUser ? 201 : 200 },
    );
  } catch (error) {
    console.error("Error in POST /api/client/auth/register:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
