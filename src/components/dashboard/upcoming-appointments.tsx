"use client";

import { Calendar, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DashboardAppointment } from "@/lib/services/dashboard";

interface UpcomingAppointmentsProps {
  appointments: DashboardAppointment[];
  isLoading?: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  in_progress:
    "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
  completed:
    "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  in_progress: "En progreso",
  completed: "Completada",
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function UpcomingAppointments({
  appointments,
  isLoading,
}: UpcomingAppointmentsProps) {
  return (
    <Card className="dashboard-stagger">
      <CardHeader>
        <CardTitle>Próximas citas</CardTitle>
        <CardDescription>Citas programadas para hoy</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {["s1", "s2", "s3"].map((k) => (
              <div key={k} className="h-14 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : appointments.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Calendar className="mx-auto mb-3 h-12 w-12 opacity-50" />
            <p>No hay citas para hoy.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {appointments.map((appt) => (
              <div
                key={appt.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-sm font-medium tabular-nums">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {formatTime(appt.scheduled_at)}
                  </div>
                  <div>
                    <p className="font-medium">{appt.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {appt.service_name}
                      {appt.specialist_name ? ` · ${appt.specialist_name}` : ""}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[appt.status] ?? "bg-muted text-muted-foreground"}`}
                >
                  {STATUS_LABELS[appt.status] ?? appt.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
