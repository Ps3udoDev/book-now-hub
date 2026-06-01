// src/app/api/client/favorites/route.ts
// GET: lista favoritos del cliente, hidratados con la entidad referenciada
// (service / product / specialist) cuando aplica.
// POST: agrega un favorito.
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { FavoriteEntityType } from "@/types";
import { requireClientCustomer } from "../_utils";

interface AddFavoriteBody {
  entity_type: FavoriteEntityType;
  entity_id: string;
}

const VALID_TYPES: FavoriteEntityType[] = ["service", "product", "specialist"];

export async function GET(request: NextRequest) {
  const ctx = await requireClientCustomer(request);
  if (ctx instanceof NextResponse) return ctx;

  const admin = supabaseAdmin as any;

  const { data: favorites, error } = await admin
    .from("customer_favorites")
    .select("*")
    .eq("customer_id", ctx.customer.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Hidratar entidades por tipo (3 queries pequenas en paralelo)
  const list = (favorites || []) as Array<{
    id: string;
    entity_type: FavoriteEntityType;
    entity_id: string;
    created_at: string | null;
  }>;
  const serviceIds = list
    .filter((f) => f.entity_type === "service")
    .map((f) => f.entity_id);
  const productIds = list
    .filter((f) => f.entity_type === "product")
    .map((f) => f.entity_id);
  const specialistIds = list
    .filter((f) => f.entity_type === "specialist")
    .map((f) => f.entity_id);

  const [services, products, specialists] = await Promise.all([
    serviceIds.length
      ? admin
          .from("services")
          .select(
            "id, name, slug, base_price, currency_code, duration_minutes, image_url, category",
          )
          .in("id", serviceIds)
      : Promise.resolve({ data: [] }),
    productIds.length
      ? admin
          .from("products")
          .select("id, name, price, currency_iso, category, brand")
          .in("id", productIds)
      : Promise.resolve({ data: [] }),
    specialistIds.length
      ? admin
          .from("profiles")
          .select("id, full_name, avatar_url, rating, total_ratings, bio")
          .in("id", specialistIds)
      : Promise.resolve({ data: [] }),
  ]);

  const servicesMap = new Map<string, unknown>();
  for (const s of (services.data as Array<{ id: string }>) || [])
    servicesMap.set(s.id, s);
  const productsMap = new Map<string, unknown>();
  for (const p of (products.data as Array<{ id: string }>) || [])
    productsMap.set(p.id, p);
  const specialistsMap = new Map<string, unknown>();
  for (const sp of (specialists.data as Array<{ id: string }>) || [])
    specialistsMap.set(sp.id, sp);

  const enriched = list.map((favorite) => {
    let entity: unknown = null;
    if (favorite.entity_type === "service") {
      entity = servicesMap.get(favorite.entity_id) ?? null;
    } else if (favorite.entity_type === "product") {
      entity = productsMap.get(favorite.entity_id) ?? null;
    } else if (favorite.entity_type === "specialist") {
      entity = specialistsMap.get(favorite.entity_id) ?? null;
    }
    return { ...favorite, entity };
  });

  return NextResponse.json({ favorites: enriched });
}

export async function POST(request: NextRequest) {
  const ctx = await requireClientCustomer(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = (await request.json()) as AddFavoriteBody;

    if (!body.entity_type || !body.entity_id) {
      return NextResponse.json(
        { error: "entity_type y entity_id son requeridos" },
        { status: 400 },
      );
    }

    if (!VALID_TYPES.includes(body.entity_type)) {
      return NextResponse.json(
        { error: "entity_type invalido" },
        { status: 400 },
      );
    }

    const admin = supabaseAdmin as any;

    // Validar que la entidad pertenece al mismo tenant del customer.
    const tenantTable =
      body.entity_type === "service"
        ? "services"
        : body.entity_type === "product"
          ? "products"
          : "profiles";

    const { data: entity, error: entityError } = await admin
      .from(tenantTable)
      .select("id, tenant_id")
      .eq("id", body.entity_id)
      .maybeSingle();

    if (entityError || !entity) {
      return NextResponse.json(
        { error: "La entidad referenciada no existe" },
        { status: 404 },
      );
    }

    if ((entity as { tenant_id: string }).tenant_id !== ctx.tenant.id) {
      return NextResponse.json(
        { error: "La entidad no pertenece a este tenant" },
        { status: 403 },
      );
    }

    const { data: favorite, error } = await admin
      .from("customer_favorites")
      .insert({
        tenant_id: ctx.tenant.id,
        customer_id: ctx.customer.id,
        entity_type: body.entity_type,
        entity_id: body.entity_id,
      })
      .select()
      .single();

    if (error) {
      // Conflicto por unique (customer_id, entity_type, entity_id)
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Ya esta en favoritos" },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ favorite }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/client/favorites:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
