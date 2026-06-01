// src/components/client/favorites-section.tsx
"use client";

import { Heart, Package, Sparkles, Star, User } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ClientFavoriteWithEntity } from "@/lib/services/client-profile";

interface FavoritesSectionProps {
  favorites: ClientFavoriteWithEntity[];
  tenantSlug: string;
  isLoading: boolean;
}

const ICON_BY_TYPE = {
  service: Sparkles,
  product: Package,
  specialist: User,
} as const;

function getEntityName(favorite: ClientFavoriteWithEntity): string {
  const entity = favorite.entity as {
    name?: string;
    full_name?: string;
  } | null;
  return entity?.name ?? entity?.full_name ?? "Sin nombre";
}

function getEntityHref(
  favorite: ClientFavoriteWithEntity,
  tenantSlug: string,
): string {
  if (favorite.entity_type === "service") {
    return `/c/${tenantSlug}/servicios/${favorite.entity_id}`;
  }
  if (favorite.entity_type === "product") {
    return `/c/${tenantSlug}/productos/${favorite.entity_id}`;
  }
  return `/c/${tenantSlug}/especialistas/${favorite.entity_id}`;
}

export function FavoritesSection({
  favorites,
  tenantSlug,
  isLoading,
}: FavoritesSectionProps) {
  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />
          Tus favoritos
        </h3>
        {favorites.length > 0 ? (
          <Link
            href={`/c/${tenantSlug}/favoritos`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Ver todos
          </Link>
        ) : null}
      </header>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 rounded-xl bg-muted animate-pulse" />
          <div className="h-24 rounded-xl bg-muted animate-pulse" />
        </div>
      ) : favorites.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="text-center py-8 space-y-2">
            <Star className="h-6 w-6 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              Aún no tienes favoritos. Marca con el corazón los servicios o
              productos que más te gusten.
            </p>
            <Link href={`/c/${tenantSlug}/servicios`}>
              <Button variant="outline" size="sm" className="mt-2">
                Explorar servicios
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {favorites.slice(0, 4).map((favorite) => {
            const Icon = ICON_BY_TYPE[favorite.entity_type] ?? Heart;
            return (
              <Link
                key={favorite.id}
                href={getEntityHref(favorite, tenantSlug)}
                className="group rounded-xl border p-3 hover:bg-accent/50 transition-colors"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2 group-hover:scale-105 transition-transform">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="font-medium text-sm truncate">
                  {getEntityName(favorite)}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {favorite.entity_type === "service"
                    ? "Servicio"
                    : favorite.entity_type === "product"
                      ? "Producto"
                      : "Especialista"}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
