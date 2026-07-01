// src/components/client/recent-history-section.tsx
// Lista "Reciente" del dashboard, fiel al prototipo: icono check en bloque
// surfaceAlt + servicio + fecha + precio.
"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { ClientCard, SectionHeading } from "@/components/client/themed";
import { useClientCurrency } from "@/providers/client-currency-provider";
import type { CustomerDashboardPastAppointment } from "@/types";

interface RecentHistorySectionProps {
  appointments: CustomerDashboardPastAppointment[];
  tenantSlug: string;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("es-VE", {
    day: "numeric",
    month: "short",
  });
}

export function RecentHistorySection({
  appointments,
  tenantSlug,
}: RecentHistorySectionProps) {
  const { formatPrice } = useClientCurrency();
  const recent = appointments.slice(0, 3);

  return (
    <section>
      <SectionHeading
        title="Reciente"
        action={recent.length > 0 ? "Historial" : undefined}
        href={`/c/${tenantSlug}/historial`}
      />

      {recent.length === 0 ? (
        <ClientCard className="border-dashed px-5 py-8 text-center">
          <p className="text-sm text-[var(--client-fg-muted)]">
            Aún no tienes citas completadas.
          </p>
        </ClientCard>
      ) : (
        <ClientCard className="overflow-hidden">
          {recent.map((appointment, index) => (
            <Link
              key={appointment.id}
              href={`/c/${tenantSlug}/historial/${appointment.id}`}
              className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-[var(--client-surface-alt)]"
              style={
                index < recent.length - 1
                  ? { borderBottom: "1px solid var(--client-border)" }
                  : undefined
              }
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center bg-[var(--client-surface-alt)] text-[var(--client-success)]"
                style={{ borderRadius: "var(--client-rad-md)" }}
              >
                <CheckCircle2 className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px] font-semibold text-[var(--client-fg)]">
                  {appointment.service_name}
                </span>
                <span className="block text-xs capitalize text-[var(--client-fg-muted)]">
                  {formatDate(appointment.scheduled_at)}
                  {appointment.specialist_name
                    ? ` · ${appointment.specialist_name}`
                    : ""}
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-[var(--client-fg)]">
                {formatPrice(appointment.price, appointment.currency_code)}
              </span>
            </Link>
          ))}
        </ClientCard>
      )}
    </section>
  );
}
