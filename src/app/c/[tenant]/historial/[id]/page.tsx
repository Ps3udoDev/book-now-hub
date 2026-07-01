// src/app/c/[tenant]/historial/[id]/page.tsx
// Detalle completo de una visita del cliente, con la estetica del prototipo.
"use client";

import {
  Clock,
  CreditCard,
  type LucideIcon,
  MapPin,
  Star,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ClientButton,
  ClientCard,
  displayStyle,
  ScreenHeader,
  SectionHeading,
  useClientTheme,
} from "@/components/client/themed";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientHistoryDetail } from "@/hooks/supabase/use-client-profile";
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

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  mobile_payment: "Pago móvil",
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

export default function ClientHistoryDetailPage() {
  const params = useParams();
  const appointmentId = params.id as string;
  const { tenantSlug } = useClientTenant();
  const { isBarber } = useClientTheme();
  const { formatPrice } = useClientCurrency();
  const formatMoney = (value: number | null, currency: string | null) =>
    value == null ? "Sin pago registrado" : formatPrice(value, currency);
  const { appointment, isLoading, error } = useClientHistoryDetail(
    tenantSlug,
    appointmentId,
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-5 py-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl" />
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-5 py-10 text-center">
        <h1
          className="text-xl font-semibold text-[var(--client-fg)]"
          style={displayStyle(isBarber)}
        >
          No pudimos cargar la cita
        </h1>
        <p className="text-sm text-[var(--client-fg-muted)]">{error}</p>
        <Link href={`/c/${tenantSlug}/historial`} className="inline-block">
          <ClientButton className="h-11">Volver al historial</ClientButton>
        </Link>
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
    <div className="mx-auto max-w-md space-y-5 px-5 pb-28 pt-4">
      <ScreenHeader
        title="Detalle de visita"
        backHref={`/c/${tenantSlug}/historial`}
      />

      <ClientCard className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1
              className="text-[22px] font-semibold leading-tight text-[var(--client-fg)]"
              style={displayStyle(isBarber)}
            >
              {appointment.services?.name ?? "Cita"}
            </h1>
            <p className="mt-1 text-sm capitalize text-[var(--client-fg-muted)]">
              {formatDate(appointment.scheduled_at)}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[var(--client-surface-alt)] px-3 py-1 text-xs font-semibold text-[var(--client-fg)]">
            {STATUS_LABELS[appointment.status] ?? appointment.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
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
          <div
            className="border border-[var(--client-border)] bg-[var(--client-bg)] p-3 text-sm"
            style={{ borderRadius: "var(--client-rad-md)" }}
          >
            <p className="font-semibold text-[var(--client-fg)]">Notas</p>
            <p className="mt-1 text-[var(--client-fg-muted)]">
              {appointment.customer_notes}
            </p>
          </div>
        ) : null}
      </ClientCard>

      <section>
        <SectionHeading title="Servicios de la visita" />
        <ClientCard className="overflow-hidden">
          {services.map((item, index) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 px-4 py-3"
              style={
                index < services.length - 1
                  ? { borderBottom: "1px solid var(--client-border)" }
                  : undefined
              }
            >
              <div className="min-w-0">
                <p className="font-semibold text-[var(--client-fg)]">
                  {item.services?.name ?? "Servicio"}
                  {item.service_variants?.name
                    ? ` · ${item.service_variants.name}`
                    : ""}
                </p>
                <p className="mt-1 text-xs text-[var(--client-fg-muted)]">
                  {item.profiles?.full_name ?? "Especialista por asignar"} ·{" "}
                  {item.duration_minutes ?? appointment.duration_minutes} min
                </p>
              </div>
              <span className="shrink-0 text-sm font-bold text-[var(--client-fg)]">
                {formatMoney(item.price, appointment.currency_code)}
              </span>
            </div>
          ))}
        </ClientCard>
      </section>

      <section>
        <SectionHeading title="Método de pago" />
        <ClientCard className="overflow-hidden">
          {appointment.payments.length > 0 ? (
            appointment.payments.map((payment, index) => (
              <div
                key={payment.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                style={
                  index < appointment.payments.length - 1
                    ? { borderBottom: "1px solid var(--client-border)" }
                    : undefined
                }
              >
                <span className="text-[var(--client-fg)]">
                  {payment.payment_method
                    ? (PAYMENT_LABELS[payment.payment_method] ??
                      payment.payment_method)
                    : "Pago"}
                </span>
                <span className="font-bold text-[var(--client-fg)]">
                  {formatMoney(payment.amount, payment.currency_code)}
                </span>
              </div>
            ))
          ) : (
            <p className="px-4 py-3 text-sm text-[var(--client-fg-muted)]">
              No hay pagos asociados a esta cita.
            </p>
          )}
        </ClientCard>
      </section>

      <ClientCard className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <Star className="h-5 w-5 text-[var(--client-accent)]" />
          <div>
            <p className="text-sm font-semibold text-[var(--client-fg)]">
              Calificación
            </p>
            <p className="text-xs text-[var(--client-fg-muted)]">
              {appointment.rating
                ? `${appointment.rating.score}/5`
                : "Aún no has calificado esta visita"}
            </p>
          </div>
        </div>
        {!appointment.rating && appointment.status === "completed" ? (
          <ClientButton variant="ghost" className="h-9 px-3.5 text-xs" disabled>
            Calificar
          </ClientButton>
        ) : null}
      </ClientCard>
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
    <div
      className="flex items-center gap-2.5 border border-[var(--client-border)] bg-[var(--client-bg)] p-3"
      style={{ borderRadius: "var(--client-rad-md)" }}
    >
      <Icon className="h-4 w-4 shrink-0 text-[var(--client-fg-muted)]" />
      <div className="min-w-0">
        <p className="text-[11px] text-[var(--client-fg-muted)]">{label}</p>
        <p className="truncate text-[13px] font-semibold text-[var(--client-fg)]">
          {value}
        </p>
      </div>
    </div>
  );
}
