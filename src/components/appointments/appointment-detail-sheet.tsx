// src/components/appointments/appointment-detail-sheet.tsx
"use client";

import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  PlayCircle,
  Scissors,
  User,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  type AppointmentWithRelations,
  appointmentsService,
  getStatusInfo,
} from "@/lib/services/appointments";
import {
  generateClientICS,
  generateSpecialistICS,
} from "@/lib/utils/ics-generator";

interface AppointmentDetailSheetProps {
  appointment: AppointmentWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (appointment: AppointmentWithRelations) => void;
  onStatusChanged?: () => void;
}

export function AppointmentDetailSheet({
  appointment,
  open,
  onOpenChange,
  onEdit,
  onStatusChanged,
}: AppointmentDetailSheetProps) {
  const [loading, setLoading] = useState<string | null>(null);

  if (!appointment) return null;

  const statusInfo = getStatusInfo(appointment.status || "confirmed");
  const customerName = appointment.customer
    ? `${appointment.customer.first_name} ${appointment.customer.last_name}`
    : "Cliente";

  // Fallback for ends_at
  const endDate = appointment.ends_at
    ? appointment.ends_at
    : new Date(
        new Date(appointment.scheduled_at || "").getTime() +
          (appointment.duration_minutes || 15) * 60000,
      ).toISOString();

  const timeRange = appointmentsService.formatTimeRange(
    appointment.scheduled_at || "",
    endDate,
  );
  const dateStr = appointmentsService.formatDate(
    appointment.scheduled_at || "",
  );

  // Acciones de cambio de estado
  const statusActions = getStatusActions(appointment.status || "confirmed");

  async function handleStatusChange(action: string) {
    if (!appointment?.id) return;
    const appointmentId = appointment.id;

    setLoading(action);
    try {
      switch (action) {
        case "confirm":
          await appointmentsService.confirmAppointment(appointmentId);
          toast.success("Cita confirmada");
          break;
        case "start":
          await appointmentsService.startAppointment(appointmentId);
          toast.success("Cita iniciada");
          break;
        case "complete":
          await appointmentsService.completeAppointment(appointmentId);
          toast.success("Cita completada");
          break;
        case "cancel":
          await appointmentsService.cancelAppointment(appointmentId);
          toast.success("Cita cancelada");
          break;
        case "no_show":
          await appointmentsService.markNoShow(appointmentId);
          toast.success("Marcada como inasistencia");
          break;
      }
      onStatusChanged?.();
    } catch (_error) {
      toast.error("Error al cambiar estado");
    } finally {
      setLoading(null);
    }
  }

  // Descargar ICS del cliente
  function downloadClientICS() {
    if (!appointment) return;

    const endDate = appointment.ends_at
      ? new Date(appointment.ends_at)
      : new Date(
          new Date(appointment.scheduled_at).getTime() +
            (appointment.duration_minutes || 15) * 60000,
        );

    const ics = generateClientICS({
      serviceName: appointment.service?.name || "Servicio",
      specialistName: appointment.specialist?.full_name || "Especialista",
      branchName: appointment.branch?.name || "Elvis Studio",
      branchAddress: appointment.branch?.address || undefined,
      startTime: new Date(appointment.scheduled_at),
      endTime: endDate,
      clientName: customerName,
      clientEmail: appointment.customer?.email || "",
      branchEmail: appointment.branch?.email || undefined,
      appointmentId: appointment.id,
    });
    downloadFile(ics, `cita-${customerName.replace(/\s/g, "-")}.ics`);
  }

  // Descargar ICS del especialista
  function downloadSpecialistICS() {
    if (!appointment) return;

    const endDate = appointment.ends_at
      ? new Date(appointment.ends_at)
      : new Date(
          new Date(appointment.scheduled_at).getTime() +
            (appointment.duration_minutes || 15) * 60000,
        );

    const ics = generateSpecialistICS({
      serviceName: appointment.service?.name || "Servicio",
      clientName: customerName,
      branchName: appointment.branch?.name || "Elvis Studio",
      branchAddress: appointment.branch?.address || undefined,
      startTime: new Date(appointment.scheduled_at),
      endTime: endDate,
      specialistName: appointment.specialist?.full_name || "Especialista",
      specialistEmail: appointment.specialist?.email || "",
      workstationName: appointment.workstation?.name || undefined,
      appointmentId: appointment.id,
      notes:
        appointment.customer_notes || appointment.internal_notes || undefined,
    });
    downloadFile(
      ics,
      `cita-${appointment.specialist?.full_name?.replace(/\s/g, "-") || "especialista"}.ics`,
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle className="text-lg">{customerName}</SheetTitle>
            <Badge
              style={{
                backgroundColor: statusInfo.bgColor,
                color: statusInfo.color,
              }}
            >
              {statusInfo.label}
            </Badge>
          </div>
          <SheetDescription>{dateStr}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6 px-1">
          {/* Detalles principales */}
          <div className="space-y-4">
            <DetailRow
              icon={<Clock className="h-4 w-4 text-muted-foreground" />}
              label="Horario"
              value={timeRange}
            />
            <DetailRow
              icon={<Scissors className="h-4 w-4 text-muted-foreground" />}
              label="Servicio"
              value={appointment.service?.name || "—"}
            />
            <DetailRow
              icon={<User className="h-4 w-4 text-muted-foreground" />}
              label="Especialista"
              value={appointment.specialist?.full_name || "—"}
            />
            {appointment.branch && (
              <DetailRow
                icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
                label="Sucursal"
                value={appointment.branch.name}
              />
            )}
            {appointment.workstation && (
              <DetailRow
                icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
                label="Puesto"
                value={`${appointment.workstation.name}${appointment.workstation.code ? ` (${appointment.workstation.code})` : ""}`}
              />
            )}
            {appointment.estimated_price != null && (
              <DetailRow
                icon={
                  <span className="text-muted-foreground text-sm font-mono">
                    $
                  </span>
                }
                label="Precio estimado"
                value={`$${Number(appointment.estimated_price).toFixed(2)}`}
              />
            )}
            {/* Anticipo y saldo pendiente */}
            {(() => {
              const advancePaid = Number(
                (appointment as any).advance_paid_amount ?? 0,
              );
              const estimated = Number(appointment.estimated_price ?? 0);
              if (advancePaid <= 0) return null;
              const pending = Math.max(0, estimated - advancePaid);
              return (
                <>
                  <DetailRow
                    icon={
                      <span className="text-green-600 text-sm font-mono">
                        ↓
                      </span>
                    }
                    label="Anticipo pagado"
                    value={`$${advancePaid.toFixed(2)}`}
                  />
                  {pending > 0 && (
                    <DetailRow
                      icon={
                        <span className="text-amber-500 text-sm font-mono">
                          ≡
                        </span>
                      }
                      label="Saldo pendiente"
                      value={`$${pending.toFixed(2)}`}
                    />
                  )}
                  {pending === 0 && (
                    <DetailRow
                      icon={
                        <span className="text-green-600 text-sm font-mono">
                          ✓
                        </span>
                      }
                      label="Saldo pendiente"
                      value="Pagado completamente"
                    />
                  )}
                </>
              );
            })()}
          </div>

          {/* Contacto del cliente */}
          {appointment.customer && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Contacto del cliente
                </p>
                {appointment.customer.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <a
                      href={`mailto:${appointment.customer.email}`}
                      className="text-primary hover:underline"
                    >
                      {appointment.customer.email}
                    </a>
                  </div>
                )}
                {appointment.customer.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <a
                      href={`tel:${appointment.customer.phone}`}
                      className="text-primary hover:underline"
                    >
                      {appointment.customer.phone}
                    </a>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Notas */}
          {/* Notas */}
          {(appointment.customer_notes || appointment.internal_notes) && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Notas
                </p>
                <p className="text-sm">
                  {appointment.customer_notes || appointment.internal_notes}
                </p>
              </div>
            </>
          )}

          {/* Descargar ICS */}
          <Separator />
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Agregar al calendario
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadClientICS}>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Cliente
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadSpecialistICS}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Especialista
              </Button>
            </div>
          </div>

          {/* Acciones de estado */}
          <Separator />
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Acciones
            </p>
            <div className="flex flex-wrap gap-2">
              {statusActions.map((action) => (
                <Button
                  key={action.key}
                  variant={
                    action.variant as "default" | "outline" | "destructive"
                  }
                  size="sm"
                  onClick={() => handleStatusChange(action.key)}
                  disabled={loading !== null}
                >
                  {loading === action.key ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <action.icon className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {action.label}
                </Button>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onEdit?.(appointment);
                  onOpenChange(false);
                }}
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Editar
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ==================== Helpers ====================

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 py-0.5">
      {icon}
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-words">{value}</p>
      </div>
    </div>
  );
}

function getStatusActions(status: string) {
  switch (status) {
    case "pending":
      return [
        {
          key: "confirm",
          label: "Confirmar",
          icon: CheckCircle,
          variant: "default",
        },
        {
          key: "cancel",
          label: "Cancelar",
          icon: XCircle,
          variant: "destructive",
        },
      ];
    case "confirmed":
      return [
        {
          key: "start",
          label: "Iniciar",
          icon: PlayCircle,
          variant: "default",
        },
        {
          key: "no_show",
          label: "No asistió",
          icon: AlertTriangle,
          variant: "outline",
        },
        {
          key: "cancel",
          label: "Cancelar",
          icon: XCircle,
          variant: "destructive",
        },
      ];
    case "in_progress":
      return [
        {
          key: "complete",
          label: "Completar",
          icon: CheckCircle,
          variant: "default",
        },
      ];
    default:
      return [];
  }
}

function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
