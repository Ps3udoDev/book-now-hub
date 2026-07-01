// src/app/c/[tenant]/servicios/[id]/page.tsx
// Detalle del servicio + flujo de agendamiento por pasos, fiel al prototipo:
//   hero full-bleed → 1) fecha (strip horizontal) → 2) hora → 3) especialista
//   → 4) notas → CTA sticky "Reservar" → confirmacion → exito (.ics).
"use client";

import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  CreditCard,
  Download,
  Heart,
  Loader2,
  Sparkles,
  Star,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { SpecialistPicker } from "@/components/client/specialist-picker";
import {
  ClientButton,
  ClientCard,
  displayStyle,
  StepHeader,
  useClientTheme,
} from "@/components/client/themed";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useClientAvailability,
  useClientService,
} from "@/hooks/supabase/use-client-services";
import { clientServicesService } from "@/lib/services/client-services";
import { cn } from "@/lib/utils";
import { buildAppointmentIcs, downloadIcs } from "@/lib/utils/ics";
import { useClientCurrency } from "@/providers/client-currency-provider";
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

function toLocalIso(date: Date): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().substring(0, 10);
}

function todayIso(): string {
  return toLocalIso(new Date());
}

// 14 dias desde hoy para el strip de fechas del prototipo.
function buildDateStrip() {
  const days: Array<{ iso: string; wd: string; day: number; month: string }> =
    [];
  const base = new Date();
  for (let i = 0; i < 14; i++) {
    const current = new Date(base);
    current.setDate(base.getDate() + i);
    days.push({
      iso: toLocalIso(current),
      wd: current
        .toLocaleDateString("es-VE", { weekday: "short" })
        .replace(".", "")
        .toUpperCase(),
      day: current.getDate(),
      month: current
        .toLocaleDateString("es-VE", { month: "short" })
        .replace(".", "")
        .toUpperCase(),
    });
  }
  return days;
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

export default function ClientBookingPage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params.id as string;
  const { tenantSlug } = useClientTenant();
  const { isBarber } = useClientTheme();
  const { formatPrice } = useClientCurrency();

  const { service, defaultBranchId, branches, isLoading } = useClientService(
    tenantSlug,
    serviceId,
  );

  const dateStrip = useMemo(() => buildDateStrip(), []);

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
      <div className="mx-auto max-w-md space-y-4 px-5 py-6">
        <Skeleton className="h-52 w-full rounded-2xl" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  // ── Éxito ────────────────────────────────────────────────────────────────
  if (step === "success" && createdAppointment) {
    const confirmedSpecialist = pickSpecialistMode
      ? (selectedSlot?.available_specialists.find(
          (sp) => sp.specialist_id === chosenSpecialistId,
        )?.specialist_name ?? "Asignado")
      : (selectedSlot?.best.specialist_name ?? "Asignado");

    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 pb-28 pt-10 text-center">
        <span
          className="grid h-24 w-24 place-items-center rounded-full bg-[var(--client-surface-alt)] text-[var(--client-success)]"
          style={{
            boxShadow:
              "0 0 0 8px var(--client-surface), 0 0 0 9px var(--client-border)",
          }}
        >
          <Check className="h-12 w-12" strokeWidth={2.5} />
        </span>
        <h1
          className="mb-1.5 mt-6 text-[30px] font-semibold leading-tight text-[var(--client-fg)]"
          style={displayStyle(isBarber)}
        >
          ¡Cita confirmada!
        </h1>
        <p className="mb-6 max-w-[280px] text-sm leading-relaxed text-[var(--client-fg-muted)]">
          Te enviaremos un recordatorio antes de tu visita. Tienes el evento
          listo para tu calendario.
        </p>

        <ClientCard className="w-full max-w-[320px] p-4 text-left">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--client-fg-muted)]">
            Resumen
          </p>
          <p
            className="mb-3 mt-1.5 text-lg font-semibold leading-tight text-[var(--client-fg)]"
            style={displayStyle(isBarber)}
          >
            {service.name}
          </p>
          <SummaryRow
            icon={<Calendar className="h-4 w-4" />}
            label="Fecha"
            value={formatLongDate(createdAppointment.scheduled_at)}
          />
          <SummaryRow
            icon={<Clock className="h-4 w-4" />}
            label="Hora"
            value={`${formatTime(createdAppointment.scheduled_at)} · ${createdAppointment.duration_minutes} min`}
          />
          <SummaryRow
            icon={<User className="h-4 w-4" />}
            label="Especialista"
            value={confirmedSpecialist}
          />
          <SummaryRow
            icon={<CreditCard className="h-4 w-4" />}
            label="Total"
            value={formatPrice(service.base_price, service.currency_code)}
            last
          />
        </ClientCard>

        <div className="mt-4 grid w-full max-w-[320px] grid-cols-1 gap-2.5">
          <ClientButton variant="surface" onClick={handleDownloadIcs}>
            <Download className="h-4 w-4" />
            Agregar a calendario (.ics)
          </ClientButton>
          <ClientButton onClick={() => router.replace(`/c/${tenantSlug}`)}>
            Volver a inicio
          </ClientButton>
        </div>
      </div>
    );
  }

  // ── Confirmación ─────────────────────────────────────────────────────────
  if (step === "confirm" && selectedSlot) {
    const specialistId = pickSpecialistMode
      ? chosenSpecialistId
      : selectedSlot.best.specialist_id;
    const specialist =
      selectedSlot.available_specialists.find(
        (sp) => sp.specialist_id === specialistId,
      ) ?? selectedSlot.best;

    return (
      <div className="mx-auto max-w-md space-y-5 px-5 pb-28 pt-4">
        <button
          type="button"
          onClick={() => setStep("select_slot")}
          className="grid h-10 w-10 place-items-center rounded-full border border-[var(--client-border)] bg-[var(--client-surface)] text-[var(--client-fg)]"
          aria-label="Volver"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <h1
          className="text-[26px] font-semibold leading-tight text-[var(--client-fg)]"
          style={displayStyle(isBarber)}
        >
          Confirmar cita
        </h1>

        <ClientCard className="space-y-0 p-4">
          <ConfirmRow label="Servicio" value={service.name} />
          <ConfirmRow label="Sucursal" value={branch?.name ?? "—"} />
          <ConfirmRow
            label="Fecha"
            value={formatLongDate(selectedSlot.slot_start)}
          />
          <ConfirmRow
            label="Hora"
            value={`${formatTime(selectedSlot.slot_start)} (${service.duration_minutes} min)`}
          />
          <ConfirmRow label="Especialista" value={specialist.specialist_name} />
          {notes.trim() ? <ConfirmRow label="Notas" value={notes} /> : null}
          <ConfirmRow
            label="Total estimado"
            value={formatPrice(service.base_price, service.currency_code)}
            emphasis
            last
          />
        </ClientCard>

        <ClientButton
          className="h-[52px] w-full"
          onClick={handleConfirm}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Confirmando…
            </>
          ) : (
            "Confirmar cita"
          )}
        </ClientButton>
      </div>
    );
  }

  // ── Selección (hero + pasos) ─────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-md pb-36">
      {/* Hero full-bleed con back flotante */}
      <div className="relative h-[240px]">
        {service.image_url ? (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${service.image_url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-[var(--client-surface-alt)]">
            <Sparkles className="h-12 w-12 text-[var(--client-fg-faint)]" />
          </div>
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, var(--client-bg) 100%)",
          }}
        />
        <Link
          href={`/c/${tenantSlug}/servicios`}
          aria-label="Volver a servicios"
          className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/95 text-black"
        >
          <ArrowLeft className="h-[18px] w-[18px]" />
        </Link>
        <span className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/95 text-black">
          <Heart className="h-[18px] w-[18px]" />
        </span>
      </div>

      <div className="px-5">
        {/* Titulo + meta + precio */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {service.category ? (
              <p className="text-[11.5px] font-semibold uppercase tracking-wider text-[var(--client-fg-muted)]">
                {service.category}
              </p>
            ) : null}
            <h1
              className="mt-1 text-[26px] font-semibold leading-[1.15] text-[var(--client-fg)]"
              style={displayStyle(isBarber)}
            >
              {service.name}
            </h1>
            <div className="mt-2 flex items-center gap-2.5 text-[13px] text-[var(--client-fg-muted)]">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {service.duration_minutes} min
              </span>
              <span className="h-[3px] w-[3px] rounded-full bg-[var(--client-fg-faint)]" />
              <span className="inline-flex items-center gap-1 font-semibold text-[var(--client-success)]">
                <Star className="h-3.5 w-3.5" />
                Reserva online
              </span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p
              className="text-[24px] font-bold leading-none tracking-tight text-[var(--client-fg)]"
              style={{ fontFamily: "var(--client-font-display)" }}
            >
              {formatPrice(service.base_price, service.currency_code)}
            </p>
            <p className="mt-1 text-[11.5px] text-[var(--client-fg-muted)]">
              desde
            </p>
          </div>
        </div>

        {service.description ? (
          <p className="mt-3.5 text-sm leading-relaxed text-[var(--client-fg-muted)]">
            {service.description}
          </p>
        ) : null}

        {/* Sucursal (solo si hay varias) */}
        {branches.length > 1 ? (
          <>
            <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-[var(--client-fg-faint)]">
              Sucursal
            </p>
            <Select value={branchId ?? undefined} onValueChange={setBranchId}>
              <SelectTrigger className="h-12 border-[var(--client-border)] bg-[var(--client-surface)]">
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
          </>
        ) : null}

        {/* PASO 1: fecha */}
        <StepHeader num={1} title="Elige fecha" />
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1.5">
          {dateStrip.map((d) => {
            const on = date === d.iso;
            return (
              <button
                key={d.iso}
                type="button"
                onClick={() => {
                  setDate(d.iso);
                  setSelectedSlotStart(null);
                }}
                className={cn(
                  "flex w-[58px] shrink-0 flex-col items-center gap-0.5 border py-2.5 transition-colors",
                  on
                    ? "border-[var(--client-primary)] bg-[var(--client-primary)] text-[var(--client-primary-fg)]"
                    : "border-[var(--client-border)] bg-[var(--client-surface)] text-[var(--client-fg)]",
                )}
                style={{ borderRadius: "var(--client-rad-md)" }}
              >
                <span className="text-[10.5px] tracking-wide opacity-80">
                  {d.wd}
                </span>
                <span
                  className="text-xl font-semibold"
                  style={{ fontFamily: "var(--client-font-display)" }}
                >
                  {d.day}
                </span>
                <span className="text-[10px] opacity-70">{d.month}</span>
              </button>
            );
          })}
        </div>

        {/* PASO 2: hora */}
        <StepHeader num={2} title="Hora disponible" />
        {slotsLoading ? (
          <div className="grid grid-cols-4 gap-2">
            {SLOT_SKELETON_KEYS.map((key) => (
              <Skeleton key={key} className="h-11 rounded-lg" />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <p className="py-3 text-sm text-[var(--client-fg-muted)]">
            {pickSpecialistMode && !chosenSpecialistId
              ? "Selecciona un especialista para ver horarios"
              : "No hay horarios disponibles para esta fecha"}
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {slots.map((slot) => {
              const isSelected = slot.slot_start === selectedSlotStart;
              return (
                <button
                  key={slot.slot_start}
                  type="button"
                  onClick={() => setSelectedSlotStart(slot.slot_start)}
                  className={cn(
                    "border py-2.5 text-[13px] font-semibold transition-colors",
                    isSelected
                      ? "border-[var(--client-primary)] bg-[var(--client-primary)] text-[var(--client-primary-fg)]"
                      : "border-[var(--client-border)] bg-[var(--client-surface)] text-[var(--client-fg)] hover:bg-[var(--client-surface-alt)]",
                  )}
                  style={{ borderRadius: "var(--client-rad-sm)" }}
                >
                  {formatTime(slot.slot_start)}
                </button>
              );
            })}
          </div>
        )}

        {/* PASO 3: especialista */}
        <StepHeader num={3} title="Especialista" />
        <button
          type="button"
          onClick={() => {
            const next = !pickSpecialistMode;
            setPickSpecialistMode(next);
            setSelectedSlotStart(null);
            if (!next) setChosenSpecialistId(null);
          }}
          className="flex w-full items-center gap-3 border border-[var(--client-border)] bg-[var(--client-surface)] p-3.5 text-left"
          style={{ borderRadius: "var(--client-rad-lg)" }}
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-[var(--client-fg)]">
              Prefiero elegir especialista
            </span>
            <span className="block text-xs text-[var(--client-fg-muted)]">
              Si lo dejas en off asignamos al mejor evaluado disponible.
            </span>
          </span>
          <span
            className="relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors"
            style={{
              background: pickSpecialistMode
                ? "var(--client-primary)"
                : "var(--client-surface-alt)",
            }}
          >
            <span
              className="absolute top-[3px] h-5 w-5 rounded-full shadow transition-all"
              style={{
                left: pickSpecialistMode ? 23 : 3,
                background: pickSpecialistMode
                  ? "var(--client-primary-fg)"
                  : "var(--client-surface)",
              }}
            />
          </span>
        </button>

        {pickSpecialistMode ? (
          <div className="mt-3">
            <SpecialistOptions
              tenantSlug={tenantSlug}
              serviceId={serviceId}
              branchId={branchId}
              date={date}
              chosenSpecialistId={chosenSpecialistId}
              onChoose={(id) => {
                setChosenSpecialistId(id);
                setSelectedSlotStart(null);
              }}
            />
          </div>
        ) : null}

        {/* PASO 4: notas */}
        <StepHeader num={4} title="Notas (opcional)" />
        <textarea
          placeholder="¿Algo que debamos saber? Alergias, preferencias…"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="min-h-[80px] w-full resize-none border border-[var(--client-border)] bg-[var(--client-surface)] p-3.5 text-sm text-[var(--client-fg)] outline-none placeholder:text-[var(--client-fg-faint)]"
          style={{ borderRadius: "var(--client-rad-md)" }}
        />

        {selectedSlot ? (
          <ClientCard className="mt-4 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--client-fg-muted)]">
              Tu selección
            </p>
            <p className="mt-1 font-semibold capitalize text-[var(--client-fg)]">
              {formatLongDate(selectedSlot.slot_start)} ·{" "}
              {formatTime(selectedSlot.slot_start)}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--client-fg-muted)]">
              <User className="h-4 w-4 text-[var(--client-primary)]" />
              {pickSpecialistMode
                ? (selectedSlot.available_specialists.find(
                    (sp) => sp.specialist_id === chosenSpecialistId,
                  )?.specialist_name ?? "—")
                : `${selectedSlot.best.specialist_name} (asignación automática)`}
            </p>
          </ClientCard>
        ) : null}
      </div>

      {/* CTA sticky */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--client-border)] bg-[var(--client-bg)]">
        <div className="mx-auto flex max-w-md items-center gap-3.5 px-5 pb-5 pt-3">
          <div className="shrink-0">
            <p className="text-[11px] uppercase tracking-wide text-[var(--client-fg-muted)]">
              Total
            </p>
            <p
              className="text-[22px] font-bold leading-none text-[var(--client-fg)]"
              style={{ fontFamily: "var(--client-font-display)" }}
            >
              {formatPrice(service.base_price, service.currency_code)}
            </p>
          </div>
          <ClientButton
            className="h-[52px] flex-1"
            disabled={!selectedSlot}
            onClick={() => setStep("confirm")}
          >
            {selectedSlot
              ? `Reservar · ${formatTime(selectedSlot.slot_start)}`
              : "Selecciona hora"}
          </ClientButton>
        </div>
      </div>
    </div>
  );
}

function ConfirmRow({
  label,
  value,
  emphasis,
  last,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className="flex items-start justify-between gap-3 py-2.5"
      style={
        last ? undefined : { borderBottom: "1px solid var(--client-border)" }
      }
    >
      <span className="shrink-0 text-sm text-[var(--client-fg-muted)]">
        {label}
      </span>
      <span
        className={cn(
          "text-right text-sm capitalize",
          emphasis
            ? "font-bold text-[var(--client-primary)]"
            : "font-medium text-[var(--client-fg)]",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 py-2"
      style={
        last ? undefined : { borderBottom: "1px solid var(--client-border)" }
      }
    >
      <span className="shrink-0 text-[var(--client-fg-muted)]">{icon}</span>
      <span className="flex-1 text-[13px] text-[var(--client-fg-muted)]">
        {label}
      </span>
      <span className="text-right text-[13.5px] font-semibold capitalize text-[var(--client-fg)]">
        {value}
      </span>
    </div>
  );
}

function SpecialistOptions({
  tenantSlug,
  serviceId,
  branchId,
  date,
  chosenSpecialistId,
  onChoose,
}: {
  tenantSlug: string;
  serviceId: string;
  branchId: string | null;
  date: string;
  chosenSpecialistId: string | null;
  onChoose: (id: string) => void;
}) {
  const { slots } = useClientAvailability(
    tenantSlug,
    serviceId,
    branchId,
    date,
    null,
  );

  // De-duplicar especialistas por id usando los slots de la fecha elegida.
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
    <SpecialistPicker
      specialists={specialists}
      selectedId={chosenSpecialistId}
      onSelect={onChoose}
    />
  );
}

interface ClientSpecialistOption {
  specialist_id: string;
  specialist_name: string;
  specialist_avatar_url: string | null;
  specialist_rating: number;
  specialist_total_ratings: number;
}
