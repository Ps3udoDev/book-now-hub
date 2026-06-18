// src/components/client/themed.tsx
// Contexto de tema + primitivas visuales de la app del cliente, fieles al
// prototipo de Claude Design (app-client-elviz-studio). Todas las primitivas
// consumen las variables --client-* que aplica el layout de /c/[tenant].
"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  createContext,
  type ReactNode,
  useContext,
} from "react";
import {
  type ClientAppSettingsShape,
  type ClientAppTemplate,
  type ClientAppTemplateSlug,
  getClientAppTemplate,
} from "@/features/client-app/templates";
import { cn } from "@/lib/utils";

interface ClientThemeContextValue {
  settings: Partial<ClientAppSettingsShape> | null;
  template: ClientAppTemplate;
  slug: ClientAppTemplateSlug;
  isBarber: boolean;
  heroImage: string;
  brandName: string | null;
}

const ClientThemeContext = createContext<ClientThemeContextValue | null>(null);

export function ClientThemeProvider({
  settings,
  children,
}: {
  settings: Partial<ClientAppSettingsShape> | null | undefined;
  children: ReactNode;
}) {
  const template = getClientAppTemplate(settings?.template_slug);
  return (
    <ClientThemeContext.Provider
      value={{
        settings: settings ?? null,
        template,
        slug: template.id,
        isBarber: template.id === "barber",
        heroImage: settings?.hero_image_url || template.heroImage,
        brandName: settings?.brand_name ?? null,
      }}
    >
      {children}
    </ClientThemeContext.Provider>
  );
}

export function useClientTheme(): ClientThemeContextValue {
  const ctx = useContext(ClientThemeContext);
  if (ctx) return ctx;
  // Fallback seguro para paginas renderizadas fuera del provider.
  const template = getClientAppTemplate(null);
  return {
    settings: null,
    template,
    slug: template.id,
    isBarber: false,
    heroImage: template.heroImage,
    brandName: null,
  };
}

// Estilo de titular con la fuente display del template (+ tracking barber).
export function displayStyle(isBarber: boolean): CSSProperties {
  return {
    fontFamily: "var(--client-font-display)",
    letterSpacing: isBarber ? "0.08em" : "-0.02em",
    textTransform: isBarber ? "uppercase" : "none",
  };
}

export function Display({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const { isBarber } = useClientTheme();
  return (
    <span className={className} style={{ ...displayStyle(isBarber), ...style }}>
      {children}
    </span>
  );
}

export function ClientCard({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn(
        "border border-[var(--client-border)] bg-[var(--client-surface)] shadow-[var(--client-shadow-soft)]",
        className,
      )}
      style={{ borderRadius: "var(--client-rad-lg)", ...style }}
    >
      {children}
    </div>
  );
}

interface ClientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "surface";
}

export function ClientButton({
  variant = "primary",
  className,
  children,
  ...props
}: ClientButtonProps) {
  const { isBarber } = useClientTheme();
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "bg-[var(--client-primary)] text-[var(--client-primary-fg)] shadow-[var(--client-shadow)] hover:opacity-90",
        variant === "ghost" &&
          "border border-[var(--client-border)] bg-transparent text-[var(--client-fg)] hover:bg-[var(--client-surface)]",
        variant === "surface" &&
          "border border-[var(--client-border)] bg-[var(--client-surface)] text-[var(--client-fg)] hover:bg-[var(--client-surface-alt)]",
        className,
      )}
      style={{
        borderRadius: "var(--client-rad-md)",
        letterSpacing: isBarber ? "0.1em" : "0.01em",
        textTransform: isBarber ? "uppercase" : "none",
      }}
    >
      {children}
    </button>
  );
}

export function ClientChip({
  active,
  onClick,
  children,
  className,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition",
        active
          ? "border-[var(--client-primary)] bg-[var(--client-primary)] text-[var(--client-primary-fg)]"
          : "border-[var(--client-border)] bg-[var(--client-surface)] text-[var(--client-fg)] hover:bg-[var(--client-surface-alt)]",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function SectionHeading({
  title,
  action,
  href,
}: {
  title: string;
  action?: string;
  href?: string;
}) {
  const { isBarber } = useClientTheme();
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h3
        className="text-lg font-semibold text-[var(--client-fg)]"
        style={displayStyle(isBarber)}
      >
        {title}
      </h3>
      {action && href ? (
        <Link
          href={href}
          className="text-[13px] font-medium text-[var(--client-fg-muted)] hover:text-[var(--client-fg)]"
        >
          {action} →
        </Link>
      ) : null}
    </div>
  );
}

export function ScreenHeader({
  title,
  right,
  backHref,
}: {
  title: string;
  right?: ReactNode;
  backHref?: string;
}) {
  const { isBarber } = useClientTheme();
  return (
    <div className="flex items-center gap-3 py-2">
      {backHref ? (
        <Link
          href={backHref}
          aria-label="Volver"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--client-border)] bg-[var(--client-surface)] text-[var(--client-fg)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
      ) : null}
      <h1
        className="flex-1 text-[22px] font-semibold leading-tight text-[var(--client-fg)]"
        style={displayStyle(isBarber)}
      >
        {title}
      </h1>
      {right}
    </div>
  );
}

export function StepHeader({ num, title }: { num: number; title: string }) {
  const { isBarber } = useClientTheme();
  return (
    <div className="mb-2.5 mt-6 flex items-center gap-2.5">
      <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-[var(--client-surface-alt)] text-[11px] font-bold text-[var(--client-fg)]">
        {num}
      </span>
      <h3
        className="text-base font-semibold text-[var(--client-fg)]"
        style={displayStyle(isBarber)}
      >
        {title}
      </h3>
    </div>
  );
}

// Campo de formulario con icono (pantallas de auth, fiel al prototipo).
export function ClientField({
  icon,
  className,
  children,
}: {
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex h-[52px] items-center gap-2.5 border border-[var(--client-border)] bg-[var(--client-surface)] px-3.5",
        className,
      )}
      style={{ borderRadius: "var(--client-rad-md)" }}
    >
      {icon ? (
        <span className="shrink-0 text-[var(--client-fg-muted)]">{icon}</span>
      ) : null}
      {children}
    </div>
  );
}

// Input sin estilos propios para usar dentro de ClientField.
export const clientInputClass =
  "h-full min-w-0 flex-1 border-0 bg-transparent text-[15px] text-[var(--client-fg)] outline-none placeholder:text-[var(--client-fg-faint)]";

export function ClientDivider({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-xs text-[var(--client-fg-faint)]">
      <span className="h-px flex-1 bg-[var(--client-border)]" />
      {label}
      {label ? (
        <span className="h-px flex-1 bg-[var(--client-border)]" />
      ) : null}
    </div>
  );
}

// Banda hero de las pantallas de auth: imagen del template + degradado + titular.
export function AuthHero({
  title,
  subtitle,
}: {
  title: ReactNode;
  subtitle?: string;
}) {
  const { heroImage, isBarber } = useClientTheme();
  return (
    <div
      className="relative h-[260px] shrink-0 overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, var(--client-surface-alt) 0%, var(--client-bg) 100%)",
      }}
    >
      <div
        className="absolute inset-0 opacity-80"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, transparent 35%, var(--client-bg) 100%)",
        }}
      />
      <div
        className="absolute left-6 right-6 top-14 text-[34px] font-medium leading-[1.08] text-[var(--client-fg)]"
        style={displayStyle(isBarber)}
      >
        {title}
      </div>
      {subtitle ? (
        <p className="absolute bottom-4 left-6 right-6 text-sm text-[var(--client-fg-muted)]">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
