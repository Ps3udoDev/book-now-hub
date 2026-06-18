import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Customer } from "@/types";

interface EnsureClientCustomerParams {
  tenantId: string;
  userId: string;
  email: string | null;
  fullName: string;
  phone?: string | null;
}

function splitCustomerName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() ?? "Cliente";
  const lastName = parts.join(" ");

  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
  };
}

export async function ensureClientCustomer({
  tenantId,
  userId,
  email,
  fullName,
  phone,
}: EnsureClientCustomerParams): Promise<Customer> {
  const normalizedEmail = email?.toLowerCase().trim() || null;
  const normalizedPhone = phone?.replace(/\D/g, "") || null;
  const name = splitCustomerName(fullName);

  const { data: existingByUser, error: existingByUserError } =
    await supabaseAdmin
      .from("customers")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .maybeSingle();

  if (existingByUserError) {
    throw existingByUserError;
  }

  if (existingByUser) {
    return existingByUser as Customer;
  }

  if (normalizedEmail) {
    const { data: existingByEmail, error: existingByEmailError } =
      await supabaseAdmin
        .from("customers")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("email", normalizedEmail)
        .limit(1)
        .maybeSingle();

    if (existingByEmailError) {
      throw existingByEmailError;
    }

    if (existingByEmail) {
      const updates: Record<string, unknown> = { user_id: userId };

      if (!existingByEmail.first_name) updates.first_name = name.firstName;
      if (existingByEmail.last_name === null) updates.last_name = name.lastName;
      if (!existingByEmail.full_name) updates.full_name = name.fullName;
      if (!existingByEmail.phone && normalizedPhone) {
        updates.phone = normalizedPhone;
      }

      const { data: linkedCustomer, error: linkedCustomerError } =
        await supabaseAdmin
          .from("customers")
          .update(updates)
          .eq("id", existingByEmail.id)
          .select()
          .single();

      if (linkedCustomerError) {
        throw linkedCustomerError;
      }

      return linkedCustomer as Customer;
    }
  }

  const { data: customer, error: customerError } = await supabaseAdmin
    .from("customers")
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      email: normalizedEmail,
      first_name: name.firstName,
      last_name: name.lastName,
      full_name: name.fullName,
      phone: normalizedPhone,
      is_active: true,
    })
    .select()
    .single();

  if (customerError) {
    throw customerError;
  }

  return customer as Customer;
}
