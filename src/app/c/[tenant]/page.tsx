// src/app/c/[tenant]/page.tsx
// Home del cliente final, fiel al prototipo: saludo + avatar + campana,
// hero de proxima cita (variante por template), favoritos y recientes.
"use client";

import { Bell, Sparkles } from "lucide-react";
import Link from "next/link";
import { FavoritesSection } from "@/components/client/favorites-section";
import { NextAppointmentCard } from "@/components/client/next-appointment-card";
import { RecentHistorySection } from "@/components/client/recent-history-section";
import {
  ClientButton,
  displayStyle,
  useClientTheme,
} from "@/components/client/themed";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useClientDashboard,
  useClientFavorites,
} from "@/hooks/supabase/use-client-profile";
import { useClientTenant } from "@/providers/client-tenant-provider";
import type {
  CustomerDashboardNextAppointment,
  CustomerDashboardPastAppointment,
} from "@/types";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default function ClientHomePage() {
  const { tenantSlug, customer, tenantName, isLoading } = useClientTenant();
  const { isBarber, brandName } = useClientTheme();
  const { dashboard, isLoading: dashboardLoading } =
    useClientDashboard(tenantSlug);
  const { favorites, isLoading: favoritesLoading } =
    useClientFavorites(tenantSlug);

  const firstName = customer?.first_name ?? customer?.full_name ?? "";

  const next = dashboard?.next_appointment as
    | CustomerDashboardNextAppointment
    | null
    | undefined;
  const lastAppointments =
    (dashboard?.last_5_appointments as
      | CustomerDashboardPastAppointment[]
      | null
      | undefined) ?? [];

  if (isLoading || dashboardLoading) {
    return (
      <div className="mx-auto max-w-md space-y-6 px-5 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-5 w-40" />
            </div>
          </div>
          <Skeleton className="h-11 w-11 rounded-full" />
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 px-5 pb-28 pt-4">
      <header className="flex items-center justify-between">
        <Link
          href={`/c/${tenantSlug}/perfil`}
          className="group flex items-center gap-3"
        >
          <Avatar className="h-11 w-11 border border-[var(--client-border)]">
            <AvatarImage src={customer?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-[var(--client-surface-alt)] text-[var(--client-fg)]">
              {getInitials(firstName || "U")}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-[12.5px] text-[var(--client-fg-muted)]">
              {getGreeting()}
              {brandName || tenantName ? ` · ${brandName ?? tenantName}` : ""}
            </p>
            <p
              className="text-[19px] font-semibold leading-tight text-[var(--client-fg)]"
              style={displayStyle(isBarber)}
            >
              {firstName || "Bienvenido"}
            </p>
          </div>
        </Link>

        <button
          type="button"
          aria-label="Notificaciones"
          className="relative grid h-11 w-11 place-items-center rounded-full border border-[var(--client-border)] bg-[var(--client-surface)] text-[var(--client-fg)]"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-2.5 top-2 h-2 w-2 rounded-full border-2 border-[var(--client-surface)] bg-[var(--client-accent)]" />
        </button>
      </header>

      <NextAppointmentCard appointment={next ?? null} tenantSlug={tenantSlug} />

      {next ? (
        <Link href={`/c/${tenantSlug}/servicios`} className="block">
          <ClientButton className="w-full">
            <Sparkles className="h-4 w-4" />
            Agendar otra cita
          </ClientButton>
        </Link>
      ) : null}

      <FavoritesSection
        favorites={favorites}
        tenantSlug={tenantSlug}
        isLoading={favoritesLoading}
      />

      <RecentHistorySection
        appointments={lastAppointments}
        tenantSlug={tenantSlug}
      />
    </div>
  );
}
