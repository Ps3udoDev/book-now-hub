// src/app/api/tenant/account/avatar/route.ts
// Sube el avatar del usuario del panel a Supabase Storage (bucket "images")
// en tenant-users/{tenantId}/{userId}-{uuid}.{ext} y guarda la URL en
// tenant_users.avatar_url. El registro se deriva de la sesión.
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantUser } from "@/lib/api/tenant-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const BUCKET = "images";
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const tenantIdRaw = formData.get("tenant_id");
  const tenantId = typeof tenantIdRaw === "string" ? tenantIdRaw : null;

  const auth = await requireTenantUser(tenantId);
  if (!auth.ok || !auth.tenantUser) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

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

  try {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `tenant-users/${auth.tenantUser.tenant_id}/${auth.tenantUser.id}-${crypto.randomUUID()}.${ext}`;

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

    // Best-effort: borrar el avatar previo si estaba en el mismo bucket.
    const previousUrl = auth.tenantUser.avatar_url;
    if (previousUrl) {
      const marker = `/storage/v1/object/public/${BUCKET}/`;
      const idx = previousUrl.indexOf(marker);
      if (idx !== -1) {
        const previousPath = previousUrl.substring(idx + marker.length);
        await admin.storage.from(BUCKET).remove([previousPath]);
      }
    }

    const { data: tenantUser, error: updateError } = await admin
      .from("tenant_users")
      .update({ avatar_url: avatarUrl })
      .eq("id", auth.tenantUser.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ tenantUser, avatar_url: avatarUrl });
  } catch (error) {
    console.error("Error in POST /api/tenant/account/avatar:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
