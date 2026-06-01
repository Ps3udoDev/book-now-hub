// src/app/c/[tenant]/historial/page.tsx
// Historial completo y filtrable de citas del cliente.
"use client";

import { ArrowLeft, CalendarClock, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useClientTenant } from "@/providers/client-tenant-provider";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  in_progress: "En curso",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistio",
};

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

function formatMoney(value: number | null, currency: string | null) {
  if (value == null) return "Sin pago registrado";
  try {
    return new Intl.NumberFormat("es-EC", {
      style: "currency",
      currency: currency || "USD",
    }).format(value);
  } catch {
    return `${currency || "USD"} ${value.toFixed(2)}`;
  }
}

export default function ClientHistoryPage() {
  const { tenantSlug } = useClientTenant();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [serviceId, setServiceId] = useState("all");
  const [specialistId, setSpecialistId] = useState("all");

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
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 pb-24">
      <header className="space-y-3">
        <Link
          href={`/c/${tenantSlug}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Inicio
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Historial</h1>
          <p className="text-sm text-muted-foreground">
            Revisa tus visitas, pagos y detalles de cada cita.
          </p>
        </div>
      </header>

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
          <Select
            value={status}
            onValueChange={(value) => resetPage(() => setStatus(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={serviceId}
            onValueChange={(value) => resetPage(() => setServiceId(value))}
          >
            <SelectTrigger>
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
            <SelectTrigger>
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
            <Input
              type="date"
              value={fromDate}
              onChange={(event) =>
                resetPage(() => setFromDate(event.target.value))
              }
              aria-label="Desde"
            />
            <Input
              type="date"
              value={toDate}
              onChange={(event) =>
                resetPage(() => setToDate(event.target.value))
              }
              aria-label="Hasta"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {["a", "b", "c"].map((key) => (
            <Skeleton key={key} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <div className="rounded-xl border py-12 text-center">
          <Search className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No encontramos citas con estos filtros.
          </p>
        </div>
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
          <Button
            variant="outline"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Pagina {pagination.page} de {pagination.total_pages}
          </span>
          <Button
            variant="outline"
            disabled={page >= pagination.total_pages || isLoading}
            onClick={() => setPage((current) => current + 1)}
          >
            Siguiente
          </Button>
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
  return (
    <Link href={`/c/${tenantSlug}/historial/${appointment.id}`}>
      <Card className="transition-colors hover:bg-accent/40">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold leading-tight">
                {appointment.services?.name ?? "Servicio"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatDate(appointment.scheduled_at)} ·{" "}
                {formatTime(appointment.scheduled_at)}
              </p>
            </div>
            <Badge variant="secondary">
              {STATUS_LABELS[appointment.status] ?? appointment.status}
            </Badge>
          </div>

          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarClock className="h-4 w-4" />
              <span>{appointment.profiles?.full_name ?? "Por asignar"}</span>
            </div>
            <p className="font-medium">
              {formatMoney(appointment.paid_amount, appointment.paid_currency)}
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Calificacion: pendiente
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
