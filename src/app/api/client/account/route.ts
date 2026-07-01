// src/app/api/client/account/route.ts
// DELETE: el cliente elimina su propia cuenta (tarea 3.8).
// Estrategia: soft-delete del customer (is_active=false + desvincula user_id)
// para preservar el historico de citas/ordenes, y borra el usuario de auth
// para que no pueda volver a iniciar sesion.
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireClientCustomer } from "../_utils";

export async function DELETE(request: NextRequest) {
  const ctx = await requireClientCustomer(request);
  if (ctx instanceof NextResponse) return ctx;

  // 1) Desvincula y desactiva el customer (conserva historico).
  const { error: updateError } = await supabaseAdmin
    .from("customers")
    .update({ is_active: false, user_id: null })
    .eq("id", ctx.customer.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // 2) Limpia favoritos del cliente (ya no aplican).
  await supabaseAdmin
    .from("customer_favorites")
    .delete()
    .eq("customer_id", ctx.customer.id);

  // 3) Borra el usuario de auth para impedir nuevos inicios de sesion.
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(
    ctx.user.id,
  );

  if (authError) {
    // El customer ya quedo desvinculado; reportamos pero no revertimos.
    return NextResponse.json(
      {
        error: `Cuenta desvinculada pero no se pudo borrar el acceso: ${authError.message}`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
