// src/app/c/[tenant]/historial/page.tsx
// Historial de citas fiel al prototipo: chips de estado, filtros avanzados
// plegables y lista de visitas con icono de estado.
"use client";

import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Search,
  SlidersHorizontal,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ClientButton,
  ClientCard,
  ClientChip,
  ScreenHeader,
} from "@/components/client/themed";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientHistory } from "@/hooks/supabase/use-client-profile";
import { useClientServices } from "@/hooks/supabase/use-client-services";
import type {
  ClientHistoryAppointment,
  ClientHistoryFilters,
} from "@/lib/services/client-profile";
import { cn } from "@/lib/utils";
import { useClientCurrency } from "@/providers/client-currency-provider";
import { useClientTenant } from "@/providers/client-tenant-provider";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  in_progress: "En curso",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
};

const STATUS_CHIPS = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendientes" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "completed", label: "Completadas" },
  { value: "cancelled", label: "Canceladas" },
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("es-EC", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ClientHistoryPage() {
  const { tenantSlug } = useClientTenant();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [serviceId, setServiceId] = useState("all");
  const [specialistId, setSpecialistId] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const filters = useMemo<ClientHistoryFilters>(
    () => ({
      page,
      pageSize: 12,
      status: status === "all" ? undefined : status,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      serviceId: serviceId === "all" ? undefined : serviceId,
      specialistId: specialistId === "all" ? undefined : specialistId,
    }),
    [fromDate, page, serviceId, specialistId, status, toDate],
  );

  const { appointments, pagination, isLoading } = useClientHistory(
    tenantSlug,
    filters,
  );
  const { services } = useClientServices(tenantSlug);

  const specialists = useMemo(() => {
    const map = new Map<string, string>();
    for (const appointment of appointments) {
      if (appointment.specialist_id && appointment.profiles?.full_name) {
        map.set(appointment.specialist_id, appointment.profiles.full_name);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [appointments]);

  const resetPage = (next: () => void) => {
    setPage(1);
    next();
  };

  return (
    <div className="mx-auto max-w-md space-y-4 px-5 pb-28 pt-4">
      <ScreenHeader
        title="Historial"
        right={
          <button
            type="button"
            onClick={() => setShowFilters((current) => !current)}
            aria-label="Más filtros"
            className={cn(
              "grid h-10 w-10 place-items-center rounded-full border transition-colors",
              showFilters
                ? "border-[var(--client-primary)] bg-[var(--client-primary)] text-[var(--client-primary-fg)]"
                : "border-[var(--client-border)] bg-[var(--client-surface)] text-[var(--client-fg)]",
            )}
          >
            <SlidersHorizontal className="h-[18px] w-[18px]" />
          </button>
        }
      />

      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {STATUS_CHIPS.map((chip) => (
          <ClientChip
            key={chip.value}
            active={status === chip.value}
            onClick={() => resetPage(() => setStatus(chip.value))}
          >
            {chip.label}
          </ClientChip>
        ))}
      </div>

      {showFilters ? (
        <ClientCard className="grid gap-2.5 p-4">
          <Select
            value={serviceId}
            onValueChange={(value) => resetPage(() => setServiceId(value))}
          >
            <SelectTrigger className="border-[var(--client-border)] bg-[var(--client-bg)]">
              <SelectValue placeholder="Servicio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los servicios</SelectItem>
              {services.map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={specialistId}
            onValueChange={(value) => resetPage(() => setSpecialistId(value))}
          >
            <SelectTrigger className="border-[var(--client-border)] bg-[var(--client-bg)]">
              <SelectValue placeholder="Especialista" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los especialistas</SelectItem>
              {specialists.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(event) =>
                resetPage(() => setFromDate(event.target.value))
              }
              aria-label="Desde"
              className="h-10 border border-[var(--client-border)] bg-[var(--client-bg)] px-3 text-sm text-[var(--client-fg)] outline-none"
              style={{ borderRadius: "var(--client-rad-sm)" }}
            />
            <input
              type="date"
              value={toDate}
              onChange={(event) =>
                resetPage(() => setToDate(event.target.value))
              }
              aria-label="Hasta"
              className="h-10 border border-[var(--client-border)] bg-[var(--client-bg)] px-3 text-sm text-[var(--client-fg)] outline-none"
              style={{ borderRadius: "var(--client-rad-sm)" }}
            />
          </div>
        </ClientCard>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">
          {["a", "b", "c"].map((key) => (
            <Skeleton key={key} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <ClientCard className="border-dashed py-12 text-center">
          <Search className="mx-auto h-9 w-9 text-[var(--client-fg-faint)]" />
          <p className="mt-3 text-sm text-[var(--client-fg-muted)]">
            No encontramos citas con estos filtros.
          </p>
        </ClientCard>
      ) : (
        <div className="space-y-3">
          {appointments.map((appointment) => (
            <HistoryCard
              key={appointment.id}
              appointment={appointment}
              tenantSlug={tenantSlug}
            />
          ))}
        </div>
      )}

      {pagination.total_pages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <ClientButton
            variant="ghost"
            className="h-10 px-4 text-[13px]"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Anterior
          </ClientButton>
          <span className="text-sm text-[var(--client-fg-muted)]">
            Página {pagination.page} de {pagination.total_pages}
          </span>
          <ClientButton
            variant="ghost"
            className="h-10 px-4 text-[13px]"
            disabled={page >= pagination.total_pages || isLoading}
            onClick={() => setPage((current) => current + 1)}
          >
            Siguiente
          </ClientButton>
        </div>
      ) : null}
    </div>
  );
}

function HistoryCard({
  appointment,
  tenantSlug,
}: {
  appointment: ClientHistoryAppointment;
  tenantSlug: string;
}) {
  const { formatPrice } = useClientCurrency();
  const upcoming =
    appointment.status === "pending" || appointment.status === "confirmed";
  const cancelled =
    appointment.status === "cancelled" || appointment.status === "no_show";

  return (
    <Link
      href={`/c/${tenantSlug}/historial/${appointment.id}`}
      className="block"
    >
      <div
        className={cn(
          "relative overflow-hidden border bg-[var(--client-surface)] p-3.5 shadow-[var(--client-shadow-soft)] transition-colors hover:bg-[var(--client-surface-alt)]",
          upcoming
            ? "border-[var(--client-primary)]"
            : "border-[var(--client-border)]",
        )}
        style={{ borderRadius: "var(--client-rad-lg)" }}
      >
        {upcoming ? (
          <span className="absolute bottom-0 left-0 top-0 w-1 bg-[var(--client-primary)]" />
        ) : null}
        <div className={cn("flex items-center gap-3", upcoming && "pl-2")}>
          <span
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center bg-[var(--client-surface-alt)]",
              cancelled
                ? "text-[var(--client-fg-faint)]"
                : upcoming
                  ? "text-[var(--client-primary)]"
                  : "text-[var(--client-success)]",
            )}
            style={{ borderRadius: "var(--client-rad-sm)" }}
          >
            {cancelled ? (
              <XCircle className="h-[18px] w-[18px]" />
            ) : upcoming ? (
              <Clock className="h-[18px] w-[18px]" />
            ) : (
              <CheckCircle2 className="h-[18px] w-[18px]" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            {upcoming ? (
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-[var(--client-primary)]">
                Próxima
              </p>
            ) : null}
            <p
              className="truncate text-sm font-semibold text-[var(--client-fg)]"
              style={{ fontFamily: "var(--client-font-display)" }}
            >
              {appointment.services?.name ?? "Servicio"}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--client-fg-muted)]">
              <CalendarClock className="h-3 w-3 shrink-0" />
              {formatDate(appointment.scheduled_at)} ·{" "}
              {formatTime(appointment.scheduled_at)}
              {appointment.profiles?.full_name
                ? ` · ${appointment.profiles.full_name}`
                : ""}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-bold text-[var(--client-fg)]">
              {formatPrice(appointment.paid_amount, appointment.paid_currency)}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--client-fg-muted)]">
              {STATUS_LABELS[appointment.status] ?? appointment.status}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
