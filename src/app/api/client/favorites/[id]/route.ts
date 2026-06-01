// src/app/api/client/favorites/[id]/route.ts
// DELETE: quita un favorito por su id (solo si pertenece al cliente).
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireClientCustomer } from "../../_utils";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireClientCustomer(request);
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;
  const admin = supabaseAdmin as any;

  const { data: favorite, error: fetchError } = await admin
    .from("customer_favorites")
    .select("id, customer_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!favorite) {
    return NextResponse.json(
      { error: "Favorito no encontrado" },
      { status: 404 },
    );
  }

  if ((favorite as { customer_id: string }).customer_id !== ctx.customer.id) {
    return NextResponse.json(
      { error: "No puedes eliminar este favorito" },
      { status: 403 },
    );
  }

  const { error: deleteError } = await admin
    .from("customer_favorites")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
