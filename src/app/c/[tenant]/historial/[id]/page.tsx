// src/app/c/[tenant]/historial/[id]/page.tsx
// Detalle completo de una visita del cliente.
"use client";

import {
  ArrowLeft,
  Clock,
  CreditCard,
  type LucideIcon,
  MapPin,
  Star,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientHistoryDetail } from "@/hooks/supabase/use-client-profile";
import { useClientTenant } from "@/providers/client-tenant-provider";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  in_progress: "En curso",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistio",
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  mobile_payment: "Pago movil",
  zelle: "Zelle",
  paypal: "PayPal",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
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

export default function ClientHistoryDetailPage() {
  const params = useParams();
  const appointmentId = params.id as string;
  const { tenantSlug } = useClientTenant();
  const { appointment, isLoading, error } = useClientHistoryDetail(
    tenantSlug,
    appointmentId,
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 text-center">
        <h1 className="text-xl font-semibold">No pudimos cargar la cita</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button asChild>
          <Link href={`/c/${tenantSlug}/historial`}>Volver al historial</Link>
        </Button>
      </div>
    );
  }

  const services =
    appointment.appointment_services.length > 0
      ? appointment.appointment_services
      : [
          {
            id: appointment.id,
            service_id: appointment.service_id,
            service_variant_id: null,
            specialist_id: appointment.specialist_id,
            price: appointment.estimated_price ?? 0,
            duration_minutes: appointment.duration_minutes,
            services: appointment.services,
            service_variants: null,
            profiles: appointment.profiles,
          },
        ];

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 pb-24">
      <Link
        href={`/c/${tenantSlug}/historial`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Historial
      </Link>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold leading-tight">
                {appointment.services?.name ?? "Cita"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground capitalize">
                {formatDate(appointment.scheduled_at)}
              </p>
            </div>
            <Badge>
              {STATUS_LABELS[appointment.status] ?? appointment.status}
            </Badge>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <Info
              icon={Clock}
              label="Hora"
              value={formatTime(appointment.scheduled_at)}
            />
            <Info
              icon={User}
              label="Especialista"
              value={appointment.profiles?.full_name ?? "Por asignar"}
            />
            <Info
              icon={MapPin}
              label="Sucursal"
              value={appointment.branches?.name ?? "Sucursal"}
            />
            <Info
              icon={CreditCard}
              label="Pagado"
              value={formatMoney(
                appointment.paid_amount,
                appointment.paid_currency,
              )}
            />
          </div>

          {appointment.customer_notes ? (
            <div className="rounded-lg border p-3 text-sm">
              <p className="font-medium">Notas</p>
              <p className="mt-1 text-muted-foreground">
                {appointment.customer_notes}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Servicios de la visita</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {services.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {item.services?.name ?? "Servicio"}
                  {item.service_variants?.name
                    ? ` · ${item.service_variants.name}`
                    : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.profiles?.full_name ?? "Especialista por asignar"} ·{" "}
                  {item.duration_minutes ?? appointment.duration_minutes} min
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold">
                {formatMoney(item.price, appointment.currency_code)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metodo de pago</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {appointment.payments.length > 0 ? (
            appointment.payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
              >
                <span>
                  {payment.payment_method
                    ? (PAYMENT_LABELS[payment.payment_method] ??
                      payment.payment_method)
                    : "Pago"}
                </span>
                <span className="font-semibold">
                  {formatMoney(payment.amount, payment.currency_code)}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay pagos asociados a esta cita.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Calificacion</p>
              <p className="text-xs text-muted-foreground">
                {appointment.rating
                  ? `${appointment.rating.score}/5`
                  : "Aun no has calificado esta visita"}
              </p>
            </div>
          </div>
          {!appointment.rating && appointment.status === "completed" ? (
            <Button size="sm" variant="outline" disabled>
              Calificar
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border p-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-medium">{value}</p>
      </div>
    </div>
  );
}
