// src/app/c/[tenant]/page.tsx
// Home del cliente final (3.4): saludo personalizado, tarjeta de proxima cita,
// favoritos, historial reciente y CTA para agendar.
"use client";

import { Bell, LogOut, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FavoritesSection } from "@/components/client/favorites-section";
import { NextAppointmentCard } from "@/components/client/next-appointment-card";
import { RecentHistorySection } from "@/components/client/recent-history-section";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useClientDashboard,
  useClientFavorites,
} from "@/hooks/supabase/use-client-profile";
import { clientAuthService } from "@/lib/services/client-auth";
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
  const router = useRouter();
  const { tenantSlug, customer, tenantName, isLoading } = useClientTenant();
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

  const handleLogout = async () => {
    await clientAuthService.signOut();
    router.replace(`/c/${tenantSlug}/login`);
  };

  if (isLoading || dashboardLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-40" />
            </div>
          </div>
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <Link
          href={`/c/${tenantSlug}/perfil`}
          className="flex items-center gap-3 group"
        >
          <Avatar className="h-12 w-12 ring-2 ring-transparent group-hover:ring-primary/30 transition-all">
            <AvatarImage src={customer?.avatar_url ?? undefined} />
            <AvatarFallback>{getInitials(firstName || "U")}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm text-muted-foreground">
              {getGreeting()}
              {tenantName ? ` · ${tenantName}` : ""}
            </p>
            <p className="font-semibold leading-tight">
              {firstName ? `Hola, ${firstName}` : "Bienvenido"}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Notificaciones"
            className="relative"
          >
            <Bell className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Cerrar sesión"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <NextAppointmentCard appointment={next ?? null} tenantSlug={tenantSlug} />

      {next ? (
        <Link href={`/c/${tenantSlug}/servicios`} className="block">
          <Button size="lg" className="w-full">
            <Sparkles className="h-4 w-4 mr-2" />
            Agendar otra cita
          </Button>
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
