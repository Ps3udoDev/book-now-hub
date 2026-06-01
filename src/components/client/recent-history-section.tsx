// src/components/client/recent-history-section.tsx
"use client";

import { History, User } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import type { CustomerDashboardPastAppointment } from "@/types";

interface RecentHistorySectionProps {
  appointments: CustomerDashboardPastAppointment[];
  tenantSlug: string;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("es-VE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatPrice(price: number | null, currency: string | null): string {
  if (price === null || price === undefined) return "—";
  return `${currency ?? "USD"} ${price.toFixed(2)}`;
}

export function RecentHistorySection({
  appointments,
  tenantSlug,
}: RecentHistorySectionProps) {
  const recent = appointments.slice(0, 3);

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          Historial reciente
        </h3>
        {recent.length > 0 ? (
          <Link
            href={`/c/${tenantSlug}/historial`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Ver todo
          </Link>
        ) : null}
      </header>

      {recent.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              Aún no tienes citas completadas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {recent.map((appointment) => (
              <Link
                key={appointment.id}
                href={`/c/${tenantSlug}/historial/${appointment.id}`}
                className="flex items-center justify-between gap-3 p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">
                    {appointment.service_name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span>{formatDate(appointment.scheduled_at)}</span>
                    {appointment.specialist_name ? (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1 truncate">
                          <User className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {appointment.specialist_name}
                          </span>
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium">
                    {formatPrice(appointment.price, appointment.currency_code)}
                  </p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
