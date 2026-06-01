"use client";

import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Heart,
  Home,
  Scissors,
  Search,
  Sparkles,
  User,
} from "lucide-react";
import {
  type ClientAppSettingsShape,
  getClientAppThemeStyle,
  resolveClientAppTheme,
} from "@/features/client-app/templates";
import { cn } from "@/lib/utils";

type PreviewScreen = "home" | "services" | "booking" | "success" | "profile";

interface ClientAppPreviewProps {
  settings: Partial<ClientAppSettingsShape>;
  screen: PreviewScreen;
  tenantName: string;
  className?: string;
}

const SERVICES = [
  { name: "Balayage premium", price: "$95", duration: "120 min" },
  { name: "Corte signature", price: "$45", duration: "60 min" },
  { name: "Manicura rusa", price: "$38", duration: "75 min" },
];

export function ClientAppPreview({
  settings,
  screen,
  tenantName,
  className,
}: ClientAppPreviewProps) {
  const resolved = resolveClientAppTheme(settings);
  const style = getClientAppThemeStyle(settings);
  const brandName = settings.brand_name || tenantName;
  const title = settings.welcome_title || "Agenda tu proxima cita";
  const subtitle =
    settings.welcome_subtitle ||
    "Explora servicios, reserva horarios y revisa tu historial.";
  const heroImage = settings.hero_image_url || resolved.template.heroImage;
  const isBarber = resolved.template.id === "barber";

  return (
    <div
      className={cn(
        "mx-auto h-[700px] w-[340px] overflow-hidden border bg-[var(--client-bg)] text-[var(--client-fg)] shadow-2xl",
        className,
      )}
      style={{
        ...style,
        borderColor: "var(--client-border)",
        borderRadius: "32px",
        fontFamily: "var(--client-font-body)",
      }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-5 pt-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--client-fg-muted)]">
              {brandName}
            </p>
            <h3
              className={cn(
                "mt-1 text-xl font-semibold leading-none",
                isBarber && "uppercase tracking-[0.12em]",
              )}
              style={{ fontFamily: "var(--client-font-display)" }}
            >
              Hola, Andrea
            </h3>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--client-surface)] shadow-[var(--client-shadow-soft)]">
            <User className="h-5 w-5" />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden px-5 pb-3 pt-4">
          {screen === "home" ? (
            <HomePreview
              title={title}
              subtitle={subtitle}
              heroImage={heroImage}
              isBarber={isBarber}
            />
          ) : null}
          {screen === "services" ? (
            <ServicesPreview isBarber={isBarber} />
          ) : null}
          {screen === "booking" ? <BookingPreview isBarber={isBarber} /> : null}
          {screen === "success" ? <SuccessPreview isBarber={isBarber} /> : null}
          {screen === "profile" ? <ProfilePreview isBarber={isBarber} /> : null}
        </div>

        <div className="grid h-16 grid-cols-4 border-t border-[var(--client-border)] bg-[var(--client-surface)] px-2">
          {[
            [Home, "Inicio"],
            [Scissors, "Servicios"],
            [Heart, "Favoritos"],
            [User, "Perfil"],
          ].map(([Icon, label], index) => (
            <div
              key={label as string}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[10px] text-[var(--client-fg-muted)]",
                index === 0 &&
                  screen === "home" &&
                  "text-[var(--client-primary)]",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label as string}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HomePreview({
  title,
  subtitle,
  heroImage,
  isBarber,
}: {
  title: string;
  subtitle: string;
  heroImage: string;
  isBarber: boolean;
}) {
  return (
    <div className="space-y-4">
      <div
        className="relative overflow-hidden rounded-[var(--client-rad-xl)] bg-[var(--client-surface)] shadow-[var(--client-shadow)]"
        style={{ minHeight: 205 }}
      >
        <img
          src={heroImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--client-bg)] via-transparent to-transparent" />
        <div className="relative flex h-full min-h-[205px] flex-col justify-end p-5">
          <p className="mb-2 text-xs font-medium text-[var(--client-primary)]">
            Proxima cita
          </p>
          <h2
            className={cn(
              "text-3xl font-semibold leading-[0.95]",
              isBarber && "uppercase tracking-[0.08em]",
            )}
            style={{ fontFamily: "var(--client-font-display)" }}
          >
            {title}
          </h2>
          <p className="mt-3 text-sm leading-5 text-[var(--client-fg-muted)]">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {["Cabello", "Unas", "Piel", "Spa"].map((item) => (
          <div
            key={item}
            className="rounded-[var(--client-rad-lg)] bg-[var(--client-surface)] p-4 shadow-[var(--client-shadow-soft)]"
          >
            <Sparkles className="mb-3 h-4 w-4 text-[var(--client-accent)]" />
            <p className="text-sm font-semibold">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ServicesPreview({ isBarber }: { isBarber: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex h-11 items-center gap-2 rounded-[var(--client-rad-lg)] bg-[var(--client-surface)] px-4">
        <Search className="h-4 w-4 text-[var(--client-fg-muted)]" />
        <span className="text-sm text-[var(--client-fg-muted)]">
          Buscar servicio
        </span>
      </div>
      {SERVICES.map((service, index) => (
        <div
          key={service.name}
          className="rounded-[var(--client-rad-lg)] bg-[var(--client-surface)] p-4 shadow-[var(--client-shadow-soft)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4
                className={cn(
                  "font-semibold leading-tight",
                  isBarber && "uppercase tracking-[0.06em]",
                )}
                style={{ fontFamily: "var(--client-font-display)" }}
              >
                {service.name}
              </h4>
              <p className="mt-2 flex items-center gap-1 text-xs text-[var(--client-fg-muted)]">
                <Clock className="h-3.5 w-3.5" />
                {service.duration}
              </p>
            </div>
            <span className="rounded-full bg-[var(--client-surface-alt)] px-3 py-1 text-xs font-semibold">
              {service.price}
            </span>
          </div>
          {index === 0 ? (
            <div className="mt-3 h-2 rounded-full bg-[var(--client-primary)]" />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function BookingPreview({ isBarber }: { isBarber: boolean }) {
  return (
    <div className="space-y-4">
      <h2
        className={cn(
          "text-2xl font-semibold",
          isBarber && "uppercase tracking-[0.08em]",
        )}
        style={{ fontFamily: "var(--client-font-display)" }}
      >
        Reserva
      </h2>
      <div className="grid grid-cols-4 gap-2">
        {["Hoy", "Mar", "Mie", "Jue"].map((day, index) => (
          <div
            key={day}
            className={cn(
              "rounded-[var(--client-rad-md)] border border-[var(--client-border)] p-3 text-center text-xs",
              index === 1 &&
                "border-[var(--client-primary)] bg-[var(--client-primary)] text-[var(--client-primary-fg)]",
            )}
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {["10:00", "11:30", "14:00", "15:30", "17:00", "18:30"].map(
          (time, index) => (
            <div
              key={time}
              className={cn(
                "rounded-[var(--client-rad-md)] bg-[var(--client-surface)] p-3 text-center text-sm",
                index === 2 &&
                  "bg-[var(--client-accent)] text-[var(--client-accent-fg)]",
              )}
            >
              {time}
            </div>
          ),
        )}
      </div>
      <div className="rounded-[var(--client-rad-lg)] bg-[var(--client-surface)] p-4">
        <p className="text-xs text-[var(--client-fg-muted)]">Seleccion</p>
        <p className="mt-1 font-semibold">Balayage premium · 14:00</p>
        <p className="mt-1 text-sm text-[var(--client-fg-muted)]">
          Camila Reyes, asignacion automatica
        </p>
      </div>
    </div>
  );
}

function SuccessPreview({ isBarber }: { isBarber: boolean }) {
  return (
    <div className="grid h-full place-items-center text-center">
      <div>
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[var(--client-success)] text-[var(--client-primary-fg)]">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h2
          className={cn(
            "mt-6 text-3xl font-semibold leading-none",
            isBarber && "uppercase tracking-[0.1em]",
          )}
          style={{ fontFamily: "var(--client-font-display)" }}
        >
          Cita agendada
        </h2>
        <p className="mx-auto mt-3 max-w-[240px] text-sm text-[var(--client-fg-muted)]">
          Te enviaremos un recordatorio antes de tu visita.
        </p>
      </div>
    </div>
  );
}

function ProfilePreview({ isBarber }: { isBarber: boolean }) {
  return (
    <div className="space-y-4">
      <div className="rounded-[var(--client-rad-xl)] bg-[var(--client-surface)] p-5 text-center shadow-[var(--client-shadow-soft)]">
        <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-[var(--client-primary)] text-[var(--client-primary-fg)]">
          <User className="h-7 w-7" />
        </div>
        <h2
          className={cn(
            "text-xl font-semibold",
            isBarber && "uppercase tracking-[0.08em]",
          )}
          style={{ fontFamily: "var(--client-font-display)" }}
        >
          Andrea Molina
        </h2>
        <p className="text-sm text-[var(--client-fg-muted)]">
          andrea@email.com
        </p>
      </div>
      {[
        [CalendarDays, "Mis citas"],
        [Heart, "Favoritos"],
        [Scissors, "Servicios frecuentes"],
      ].map(([Icon, label]) => (
        <div
          key={label as string}
          className="flex items-center gap-3 rounded-[var(--client-rad-lg)] bg-[var(--client-surface)] p-4"
        >
          <Icon className="h-5 w-5 text-[var(--client-primary)]" />
          <span className="font-medium">{label as string}</span>
        </div>
      ))}
    </div>
  );
}
