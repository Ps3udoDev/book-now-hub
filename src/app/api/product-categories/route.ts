import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";
import {
  requireProductWriteAccess,
  requireTenantAccess,
} from "../products/_utils";

interface CreateCategoryBody {
  tenant_id: string;
  name: string;
  icon?: string | null;
  sort_order?: number | null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSB();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenant_id");

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenant_id es requerido" },
        { status: 400 },
      );
    }

    const access = await requireTenantAccess(tenantId, user.id);
    if (access instanceof NextResponse) return access;

    const admin = supabaseAdmin as any;
    const { data: categories, error } = await admin
      .from("product_categories")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Conteo de productos por categoría (se enlazan por nombre) para mostrar
    // uso y advertir al borrar.
    const { data: products } = await admin
      .from("products")
      .select("category")
      .eq("tenant_id", tenantId);

    const counts = new Map<string, number>();
    for (const row of (products || []) as { category: string | null }[]) {
      if (!row.category) continue;
      counts.set(row.category, (counts.get(row.category) || 0) + 1);
    }

    const enriched = ((categories || []) as { name: string }[]).map(
      (category) => ({
        ...category,
        product_count: counts.get(category.name) || 0,
      }),
    );

    return NextResponse.json({ categories: enriched });
  } catch (error) {
    console.error("Error in GET /api/product-categories:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSB();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = (await request.json()) as CreateCategoryBody;

    if (!body.tenant_id || !body.name?.trim()) {
      return NextResponse.json(
        { error: "Campos requeridos: tenant_id, name" },
        { status: 400 },
      );
    }

    const access = await requireProductWriteAccess(body.tenant_id, user.id);
    if (access instanceof NextResponse) return access;

    const admin = supabaseAdmin as any;
    const name = body.name.trim();

    const { data: existing } = await admin
      .from("product_categories")
      .select("id")
      .eq("tenant_id", body.tenant_id)
      .ilike("name", name)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una categoría con ese nombre" },
        { status: 409 },
      );
    }

    const { data: category, error } = await admin
      .from("product_categories")
      .insert({
        tenant_id: body.tenant_id,
        name,
        icon: body.icon?.trim() || null,
        sort_order: body.sort_order ?? 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/product-categories:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
