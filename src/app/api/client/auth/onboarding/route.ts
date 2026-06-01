// src/app/api/client/auth/onboarding/route.ts
// Completa el perfil de un cliente recien registrado:
// nombre, telefono, preferencias de comunicacion.
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireClientCustomer } from "../../_utils";

interface OnboardingBody {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string | null;
  phone_country_code?: string | null;
  preferred_language?: string | null;
  preferred_currency?: string | null;
  marketing_consent?: boolean;
  preferred_branch_id?: string | null;
}

export async function POST(request: NextRequest) {
  const ctx = await requireClientCustomer(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = (await request.json()) as OnboardingBody;
    const updates: Record<string, unknown> = {};

    if (body.first_name !== undefined) {
      updates.first_name = body.first_name.trim();
    }
    if (body.last_name !== undefined) {
      updates.last_name = body.last_name.trim();
    }
    if (body.full_name !== undefined) {
      updates.full_name = body.full_name.trim();
    } else if (body.first_name || body.last_name) {
      const first = body.first_name?.trim() ?? ctx.customer.first_name;
      const last = body.last_name?.trim() ?? ctx.customer.last_name;
      updates.full_name = `${first} ${last}`.trim();
    }
    if (body.phone !== undefined) {
      updates.phone = body.phone?.replace(/\D/g, "") || null;
    }
    if (body.phone_country_code !== undefined) {
      updates.phone_country_code = body.phone_country_code;
    }
    if (body.preferred_language !== undefined) {
      updates.preferred_language = body.preferred_language;
    }
    if (body.preferred_currency !== undefined) {
      updates.preferred_currency = body.preferred_currency;
    }
    if (body.marketing_consent !== undefined) {
      updates.accepts_marketing = body.marketing_consent;
    }
    if (body.preferred_branch_id !== undefined) {
      updates.preferred_branch_id = body.preferred_branch_id;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ customer: ctx.customer });
    }

    const admin = supabaseAdmin as any;
    const { data: customer, error } = await admin
      .from("customers")
      .update(updates)
      .eq("id", ctx.customer.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ customer });
  } catch (error) {
    console.error("Error in POST /api/client/auth/onboarding:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
