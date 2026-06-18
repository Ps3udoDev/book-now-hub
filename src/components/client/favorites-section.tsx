// src/components/client/favorites-section.tsx
// Rail de favoritos del dashboard, con la estetica del prototipo.
"use client";

import { Heart, Package, Sparkles, Star, User } from "lucide-react";
import Link from "next/link";
import {
  ClientButton,
  ClientCard,
  SectionHeading,
} from "@/components/client/themed";
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

const TYPE_LABEL = {
  service: "Servicio",
  product: "Producto",
  specialist: "Especialista",
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
    <section>
      <SectionHeading
        title="Favoritos"
        action={favorites.length > 0 ? "Ver todo" : undefined}
        href={`/c/${tenantSlug}/servicios`}
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 animate-pulse rounded-2xl bg-[var(--client-surface-alt)]" />
          <div className="h-24 animate-pulse rounded-2xl bg-[var(--client-surface-alt)]" />
        </div>
      ) : favorites.length === 0 ? (
        <ClientCard className="space-y-2.5 border-dashed px-5 py-8 text-center">
          <Star className="mx-auto h-6 w-6 text-[var(--client-fg-faint)]" />
          <p className="text-sm text-[var(--client-fg-muted)]">
            Aún no tienes favoritos. Marca con el corazón los servicios o
            productos que más te gusten.
          </p>
          <Link href={`/c/${tenantSlug}/servicios`} className="inline-block">
            <ClientButton variant="ghost" className="h-9 px-4 text-[13px]">
              Explorar servicios
            </ClientButton>
          </Link>
        </ClientCard>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {favorites.slice(0, 4).map((favorite) => {
            const Icon = ICON_BY_TYPE[favorite.entity_type] ?? Heart;
            return (
              <Link
                key={favorite.id}
                href={getEntityHref(favorite, tenantSlug)}
                className="group border border-[var(--client-border)] bg-[var(--client-surface)] p-3.5 shadow-[var(--client-shadow-soft)] transition-colors hover:bg-[var(--client-surface-alt)]"
                style={{ borderRadius: "var(--client-rad-lg)" }}
              >
                <span
                  className="mb-2.5 grid h-9 w-9 place-items-center bg-[var(--client-surface-alt)] text-[var(--client-accent)]"
                  style={{ borderRadius: "var(--client-rad-md)" }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <p className="truncate text-sm font-semibold text-[var(--client-fg)]">
                  {getEntityName(favorite)}
                </p>
                <p className="text-xs text-[var(--client-fg-muted)]">
                  {TYPE_LABEL[favorite.entity_type] ?? "Favorito"}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
