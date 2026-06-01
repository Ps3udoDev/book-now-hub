// src/app/api/cafe/menu/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * GET /api/cafe/menu?tenant_id=...&branch_id=...
 * Menu publico agrupado por categoria. Solo items disponibles + activos.
 * No requiere auth (lo consume la app del cliente).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenant_id");
    const branchId = searchParams.get("branch_id");

    if (!tenantId || !branchId) {
      return NextResponse.json(
        { error: "tenant_id y branch_id son requeridos" },
        { status: 400 },
      );
    }

    const [
      { data: categories, error: catError },
      { data: items, error: itemsError },
    ] = await Promise.all([
      supabaseAdmin
        .from("menu_categories")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .or(`branch_id.is.null,branch_id.eq.${branchId}`)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabaseAdmin
        .from("menu_items")
        .select("*, images:menu_item_images(*)")
        .eq("tenant_id", tenantId)
        .eq("branch_id", branchId)
        .eq("is_available", true)
        .eq("is_active", true)
        .order("name", { ascending: true }),
    ]);

    if (catError || itemsError) {
      return NextResponse.json(
        { error: catError?.message || itemsError?.message },
        { status: 500 },
      );
    }

    type RawItem = { id: string; category_id: string | null };
    const byCategory = new Map<string, RawItem[]>();
    for (const it of (items as unknown as RawItem[]) || []) {
      const key = it.category_id ?? "__no_category__";
      const bucket = byCategory.get(key) ?? [];
      bucket.push(it);
      byCategory.set(key, bucket);
    }

    type RawCategory = { id: string; [key: string]: unknown };
    type GroupedCategory = RawCategory & {
      items: RawItem[];
      tenant_id?: string;
      branch_id?: string | null;
      name?: string;
      icon?: string | null;
      sort_order?: number;
      is_active?: boolean;
    };

    const grouped: GroupedCategory[] = (
      (categories as unknown as RawCategory[]) || []
    ).map((cat) => ({ ...cat, items: byCategory.get(cat.id) ?? [] }));

    const orphan = byCategory.get("__no_category__");
    if (orphan && orphan.length > 0) {
      grouped.push({
        id: "__no_category__",
        tenant_id: tenantId,
        branch_id: branchId,
        name: "Otros",
        icon: null,
        sort_order: 9999,
        is_active: true,
        items: orphan,
      });
    }

    return NextResponse.json({
      menu: grouped.filter(
        (g) => Array.isArray(g.items) && (g.items as unknown[]).length > 0,
      ),
    });
  } catch (err) {
    console.error("Error in GET /api/cafe/menu:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
