// src/app/c/[tenant]/perfil/page.tsx
// Perfil del cliente final, fiel al prototipo: card de usuario, stats,
// preferencias y cierre de sesion.
"use client";

import {
  Bell,
  CalendarDays,
  ChevronRight,
  Globe,
  Heart,
  LogOut,
  Pencil,
  Phone,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
  ClientCard,
  displayStyle,
  ScreenHeader,
  SectionHeading,
  useClientTheme,
} from "@/components/client/themed";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useClientFavorites,
  useClientHistory,
} from "@/hooks/supabase/use-client-profile";
import { clientAuthService } from "@/lib/services/client-auth";
import { useClientTenant } from "@/providers/client-tenant-provider";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function ClientProfilePage() {
  const router = useRouter();
  const { tenantSlug, customer, userEmail, isLoading } = useClientTenant();
  const { isBarber } = useClientTheme();
  const { favorites } = useClientFavorites(tenantSlug);
  const { pagination } = useClientHistory(tenantSlug, {
    page: 1,
    pageSize: 1,
  });

  const fullName =
    customer?.full_name ||
    `${customer?.first_name ?? ""} ${customer?.last_name ?? ""}`.trim() ||
    "Cliente";

  const handleLogout = async () => {
    await clientAuthService.signOut();
    router.replace(`/c/${tenantSlug}/login`);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-5 py-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-5 px-5 pb-28 pt-4">
      <ScreenHeader title="Perfil" />

      {/* Card de usuario */}
      <Link href={`/c/${tenantSlug}/onboarding`} className="block">
        <ClientCard className="flex items-center gap-3.5 p-4 transition-colors hover:bg-[var(--client-surface-alt)]">
          <Avatar className="h-[60px] w-[60px] border-2 border-[var(--client-surface)] shadow-[var(--client-shadow-soft)]">
            <AvatarImage src={customer?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-[var(--client-primary)] text-lg text-[var(--client-primary-fg)]">
              {getInitials(fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-lg font-semibold text-[var(--client-fg)]"
              style={displayStyle(isBarber)}
            >
              {fullName}
            </p>
            <p className="mt-0.5 truncate text-[12.5px] text-[var(--client-fg-muted)]">
              {userEmail ?? ""}
              {customer?.phone ? ` · ${customer.phone}` : ""}
            </p>
          </div>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--client-border)] text-[var(--client-fg)]">
            <Pencil className="h-3.5 w-3.5" />
          </span>
        </ClientCard>
      </Link>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2.5">
        <StatCard label="Citas" value={pagination?.total ?? 0} />
        <StatCard label="Favoritos" value={favorites.length} />
        <StatCard
          label="Idioma"
          value={(customer?.preferred_language ?? "es").toUpperCase()}
        />
      </div>

      {/* Accesos */}
      <section>
        <SectionHeading title="Tu actividad" />
        <ClientCard className="overflow-hidden">
          <ProfileRow
            href={`/c/${tenantSlug}/historial`}
            icon={<CalendarDays className="h-4 w-4" />}
            label="Mis citas"
          />
          <ProfileRow
            href={`/c/${tenantSlug}/servicios`}
            icon={<Heart className="h-4 w-4" />}
            label="Reservar un servicio"
            last
          />
        </ClientCard>
      </section>

      {/* Preferencias */}
      <section>
        <SectionHeading title="Preferencias" />
        <ClientCard className="overflow-hidden">
          <ProfileRow
            href={`/c/${tenantSlug}/onboarding`}
            icon={<Globe className="h-4 w-4" />}
            label="Idioma"
            value={
              customer?.preferred_language === "en" ? "English" : "Español"
            }
          />
          <ProfileRow
            href={`/c/${tenantSlug}/onboarding`}
            icon={<Phone className="h-4 w-4" />}
            label="Teléfono"
            value={customer?.phone ?? "Sin registrar"}
          />
          <ProfileRow
            href={`/c/${tenantSlug}/onboarding`}
            icon={<Bell className="h-4 w-4" />}
            label="Promociones"
            value={customer?.accepts_marketing ? "Activadas" : "Desactivadas"}
            last
          />
        </ClientCard>
      </section>

      {/* Logout */}
      <ClientCard className="overflow-hidden">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[#c95a4a] transition-colors hover:bg-[var(--client-surface-alt)]"
        >
          <span
            className="grid h-8 w-8 place-items-center bg-[var(--client-surface-alt)]"
            style={{ borderRadius: "var(--client-rad-sm)" }}
          >
            <LogOut className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold">Cerrar sesión</span>
        </button>
      </ClientCard>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div
      className="border border-[var(--client-border)] bg-[var(--client-surface)] p-3.5 text-center"
      style={{ borderRadius: "var(--client-rad-md)" }}
    >
      <p
        className="text-[22px] font-bold text-[var(--client-fg)]"
        style={{ fontFamily: "var(--client-font-display)" }}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] uppercase tracking-wide text-[var(--client-fg-muted)]">
        {label}
      </p>
    </div>
  );
}

function ProfileRow({
  href,
  icon,
  label,
  value,
  last,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  value?: string;
  last?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--client-surface-alt)]"
      style={
        last ? undefined : { borderBottom: "1px solid var(--client-border)" }
      }
    >
      <span
        className="grid h-8 w-8 shrink-0 place-items-center bg-[var(--client-surface-alt)] text-[var(--client-fg)]"
        style={{ borderRadius: "var(--client-rad-sm)" }}
      >
        {icon}
      </span>
      <span className="flex-1 text-sm font-semibold text-[var(--client-fg)]">
        {label}
      </span>
      {value ? (
        <span className="text-[13px] text-[var(--client-fg-muted)]">
          {value}
        </span>
      ) : null}
      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--client-fg-muted)]" />
    </Link>
  );
}
