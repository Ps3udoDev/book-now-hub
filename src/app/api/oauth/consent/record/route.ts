import { type NextRequest, NextResponse } from "next/server";
import { mcpDb } from "@/lib/mcp/db";
import { createServerSB } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ROLES = new Set(["owner", "admin", "manager"]);

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSB();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "No autenticado. Por favor inicia sesión." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { tenant_id, client_id, client_name, scopes } = body;

    if (!tenant_id || !client_id) {
      return NextResponse.json(
        { error: "Faltan parámetros obligatorios: tenant_id y client_id." },
        { status: 400 },
      );
    }

    // 1. Validar que el usuario pertenezca a ese tenant con rol permitido
    const { data: tenantUser, error: tuErr } = await mcpDb
      .from("tenant_users")
      .select("role, is_active")
      .eq("tenant_id", tenant_id)
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (tuErr || !tenantUser || tenantUser.is_active === false) {
      return NextResponse.json(
        { error: "No tienes una membresía activa en el tenant seleccionado." },
        { status: 403 },
      );
    }

    const role = String(tenantUser.role);
    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json(
        {
          error: `El rol '${role}' no está autorizado para conectar clientes MCP (se requiere owner, admin o manager).`,
        },
        { status: 403 },
      );
    }

    // 2. Guardar o reactivar conexión en mcp_connections
    const { error: upsertErr } = await mcpDb.from("mcp_connections").upsert(
      {
        tenant_id,
        auth_user_id: user.id,
        oauth_client_id: client_id,
        client_name: client_name || "Cliente MCP",
        scopes: Array.isArray(scopes) ? scopes : [],
        status: "active",
        revoked_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,auth_user_id,oauth_client_id" },
    );

    if (upsertErr) {
      return NextResponse.json(
        { error: `Error guardando la conexión: ${upsertErr.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
