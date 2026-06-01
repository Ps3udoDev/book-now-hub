// src/app/api/client/profile/avatar/route.ts
// Sube el avatar del cliente a Supabase Storage (bucket "images")
// en la ruta customers/{tenantId}/{customerId}-{uuid}.{ext} y guarda
// la URL en customers.avatar_url.
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireClientCustomer } from "../../_utils";

const BUCKET = "images";
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: NextRequest) {
  const ctx = await requireClientCustomer(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "El campo 'file' es requerido" },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo no permitido. Usa JPG, PNG, WEBP o GIF" },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "El archivo excede 5MB" },
        { status: 400 },
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `customers/${ctx.tenant.id}/${ctx.customer.id}-${crypto.randomUUID()}.${ext}`;

    const admin = supabaseAdmin as any;
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(path, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Error al subir avatar: ${uploadError.message}` },
        { status: 500 },
      );
    }

    const { data: publicUrlData } = admin.storage
      .from(BUCKET)
      .getPublicUrl(path);
    const avatarUrl = publicUrlData.publicUrl as string;

    // Si tenia avatar previo en el mismo bucket, intentar borrarlo
    // (best-effort: no falla si no se puede).
    const previousUrl = ctx.customer.avatar_url;
    if (previousUrl) {
      const marker = `/storage/v1/object/public/${BUCKET}/`;
      const idx = previousUrl.indexOf(marker);
      if (idx !== -1) {
        const previousPath = previousUrl.substring(idx + marker.length);
        await admin.storage.from(BUCKET).remove([previousPath]);
      }
    }

    const { data: customer, error: updateError } = await admin
      .from("customers")
      .update({ avatar_url: avatarUrl })
      .eq("id", ctx.customer.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ customer, avatar_url: avatarUrl });
  } catch (error) {
    console.error("Error in POST /api/client/profile/avatar:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
