// src/app/api/client/profile/route.ts
// GET/PUT del perfil del cliente autenticado.
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireClientCustomer } from "../_utils";

interface UpdateProfileBody {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string | null;
  phone_country_code?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  address?: string | null;
  city?: string | null;
  preferred_language?: string | null;
  preferred_currency?: string | null;
  preferred_branch_id?: string | null;
  preferred_specialist_id?: string | null;
  marketing_consent?: boolean;
  notify_email?: boolean;
  notify_sms?: boolean;
  notify_whatsapp?: boolean;
}

export async function GET(request: NextRequest) {
  const ctx = await requireClientCustomer(request);
  if (ctx instanceof NextResponse) return ctx;

  return NextResponse.json({
    customer: ctx.customer,
    user: { id: ctx.user.id, email: ctx.user.email },
    tenant: { id: ctx.tenant.id, slug: ctx.tenant.slug, name: ctx.tenant.name },
  });
}

export async function PUT(request: NextRequest) {
  const ctx = await requireClientCustomer(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = (await request.json()) as UpdateProfileBody;
    const updates: Record<string, unknown> = {};

    if (body.first_name !== undefined)
      updates.first_name = body.first_name.trim();
    if (body.last_name !== undefined) updates.last_name = body.last_name.trim();

    // Recalcular full_name si cambia first/last (a menos que llegue explicito).
    if (body.full_name !== undefined) {
      updates.full_name = body.full_name.trim();
    } else if (body.first_name !== undefined || body.last_name !== undefined) {
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
    if (body.birth_date !== undefined) updates.birth_date = body.birth_date;
    if (body.gender !== undefined) updates.gender = body.gender;
    if (body.address !== undefined) updates.address = body.address;
    if (body.city !== undefined) updates.city = body.city;
    if (body.preferred_language !== undefined) {
      updates.preferred_language = body.preferred_language;
    }
    if (body.preferred_currency !== undefined) {
      updates.preferred_currency = body.preferred_currency;
    }
    if (body.preferred_branch_id !== undefined) {
      updates.preferred_branch_id = body.preferred_branch_id;
    }
    if (body.preferred_specialist_id !== undefined) {
      updates.preferred_specialist_id = body.preferred_specialist_id;
    }
    if (body.marketing_consent !== undefined) {
      updates.accepts_marketing = body.marketing_consent;
    }
    if (body.notify_email !== undefined) {
      updates.notify_email = body.notify_email;
    }
    if (body.notify_sms !== undefined) {
      updates.notify_sms = body.notify_sms;
    }
    if (body.notify_whatsapp !== undefined) {
      updates.notify_whatsapp = body.notify_whatsapp;
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
    console.error("Error in PUT /api/client/profile:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
