// src/app/c/[tenant]/servicios/[id]/page.tsx
// Detalle del servicio + flujo de agendamiento por pasos:
//   1) fecha
//   2) horarios disponibles (auto-asigna mejor evaluado)
//   3) toggle "elegir especialista" → lista
//   4) confirmacion
//   5) exito + .ics
"use client";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { SpecialistPicker } from "@/components/client/specialist-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useClientAvailability,
  useClientService,
} from "@/hooks/supabase/use-client-services";
import { clientServicesService } from "@/lib/services/client-services";
import { cn } from "@/lib/utils";
import { buildAppointmentIcs, downloadIcs } from "@/lib/utils/ics";
import { useClientTenant } from "@/providers/client-tenant-provider";

type Step = "select_slot" | "confirm" | "success";

const SLOT_SKELETON_KEYS = [
  "slot-skel-a",
  "slot-skel-b",
  "slot-skel-c",
  "slot-skel-d",
  "slot-skel-e",
  "slot-skel-f",
  "slot-skel-g",
  "slot-skel-h",
];

function todayIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().substring(0, 10);
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLongDate(value: string): string {
  return new Date(value).toLocaleDateString("es-VE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatPrice(price: number, currency: string | null): string {
  return `${currency ?? "USD"} ${price.toFixed(2)}`;
}

export default function ClientBookingPage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params.id as string;
  const { tenantSlug } = useClientTenant();

  const { service, defaultBranchId, branches, isLoading } = useClientService(
    tenantSlug,
    serviceId,
  );

  const [branchId, setBranchId] = useState<string | null>(null);
  const [date, setDate] = useState<string>(() => todayIso());
  const [pickSpecialistMode, setPickSpecialistMode] = useState(false);
  const [chosenSpecialistId, setChosenSpecialistId] = useState<string | null>(
    null,
  );
  const [selectedSlotStart, setSelectedSlotStart] = useState<string | null>(
    null,
  );
  const [step, setStep] = useState<Step>("select_slot");
  const [submitting, setSubmitting] = useState(false);
  const [createdAppointment, setCreatedAppointment] = useState<null | {
    id: string;
    scheduled_at: string;
    duration_minutes: number;
    specialist_id: string | null;
  }>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (defaultBranchId && !branchId) setBranchId(defaultBranchId);
  }, [defaultBranchId, branchId]);

  const { slots, isLoading: slotsLoading } = useClientAvailability(
    tenantSlug,
    serviceId,
    branchId,
    date,
    pickSpecialistMode ? chosenSpecialistId : null,
  );

  const selectedSlot = useMemo(
    () => slots.find((slot) => slot.slot_start === selectedSlotStart) ?? null,
    [slots, selectedSlotStart],
  );

  const branch = useMemo(
    () => branches.find((b) => b.id === branchId) ?? null,
    [branches, branchId],
  );

  const handleConfirm = async () => {
    if (!service || !branchId || !selectedSlot) return;
    setSubmitting(true);
    try {
      const appointment = await clientServicesService.createAppointment(
        tenantSlug,
        {
          service_id: service.id,
          branch_id: branchId,
          scheduled_at: selectedSlot.slot_start,
          specialist_id: pickSpecialistMode
            ? chosenSpecialistId
            : selectedSlot.best.specialist_id,
          customer_notes: notes.trim() || null,
        },
      );
      setCreatedAppointment({
        id: appointment.id,
        scheduled_at: appointment.scheduled_at,
        duration_minutes: appointment.duration_minutes,
        specialist_id: appointment.specialist_id,
      });
      setStep("success");
      toast.success("Cita agendada");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo agendar",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadIcs = () => {
    if (!createdAppointment || !service) return;
    const start = new Date(createdAppointment.scheduled_at);
    const end = new Date(
      start.getTime() + createdAppointment.duration_minutes * 60_000,
    );
    const ics = buildAppointmentIcs({
      uid: createdAppointment.id,
      title: service.name,
      description: notes || undefined,
      location: branch?.name ?? undefined,
      start,
      end,
    });
    downloadIcs(`cita-${createdAppointment.id}.ics`, ics);
  };

  if (isLoading || !service) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (step === "success" && createdAppointment) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
        <Card>
          <CardContent className="text-center py-10 space-y-5">
            <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">¡Cita agendada!</h1>
              <p className="text-muted-foreground mt-1">
                Te enviaremos un recordatorio antes de tu visita
              </p>
            </div>
            <div className="rounded-lg border p-4 text-left space-y-2 max-w-sm mx-auto">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-medium">{service.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                <span className="capitalize">
                  {formatLongDate(createdAppointment.scheduled_at)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {formatTime(createdAppointment.scheduled_at)} ·{" "}
                  {createdAppointment.duration_minutes} min
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button onClick={handleDownloadIcs} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Agregar a calendario
              </Button>
              <Button onClick={() => router.replace(`/c/${tenantSlug}`)}>
                Volver al inicio
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "confirm" && selectedSlot) {
    const specialistId = pickSpecialistMode
      ? chosenSpecialistId
      : selectedSlot.best.specialist_id;
    const specialist =
      selectedSlot.available_specialists.find(
        (sp) => sp.specialist_id === specialistId,
      ) ?? selectedSlot.best;

    return (
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-5">
        <button
          type="button"
          onClick={() => setStep("select_slot")}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>

        <h1 className="text-2xl font-bold">Confirmar cita</h1>

        <Card>
          <CardContent className="p-6 space-y-4">
            <Row label="Servicio" value={service.name} />
            <Row label="Sucursal" value={branch?.name ?? "—"} />
            <Row
              label="Fecha"
              value={formatLongDate(selectedSlot.slot_start)}
            />
            <Row
              label="Hora"
              value={`${formatTime(selectedSlot.slot_start)} (${service.duration_minutes} min)`}
            />
            <Row label="Especialista" value={specialist.specialist_name} />
            <Row
              label="Total estimado"
              value={formatPrice(service.base_price, service.currency_code)}
              emphasis
            />
          </CardContent>
        </Card>

        <div className="space-y-2">
          <Label htmlFor="notes">Notas para el especialista (opcional)</Label>
          <Input
            id="notes"
            placeholder="Por ejemplo: alergia a algún producto"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={submitting}
          />
        </div>

        <Button
          size="lg"
          className="w-full"
          onClick={handleConfirm}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Confirmando…
            </>
          ) : (
            "Confirmar cita"
          )}
        </Button>
      </div>
    );
  }

  // Step: select_slot
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24 space-y-6">
      <Link
        href={`/c/${tenantSlug}/servicios`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Servicios
      </Link>

      {/* Hero */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {service.image_url ? (
            <img
              src={service.image_url}
              alt={service.name}
              className="w-full aspect-[16/9] object-cover"
            />
          ) : (
            <div className="w-full aspect-[16/9] bg-gradient-to-br from-primary/15 via-primary/5 to-transparent flex items-center justify-center">
              <Sparkles className="h-12 w-12 text-primary/40" />
            </div>
          )}
          <div className="p-6 space-y-3">
            <h1 className="text-2xl font-bold">{service.name}</h1>
            {service.description ? (
              <p className="text-muted-foreground">{service.description}</p>
            ) : null}
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-4 w-4" />
                {service.duration_minutes} min
              </span>
              <span className="font-semibold text-primary">
                {formatPrice(service.base_price, service.currency_code)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sucursal */}
      {branches.length > 1 ? (
        <div className="space-y-2">
          <Label>Sucursal</Label>
          <Select value={branchId ?? undefined} onValueChange={setBranchId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una sucursal" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                  {b.city ? ` · ${b.city}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {/* Fecha */}
      <div className="space-y-2">
        <Label htmlFor="date">Fecha</Label>
        <Input
          id="date"
          type="date"
          min={todayIso()}
          value={date}
          onChange={(event) => {
            setDate(event.target.value);
            setSelectedSlotStart(null);
          }}
        />
      </div>

      {/* Modo elegir especialista */}
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Prefiero elegir especialista</p>
            <p className="text-xs text-muted-foreground">
              Si lo dejas desactivado asignamos al mejor evaluado disponible
            </p>
          </div>
        </div>
        <Switch
          checked={pickSpecialistMode}
          onCheckedChange={(checked) => {
            setPickSpecialistMode(checked);
            setSelectedSlotStart(null);
            if (!checked) setChosenSpecialistId(null);
          }}
        />
      </div>

      {/* Si modo manual: mostrar selector de specialist primero */}
      {pickSpecialistMode ? (
        <SpecialistOptions
          tenantSlug={tenantSlug}
          serviceId={serviceId}
          branchId={branchId}
          chosenSpecialistId={chosenSpecialistId}
          onChoose={(id) => {
            setChosenSpecialistId(id);
            setSelectedSlotStart(null);
          }}
        />
      ) : null}

      {/* Slots */}
      <section className="space-y-2">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Horarios disponibles
        </h3>

        {slotsLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {SLOT_SKELETON_KEYS.map((key) => (
              <Skeleton key={key} className="h-10 rounded-md" />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            {pickSpecialistMode && !chosenSpecialistId
              ? "Selecciona un especialista para ver horarios"
              : "No hay horarios disponibles para esta fecha"}
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {slots.map((slot) => {
              const isSelected = slot.slot_start === selectedSlotStart;
              return (
                <button
                  key={slot.slot_start}
                  type="button"
                  onClick={() => setSelectedSlotStart(slot.slot_start)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm transition-colors",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-accent",
                  )}
                >
                  {formatTime(slot.slot_start)}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Resumen del slot elegido */}
      {selectedSlot ? (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Tu selección
            </p>
            <p className="font-medium">
              {formatLongDate(selectedSlot.slot_start)} ·{" "}
              {formatTime(selectedSlot.slot_start)}
            </p>
            <p className="text-sm flex items-center gap-1">
              <User className="h-4 w-4 text-primary" />
              {pickSpecialistMode
                ? (selectedSlot.available_specialists.find(
                    (sp) => sp.specialist_id === chosenSpecialistId,
                  )?.specialist_name ?? "—")
                : `${selectedSlot.best.specialist_name} (asignación automática)`}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Button
        size="lg"
        className="w-full"
        disabled={!selectedSlot}
        onClick={() => setStep("confirm")}
      >
        Continuar
      </Button>
    </div>
  );
}

function Row({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 capitalize">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span
        className={cn(
          "text-sm text-right",
          emphasis && "font-semibold text-primary",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function SpecialistOptions({
  tenantSlug,
  serviceId,
  branchId,
  chosenSpecialistId,
  onChoose,
}: {
  tenantSlug: string;
  serviceId: string;
  branchId: string | null;
  chosenSpecialistId: string | null;
  onChoose: (id: string) => void;
}) {
  const todayDate = todayIso();
  const { slots } = useClientAvailability(
    tenantSlug,
    serviceId,
    branchId,
    todayDate,
    null,
  );

  // De-duplicar especialistas por id usando todos los slots de hoy.
  const specialists = useMemo(() => {
    const map = new Map<string, ClientSpecialistOption>();
    for (const slot of slots) {
      for (const option of slot.available_specialists) {
        if (!map.has(option.specialist_id)) {
          map.set(option.specialist_id, option);
        }
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => b.specialist_rating - a.specialist_rating,
    );
  }, [slots]);

  return (
    <section className="space-y-2">
      <h3 className="text-base font-semibold">Elige tu especialista</h3>
      <SpecialistPicker
        specialists={specialists}
        selectedId={chosenSpecialistId}
        onSelect={onChoose}
      />
    </section>
  );
}

interface ClientSpecialistOption {
  specialist_id: string;
  specialist_name: string;
  specialist_avatar_url: string | null;
  specialist_rating: number;
  specialist_total_ratings: number;
}
