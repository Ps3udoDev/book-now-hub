// src/components/client/next-appointment-card.tsx
"use client";

import { Calendar, Clock, MapPin, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CustomerDashboardNextAppointment } from "@/types";

interface NextAppointmentCardProps {
  appointment: CustomerDashboardNextAppointment | null;
  tenantSlug: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  in_progress: "En curso",
};

function formatDate(value: string): string {
  const date = new Date(value);
  return date.toLocaleDateString("es-VE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTime(value: string): string {
  const date = new Date(value);
  return date.toLocaleTimeString("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(price: number | null, currency: string | null): string {
  if (price === null || price === undefined) return "—";
  return `${currency ?? "USD"} ${price.toFixed(2)}`;
}

export function NextAppointmentCard({
  appointment,
  tenantSlug,
}: NextAppointmentCardProps) {
  if (!appointment) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center text-center py-10 gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-medium">No tienes citas agendadas</p>
            <p className="text-sm text-muted-foreground">
              Reserva tu próxima visita en segundos
            </p>
          </div>
          <Link href={`/c/${tenantSlug}/servicios`}>
            <Button>
              <Sparkles className="h-4 w-4 mr-2" />
              Agendar cita
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-card to-card border-primary/20">
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Tu próxima cita
            </p>
            <h2 className="text-xl font-semibold mt-1">
              {appointment.service_name}
            </h2>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {STATUS_LABEL[appointment.status] ?? appointment.status}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoRow
            icon={<Calendar className="h-4 w-4" />}
            label={formatDate(appointment.scheduled_at)}
          />
          <InfoRow
            icon={<Clock className="h-4 w-4" />}
            label={`${formatTime(appointment.scheduled_at)} · ${appointment.duration_minutes} min`}
          />
          {appointment.specialist_name ? (
            <InfoRow
              icon={<User className="h-4 w-4" />}
              label={appointment.specialist_name}
            />
          ) : null}
          {appointment.branch_name ? (
            <InfoRow
              icon={<MapPin className="h-4 w-4" />}
              label={appointment.branch_name}
            />
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <div>
            <p className="text-xs text-muted-foreground">Total estimado</p>
            <p className="font-semibold">
              {formatPrice(
                appointment.estimated_price,
                appointment.currency_code,
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/c/${tenantSlug}/historial/${appointment.id}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Detalles
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-primary">{icon}</span>
      <span className="capitalize">{label}</span>
    </div>
  );
}
