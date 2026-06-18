// src/components/client/next-appointment-card.tsx
// Hero "Tu proxima cita" del dashboard, con layout distinto por template
// (fiel al prototipo): beauty full-bleed, dental panel+foto, wellness
// texto-first, barber stripe acento, studio split panel.
"use client";

import { Calendar, Clock, Sparkles, User } from "lucide-react";
import Link from "next/link";
import {
  ClientButton,
  ClientCard,
  displayStyle,
  useClientTheme,
} from "@/components/client/themed";
import type { CustomerDashboardNextAppointment } from "@/types";

interface NextAppointmentCardProps {
  appointment: CustomerDashboardNextAppointment | null;
  tenantSlug: string;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("es-VE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NextAppointmentCard({
  appointment,
  tenantSlug,
}: NextAppointmentCardProps) {
  const { slug, heroImage, isBarber } = useClientTheme();

  if (!appointment) {
    return (
      <ClientCard className="flex flex-col items-center gap-3 border-dashed px-5 py-10 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--client-surface-alt)] text-[var(--client-primary)]">
          <Calendar className="h-6 w-6" />
        </span>
        <div>
          <p className="font-semibold text-[var(--client-fg)]">
            No tienes citas agendadas
          </p>
          <p className="mt-1 text-sm text-[var(--client-fg-muted)]">
            Reserva tu próxima visita en segundos
          </p>
        </div>
        <Link href={`/c/${tenantSlug}/servicios`}>
          <ClientButton className="h-11">
            <Sparkles className="h-4 w-4" />
            Agendar cita
          </ClientButton>
        </Link>
      </ClientCard>
    );
  }

  const detailHref = `/c/${tenantSlug}/historial/${appointment.id}`;
  const date = formatDate(appointment.scheduled_at);
  const time = formatTime(appointment.scheduled_at);

  if (slug === "wellness") {
    return (
      <ClientCard className="p-[18px]">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--client-fg-muted)]">
          Tu próxima cita
        </p>
        <p
          className="mb-2 mt-1.5 text-[26px] font-normal italic leading-[1.15] text-[var(--client-fg)]"
          style={{ fontFamily: "var(--client-font-display)" }}
        >
          {appointment.service_name}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-[13.5px] text-[var(--client-fg-muted)]">
          <Calendar className="h-[15px] w-[15px]" />
          <span className="capitalize">
            {date} · {time}
          </span>
          {appointment.specialist_name ? (
            <>
              <span className="h-[3px] w-[3px] rounded-full bg-[var(--client-fg-faint)]" />
              <User className="h-[15px] w-[15px]" />
              {appointment.specialist_name}
            </>
          ) : null}
        </div>
        <div className="my-3.5 h-px bg-[var(--client-border)]" />
        <div className="flex gap-2.5">
          <Link href={detailHref} className="flex-1">
            <ClientButton className="h-11 w-full">Ver detalle</ClientButton>
          </Link>
          <Link href={`/c/${tenantSlug}/servicios`} className="flex-1">
            <ClientButton variant="ghost" className="h-11 w-full">
              Agendar otra
            </ClientButton>
          </Link>
        </div>
      </ClientCard>
    );
  }

  if (slug === "dental") {
    return (
      <ClientCard className="flex gap-3.5 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-semibold tracking-wide text-[var(--client-primary)]">
            PRÓXIMA CITA
          </p>
          <Link href={detailHref}>
            <p className="mt-1 text-lg font-bold leading-tight text-[var(--client-fg)]">
              {appointment.service_name}
            </p>
          </Link>
          {appointment.specialist_name ? (
            <p className="mt-1.5 text-[13px] text-[var(--client-fg-muted)]">
              {appointment.specialist_name}
            </p>
          ) : null}
          <div className="mt-3 flex items-center gap-3 text-[12.5px] font-semibold text-[var(--client-fg)]">
            <span className="flex items-center gap-1.5 capitalize">
              <Calendar className="h-3.5 w-3.5" />
              {date}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {time}
            </span>
          </div>
        </div>
        <div
          className="h-[110px] w-[90px] shrink-0"
          style={{
            borderRadius: "var(--client-rad-md)",
            backgroundImage: `url(${heroImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      </ClientCard>
    );
  }

  if (slug === "barber") {
    return (
      <Link href={detailHref} className="block">
        <div
          className="flex overflow-hidden border border-[var(--client-border)] bg-[var(--client-surface)]"
          style={{ borderRadius: "var(--client-rad-md)" }}
        >
          <div
            className="w-[120px] shrink-0"
            style={{
              backgroundImage: `url(${heroImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="flex-1 border-l-2 border-[var(--client-accent)] px-4 pb-3.5 pt-4">
            <p className="text-[10.5px] font-bold tracking-[0.2em] text-[var(--client-accent)]">
              NEXT BOOKING
            </p>
            <p
              className="mt-1 text-[19px] font-medium uppercase leading-tight tracking-[0.1em] text-[var(--client-fg)]"
              style={{ fontFamily: "var(--client-font-display)" }}
            >
              {appointment.service_name}
            </p>
            <p className="mt-2 flex items-center gap-2 text-xs capitalize text-[var(--client-fg-muted)]">
              <Calendar className="h-[13px] w-[13px]" />
              {date} · {time}
            </p>
            {appointment.specialist_name ? (
              <p className="mt-1 text-xs text-[var(--client-fg-muted)]">
                {appointment.specialist_name}
              </p>
            ) : null}
          </div>
        </div>
      </Link>
    );
  }

  if (slug === "studio") {
    return (
      <div
        className="overflow-hidden border border-[var(--client-border)] bg-[var(--client-surface)]"
        style={{ borderRadius: "var(--client-rad-lg)" }}
      >
        <div className="grid grid-cols-[1fr_1.1fr]">
          <div className="flex min-h-[150px] flex-col justify-between p-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--client-fg-muted)]">
                Próxima · <span className="capitalize">{date}</span>
              </p>
              <p className="mt-1.5 text-lg font-semibold leading-tight tracking-tight text-[var(--client-fg)]">
                {appointment.service_name}
              </p>
            </div>
            <div>
              <p className="mb-2 text-xs text-[var(--client-fg-muted)]">
                {appointment.specialist_name
                  ? `${appointment.specialist_name} · `
                  : ""}
                {appointment.duration_minutes} min
              </p>
              <Link href={detailHref}>
                <ClientButton className="h-9 px-3.5 text-[13px]">
                  Ver →
                </ClientButton>
              </Link>
            </div>
          </div>
          <div
            className="relative"
            style={{
              backgroundImage: `url(${heroImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <span className="absolute right-3 top-3 rounded-full bg-[var(--client-accent)] px-2.5 py-1 text-[11px] font-bold text-[var(--client-accent-fg)]">
              {time}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // beauty (default) — full-bleed con overlay serif
  return (
    <div
      className="relative h-[200px] overflow-hidden shadow-[var(--client-shadow)]"
      style={{
        borderRadius: "var(--client-rad-lg)",
        backgroundImage: `url(${heroImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      <span className="absolute left-4 top-3.5 rounded-full bg-white/90 px-2.5 py-1 text-[10.5px] font-semibold tracking-[0.12em] text-neutral-900">
        PRÓXIMA CITA
      </span>
      <div className="absolute bottom-3.5 left-4 right-4 text-white">
        <p
          className="text-2xl font-medium italic leading-[1.15]"
          style={{
            ...displayStyle(isBarber),
            textTransform: "none",
          }}
        >
          {appointment.service_name}
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <p className="text-[13px] capitalize opacity-90">
            {date} · {time}
            {appointment.specialist_name
              ? ` · ${appointment.specialist_name}`
              : ""}
          </p>
          <Link
            href={detailHref}
            className="shrink-0 rounded-full bg-white/95 px-3.5 py-2 text-xs font-semibold text-neutral-900"
          >
            Ver →
          </Link>
        </div>
      </div>
    </div>
  );
}
