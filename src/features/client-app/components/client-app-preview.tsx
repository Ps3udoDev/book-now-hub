"use client";

// Preview en vivo de la app del cliente, fiel al prototipo de Claude Design
// (app-client-elviz-studio). Renderiza 5 pantallas (home, services, booking,
// success, profile) con variantes visuales por template y contenido mock por
// industria. Todo es estatico: solo lectura para el editor de settings.

import {
  ArrowLeft,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  Globe,
  Heart,
  Home,
  LogOut,
  Mail,
  Search,
  Settings,
  Share2,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  User,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import {
  densitySpec,
  type PreviewContent,
  previewContent,
  previewDays,
  previewSlots,
} from "@/features/client-app/preview-content";
import {
  type ClientAppSettingsShape,
  type ClientAppTemplateSlug,
  type ResolvedClientAppTheme,
  resolveClientAppTheme,
} from "@/features/client-app/templates";
import { cn } from "@/lib/utils";

export type ClientAppPreviewScreen =
  | "home"
  | "services"
  | "booking"
  | "success"
  | "profile";

type Tokens = ResolvedClientAppTheme["tokens"];
type Density = (typeof densitySpec)["comfortable"];

interface Ctx {
  tk: Tokens;
  c: PreviewContent;
  D: Density;
  slug: ClientAppTemplateSlug;
  mode: "light" | "dark";
}

interface ClientAppPreviewProps {
  settings: Partial<ClientAppSettingsShape>;
  screen: ClientAppPreviewScreen;
  tenantName: string;
  width?: number;
  height?: number;
  className?: string;
}

const cover = (url: string): CSSProperties => ({
  backgroundImage: `url(${url})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
});

export function ClientAppPreview({
  settings,
  screen,
  tenantName,
  width = 360,
  height = 720,
  className,
}: ClientAppPreviewProps) {
  const resolved = resolveClientAppTheme(settings);
  const tk = resolved.tokens;
  const slug = resolved.template.id;
  const c = previewContent[slug];
  const D = densitySpec[resolved.density];
  const ctx: Ctx = { tk, c, D, slug, mode: resolved.mode };

  const brandName = settings.brand_name || tenantName || c.appName;
  const heroImage = settings.hero_image_url || c.nextAppt.img;
  const welcomeTitle = settings.welcome_title || "";
  const welcomeSubtitle = settings.welcome_subtitle || "";

  const showNav = screen === "home" || screen === "services";

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{
        width,
        height,
        background: tk.bg,
        color: tk.fg,
        fontFamily: tk.fontBody,
      }}
    >
      {screen === "home" ? (
        <HomeScreen
          ctx={ctx}
          brandName={brandName}
          heroImage={heroImage}
          welcomeTitle={welcomeTitle}
          welcomeSubtitle={welcomeSubtitle}
        />
      ) : null}
      {screen === "services" ? <ServicesScreen ctx={ctx} /> : null}
      {screen === "booking" ? <BookingScreen ctx={ctx} /> : null}
      {screen === "success" ? <SuccessScreen ctx={ctx} /> : null}
      {screen === "profile" ? (
        <ProfileScreen ctx={ctx} brandName={brandName} />
      ) : null}
      {showNav ? (
        <BottomNav
          ctx={ctx}
          current={screen === "home" ? "home" : "services"}
        />
      ) : null}
    </div>
  );
}

// ── Chrome compartido ───────────────────────────────────────────────────────

function StatusBar({ tk }: { tk: Tokens }) {
  return (
    <div
      className="flex shrink-0 items-center justify-between px-5"
      style={{ height: 38, color: tk.fg, fontSize: 13, fontWeight: 600 }}
    >
      <span>9:41</span>
      <div className="flex items-center gap-1.5">
        <svg
          width="16"
          height="10"
          viewBox="0 0 18 11"
          fill="currentColor"
          aria-hidden="true"
        >
          <rect x="0" y="7" width="3" height="4" rx="0.6" />
          <rect x="5" y="5" width="3" height="6" rx="0.6" />
          <rect x="10" y="3" width="3" height="8" rx="0.6" />
          <rect x="15" y="0" width="3" height="11" rx="0.6" />
        </svg>
        <svg
          width="14"
          height="10"
          viewBox="0 0 16 11"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M8 11l-2-2a3 3 0 0 1 4 0l-2 2zM4 7l-2-2a8 8 0 0 1 12 0l-2 2a5 5 0 0 0-8 0z" />
        </svg>
        <div
          className="relative"
          style={{
            width: 22,
            height: 11,
            border: `1px solid ${tk.fg}`,
            borderRadius: 3,
            padding: 1,
          }}
        >
          <div
            style={{
              width: "85%",
              height: "100%",
              background: tk.fg,
              borderRadius: 1,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function BottomNav({
  ctx,
  current,
}: {
  ctx: Ctx;
  current: "home" | "services";
}) {
  const { tk, D, slug } = ctx;
  const sharp = slug === "barber";
  const tabs: Array<{ id: string; label: string; icon: ReactNode }> = [
    { id: "home", label: "Inicio", icon: <Home size={19} /> },
    { id: "services", label: "Servicios", icon: <Sparkles size={19} /> },
    { id: "shop", label: "Tienda", icon: <ShoppingBag size={19} /> },
    { id: "history", label: "Historial", icon: <Clock size={19} /> },
    { id: "profile", label: "Perfil", icon: <User size={19} /> },
  ];
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0"
      style={{
        paddingBottom: 14,
        paddingTop: 8,
        paddingInline: sharp ? 0 : 12,
        background: sharp ? tk.surface : "transparent",
        borderTop: sharp ? `1px solid ${tk.border}` : "none",
      }}
    >
      <div
        className="grid grid-cols-5 items-center"
        style={{
          height: D.navH,
          background: sharp ? "transparent" : tk.surface,
          borderRadius: sharp ? 0 : tk.radXl,
          boxShadow: sharp ? "none" : tk.shadow,
          border: sharp ? "none" : `1px solid ${tk.border}`,
          paddingInline: 6,
        }}
      >
        {tabs.map((tab) => {
          const active = current === tab.id;
          return (
            <div
              key={tab.id}
              className="flex flex-col items-center gap-1"
              style={{
                color: active ? tk.primary : tk.fgFaint,
                fontSize: 9.5,
                fontWeight: 600,
                letterSpacing: slug === "barber" ? 1 : 0.2,
                textTransform: slug === "barber" ? "uppercase" : "none",
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScreenTitle({
  ctx,
  title,
  right,
}: {
  ctx: Ctx;
  title: string;
  right?: ReactNode;
}) {
  const { tk, D, slug } = ctx;
  return (
    <div
      className="flex items-center gap-3"
      style={{ paddingInline: D.padX, paddingBlock: 8 }}
    >
      <div
        className="flex-1 leading-none"
        style={{
          fontFamily: tk.fontDisplay,
          fontSize: 21,
          fontWeight: 600,
          letterSpacing: slug === "barber" ? 2 : -0.2,
          textTransform: slug === "barber" ? "uppercase" : "none",
        }}
      >
        {title}
      </div>
      {right}
    </div>
  );
}

function SectionHeader({
  ctx,
  title,
  action,
}: {
  ctx: Ctx;
  title: string;
  action?: string;
}) {
  const { tk, slug } = ctx;
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h3
        className="m-0"
        style={{
          fontFamily: tk.fontDisplay,
          fontSize: 17,
          fontWeight: 600,
          letterSpacing: slug === "barber" ? 1.5 : -0.2,
          textTransform: slug === "barber" ? "uppercase" : "none",
          color: tk.fg,
        }}
      >
        {title}
      </h3>
      {action ? (
        <span style={{ color: tk.fgMuted, fontSize: 12, fontWeight: 500 }}>
          {action} →
        </span>
      ) : null}
    </div>
  );
}

function SurfaceCard({
  tk,
  children,
  pad = 16,
  style,
}: {
  tk: Tokens;
  children: ReactNode;
  pad?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: tk.surface,
        borderRadius: tk.radLg,
        border: `1px solid ${tk.border}`,
        boxShadow: tk.shadowSoft,
        padding: pad,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function FakeSwitch({ tk, on }: { tk: Tokens; on: boolean }) {
  return (
    <div
      className="relative shrink-0 rounded-full"
      style={{
        width: 42,
        height: 24,
        background: on ? tk.primary : tk.surfaceAlt,
      }}
    >
      <span
        className="absolute rounded-full"
        style={{
          top: 3,
          left: on ? 21 : 3,
          width: 18,
          height: 18,
          background: on ? tk.primaryFg : tk.surface,
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </div>
  );
}

// ── Home / Dashboard ────────────────────────────────────────────────────────

function HomeScreen({
  ctx,
  brandName,
  heroImage,
  welcomeTitle,
  welcomeSubtitle,
}: {
  ctx: Ctx;
  brandName: string;
  heroImage: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
}) {
  const { tk, c, D, slug } = ctx;
  return (
    <div
      className="h-full overflow-hidden"
      style={{ paddingBottom: D.navH + 28 }}
    >
      <StatusBar tk={tk} />
      <div
        className="flex items-center justify-between"
        style={{ paddingInline: D.padX, paddingTop: 6, paddingBottom: 12 }}
      >
        <div className="flex items-center gap-3">
          <div
            className="rounded-full"
            style={{
              width: 40,
              height: 40,
              border: `1px solid ${tk.border}`,
              ...cover(c.nextAppt.img),
            }}
          />
          <div>
            <div
              style={{ fontSize: 12, color: tk.fgMuted, letterSpacing: 0.2 }}
            >
              {brandName}
            </div>
            <div
              style={{
                fontFamily: tk.fontDisplay,
                fontSize: 18,
                fontWeight: 600,
                lineHeight: 1.1,
                letterSpacing: slug === "barber" ? 1.5 : -0.2,
                textTransform: slug === "barber" ? "uppercase" : "none",
              }}
            >
              Hola, {c.userName}
            </div>
          </div>
        </div>
        <div
          className="relative grid place-items-center rounded-full"
          style={{
            width: 40,
            height: 40,
            border: `1px solid ${tk.border}`,
            background: tk.surface,
          }}
        >
          <Bell size={18} />
          <span
            className="absolute rounded-full"
            style={{
              top: 8,
              right: 10,
              width: 7,
              height: 7,
              background: tk.accent,
              border: `2px solid ${tk.surface}`,
            }}
          />
        </div>
      </div>

      {welcomeTitle ? (
        <div style={{ paddingInline: D.padX, paddingBottom: 12 }}>
          <div
            style={{
              fontFamily: tk.fontDisplay,
              fontSize: 24,
              fontWeight: 500,
              lineHeight: 1.1,
              letterSpacing: slug === "barber" ? 2 : -0.4,
              textTransform: slug === "barber" ? "uppercase" : "none",
            }}
          >
            {welcomeTitle}
          </div>
          {welcomeSubtitle ? (
            <p
              className="m-0"
              style={{
                marginTop: 6,
                fontSize: 12.5,
                lineHeight: 1.5,
                color: tk.fgMuted,
              }}
            >
              {welcomeSubtitle}
            </p>
          ) : null}
        </div>
      ) : null}

      <NextApptCard ctx={ctx} heroImage={heroImage} />

      <div style={{ paddingInline: D.padX, marginTop: 18 }}>
        <SectionHeader ctx={ctx} title="Categorías" action="Ver todo" />
        <div
          className="flex overflow-hidden"
          style={{ gap: 10, paddingBottom: 4 }}
        >
          {c.categories.slice(0, 4).map((cat) => (
            <div
              key={cat.id}
              className="flex shrink-0 flex-col items-center"
              style={{
                width: 74,
                padding: "12px 4px",
                gap: 7,
                background: tk.surface,
                border: `1px solid ${tk.border}`,
                borderRadius: tk.radLg,
              }}
            >
              <div
                className="grid place-items-center"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: tk.radMd,
                  background: tk.surfaceAlt,
                  fontSize: 16,
                }}
              >
                {cat.icon}
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 500 }}>
                {cat.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ paddingInline: D.padX, marginTop: 18 }}>
        <SectionHeader ctx={ctx} title="Favoritos" action="Ver todo" />
        <div className="flex overflow-hidden" style={{ gap: 10 }}>
          {c.services
            .filter((service) => service.featured)
            .map((service) => (
              <div
                key={service.id}
                className="shrink-0 overflow-hidden"
                style={{
                  width: 150,
                  background: tk.surface,
                  border: `1px solid ${tk.border}`,
                  borderRadius: tk.radLg,
                }}
              >
                <div
                  className="relative"
                  style={{ height: 90, ...cover(service.img) }}
                >
                  <span
                    className="absolute rounded-full"
                    style={{
                      top: 7,
                      left: 7,
                      padding: "2px 7px",
                      background: tk.accent,
                      color: tk.accentFg,
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: 0.4,
                    }}
                  >
                    DESTACADO
                  </span>
                </div>
                <div style={{ padding: 10 }}>
                  <div
                    className="overflow-hidden"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      lineHeight: 1.25,
                      height: 30,
                    }}
                  >
                    {service.name}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span style={{ fontSize: 10.5, color: tk.fgMuted }}>
                      {service.dur} min
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>
                      {c.currency}
                      {service.price}
                    </span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      <div style={{ paddingInline: D.padX, marginTop: 18 }}>
        <SectionHeader ctx={ctx} title="Reciente" action="Historial" />
        <SurfaceCard tk={tk} pad={0}>
          {c.history.map((entry, index) => (
            <div
              key={entry.service}
              className="flex items-center gap-3"
              style={{
                padding: "12px 14px",
                borderBottom:
                  index < c.history.length - 1
                    ? `1px solid ${tk.border}`
                    : "none",
              }}
            >
              <div
                className="grid place-items-center"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: tk.radMd,
                  background: tk.surfaceAlt,
                  color: tk.success,
                }}
              >
                <CheckCircle2 size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className="truncate"
                  style={{ fontSize: 13, fontWeight: 600 }}
                >
                  {entry.service}
                </div>
                <div style={{ fontSize: 11, color: tk.fgMuted }}>
                  {entry.date} · {entry.status}
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {c.currency}
                {entry.price}
              </div>
            </div>
          ))}
        </SurfaceCard>
      </div>
    </div>
  );
}

function NextApptCard({ ctx, heroImage }: { ctx: Ctx; heroImage: string }) {
  const { tk, c, D, slug } = ctx;
  const a = c.nextAppt;

  if (slug === "wellness") {
    return (
      <div style={{ marginInline: D.padX }}>
        <SurfaceCard tk={tk}>
          <div
            className="uppercase"
            style={{ fontSize: 10, letterSpacing: 2, color: tk.fgMuted }}
          >
            Tu próxima cita
          </div>
          <div
            style={{
              fontFamily: tk.fontDisplay,
              fontSize: 22,
              fontWeight: 400,
              lineHeight: 1.15,
              marginTop: 6,
              marginBottom: 8,
              fontStyle: "italic",
            }}
          >
            {a.service}
          </div>
          <div
            className="flex items-center gap-2"
            style={{ fontSize: 12.5, color: tk.fgMuted }}
          >
            <Calendar size={13} />
            {a.date} · {a.time}
            <span
              className="rounded-full"
              style={{ width: 3, height: 3, background: tk.fgFaint }}
            />
            <User size={13} />
            {a.specialist}
          </div>
          <div style={{ height: 1, background: tk.border, margin: "12px 0" }} />
          <div className="flex gap-2.5">
            <div
              className="grid flex-1 place-items-center"
              style={{
                height: 38,
                background: tk.primary,
                color: tk.primaryFg,
                borderRadius: tk.radMd,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Ver detalle
            </div>
            <div
              className="grid flex-1 place-items-center"
              style={{
                height: 38,
                border: `1px solid ${tk.border}`,
                borderRadius: tk.radMd,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              Reagendar
            </div>
          </div>
        </SurfaceCard>
      </div>
    );
  }

  if (slug === "dental") {
    return (
      <div style={{ marginInline: D.padX }}>
        <SurfaceCard tk={tk} pad={14} style={{ display: "flex", gap: 12 }}>
          <div className="flex-1">
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: tk.primary,
                letterSpacing: 0.5,
              }}
            >
              PRÓXIMA CITA
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                lineHeight: 1.2,
                marginTop: 4,
              }}
            >
              {a.service}
            </div>
            <div style={{ fontSize: 12, color: tk.fgMuted, marginTop: 5 }}>
              {a.specialist}
            </div>
            <div className="mt-2.5 flex items-center gap-3">
              <span
                className="flex items-center gap-1"
                style={{ fontSize: 11.5, fontWeight: 600 }}
              >
                <Calendar size={12} />
                {a.date}
              </span>
              <span
                className="flex items-center gap-1"
                style={{ fontSize: 11.5, fontWeight: 600 }}
              >
                <Clock size={12} />
                {a.time}
              </span>
            </div>
          </div>
          <div
            className="shrink-0"
            style={{
              width: 78,
              height: 96,
              borderRadius: tk.radMd,
              ...cover(heroImage),
            }}
          />
        </SurfaceCard>
      </div>
    );
  }

  if (slug === "barber") {
    return (
      <div style={{ marginInline: D.padX }}>
        <div
          className="flex overflow-hidden"
          style={{
            background: tk.surface,
            border: `1px solid ${tk.border}`,
            borderRadius: tk.radMd,
          }}
        >
          <div style={{ width: 100, ...cover(heroImage) }} />
          <div
            className="flex-1"
            style={{
              padding: "14px 14px 12px",
              borderLeft: `2px solid ${tk.accent}`,
            }}
          >
            <div
              style={{
                fontSize: 9.5,
                letterSpacing: 2,
                color: tk.accent,
                fontWeight: 700,
              }}
            >
              NEXT BOOKING
            </div>
            <div
              className="uppercase"
              style={{
                fontFamily: tk.fontDisplay,
                fontSize: 16,
                letterSpacing: 1.5,
                fontWeight: 500,
                marginTop: 4,
                lineHeight: 1.2,
              }}
            >
              {a.service}
            </div>
            <div
              className="flex items-center gap-2"
              style={{ fontSize: 11, color: tk.fgMuted, marginTop: 7 }}
            >
              <Calendar size={12} />
              {a.date} · {a.time}
            </div>
            <div style={{ fontSize: 11, color: tk.fgMuted, marginTop: 3 }}>
              {a.specialist}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (slug === "studio") {
    return (
      <div style={{ marginInline: D.padX }}>
        <div
          className="overflow-hidden"
          style={{
            background: tk.surface,
            borderRadius: tk.radLg,
            border: `1px solid ${tk.border}`,
          }}
        >
          <div className="grid" style={{ gridTemplateColumns: "1fr 1.1fr" }}>
            <div
              className="flex flex-col justify-between"
              style={{ padding: 14, minHeight: 130 }}
            >
              <div>
                <div
                  className="uppercase"
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: tk.fgMuted,
                    letterSpacing: 1.5,
                  }}
                >
                  Próxima · {a.date}
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    lineHeight: 1.2,
                    marginTop: 5,
                    letterSpacing: -0.2,
                  }}
                >
                  {a.service}
                </div>
              </div>
              <div>
                <div
                  style={{ fontSize: 11, color: tk.fgMuted, marginBottom: 7 }}
                >
                  {a.specialist} · {a.duration} min
                </div>
                <div
                  className="inline-grid place-items-center"
                  style={{
                    height: 32,
                    paddingInline: 12,
                    background: tk.primary,
                    color: tk.primaryFg,
                    borderRadius: tk.radMd,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Ver →
                </div>
              </div>
            </div>
            <div className="relative" style={cover(heroImage)}>
              <span
                className="absolute rounded-full"
                style={{
                  top: 10,
                  right: 10,
                  padding: "3px 9px",
                  background: tk.accent,
                  color: tk.accentFg,
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {a.time}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // beauty (default) — imagen full-bleed con overlay serif
  return (
    <div style={{ marginInline: D.padX }}>
      <div
        className="relative overflow-hidden"
        style={{
          height: 170,
          borderRadius: tk.radLg,
          boxShadow: tk.shadow,
          ...cover(heroImage),
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.55) 100%)",
          }}
        />
        <span
          className="absolute rounded-full"
          style={{
            top: 12,
            left: 14,
            padding: "3px 9px",
            background: "rgba(255,255,255,0.92)",
            color: "#2a2117",
            fontSize: 9.5,
            letterSpacing: 1.5,
            fontWeight: 600,
          }}
        >
          PRÓXIMA CITA
        </span>
        <div
          className="absolute"
          style={{ bottom: 12, left: 14, right: 14, color: "#fff" }}
        >
          <div
            style={{
              fontFamily: tk.fontDisplay,
              fontSize: 20,
              fontWeight: 500,
              lineHeight: 1.15,
              fontStyle: "italic",
            }}
          >
            {a.service}
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span style={{ fontSize: 11.5, opacity: 0.9 }}>
              {a.date} · {a.time} · {a.specialist}
            </span>
            <span
              className="rounded-full"
              style={{
                background: "rgba(255,255,255,0.95)",
                color: "#2a2117",
                padding: "6px 11px",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              Ver →
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Servicios ───────────────────────────────────────────────────────────────

function ServicesScreen({ ctx }: { ctx: Ctx }) {
  const { tk, c, D, slug } = ctx;
  const grid = slug === "beauty" || slug === "wellness";
  return (
    <div
      className="h-full overflow-hidden"
      style={{ paddingBottom: D.navH + 28 }}
    >
      <StatusBar tk={tk} />
      <ScreenTitle
        ctx={ctx}
        title="Servicios"
        right={
          <div
            className="grid place-items-center rounded-full"
            style={{
              width: 36,
              height: 36,
              border: `1px solid ${tk.border}`,
              background: tk.surface,
            }}
          >
            <SlidersHorizontal size={16} />
          </div>
        }
      />
      <div style={{ paddingInline: D.padX, marginTop: 2, marginBottom: 12 }}>
        <div
          className="flex items-center gap-2.5"
          style={{
            background: tk.surface,
            border: `1px solid ${tk.border}`,
            borderRadius: tk.radMd,
            paddingInline: 12,
            height: 44,
          }}
        >
          <Search size={16} style={{ color: tk.fgMuted }} />
          <span style={{ fontSize: 13.5, color: tk.fgMuted }}>
            Buscar servicios…
          </span>
        </div>
      </div>
      <div
        className="flex overflow-hidden"
        style={{
          gap: 7,
          paddingInline: D.padX,
          paddingBottom: 5,
          marginBottom: 12,
        }}
      >
        {[{ id: "__all", label: "Todos", icon: "◯" }, ...c.categories]
          .slice(0, 5)
          .map((cat, index) => {
            const on = index === 0;
            return (
              <span
                key={cat.id}
                className="flex shrink-0 items-center gap-1.5 rounded-full"
                style={{
                  padding: "8px 12px",
                  border: `1px solid ${on ? tk.primary : tk.border}`,
                  background: on ? tk.primary : tk.surface,
                  color: on ? tk.primaryFg : tk.fg,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <span>{cat.icon}</span>
                {cat.label}
              </span>
            );
          })}
      </div>
      {grid ? (
        <div
          className="grid grid-cols-2"
          style={{ gap: 10, paddingInline: D.padX }}
        >
          {c.services.slice(0, 4).map((service) => (
            <div
              key={service.id}
              className="overflow-hidden"
              style={{
                background: tk.surface,
                border: `1px solid ${tk.border}`,
                borderRadius: tk.radLg,
              }}
            >
              <div
                className="relative"
                style={{ aspectRatio: "4/3", ...cover(service.img) }}
              >
                {service.featured ? (
                  <span
                    className="absolute rounded-full"
                    style={{
                      top: 8,
                      left: 8,
                      padding: "2px 7px",
                      background: tk.accent,
                      color: tk.accentFg,
                      fontSize: 9,
                      fontWeight: 700,
                    }}
                  >
                    DESTACADO
                  </span>
                ) : null}
              </div>
              <div style={{ padding: 10 }}>
                <div
                  className="overflow-hidden"
                  style={{
                    fontFamily: tk.fontDisplay,
                    fontSize: 13.5,
                    fontWeight: 500,
                    lineHeight: 1.25,
                    height: 33,
                  }}
                >
                  {service.name}
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span style={{ fontSize: 10.5, color: tk.fgMuted }}>
                    {service.dur} min
                  </span>
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>
                    {c.currency}
                    {service.price}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="flex flex-col"
          style={{ gap: 9, paddingInline: D.padX }}
        >
          {c.services.slice(0, 4).map((service) => (
            <div
              key={service.id}
              className="flex items-center gap-3"
              style={{
                padding: 9,
                background: tk.surface,
                border: `1px solid ${tk.border}`,
                borderRadius: tk.radLg,
              }}
            >
              <div
                className="shrink-0"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: tk.radMd,
                  ...cover(service.img),
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {service.featured ? (
                    <span
                      className="rounded-full"
                      style={{
                        padding: "1px 6px",
                        background: tk.accent,
                        color: tk.accentFg,
                        fontSize: 9,
                        fontWeight: 700,
                      }}
                    >
                      ★
                    </span>
                  ) : null}
                  <span style={{ fontSize: 10.5, color: tk.fgMuted }}>
                    {service.cat}
                  </span>
                </div>
                <div
                  className="truncate"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    marginTop: 3,
                    letterSpacing: slug === "barber" ? 0.5 : -0.1,
                    textTransform: slug === "barber" ? "uppercase" : "none",
                  }}
                >
                  {service.name}
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span style={{ fontSize: 11, color: tk.fgMuted }}>
                    {service.dur} min
                  </span>
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>
                    {c.currency}
                    {service.price}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Booking (detalle de servicio) ───────────────────────────────────────────

function StepHeader({
  ctx,
  num,
  title,
}: {
  ctx: Ctx;
  num: number;
  title: string;
}) {
  const { tk, slug } = ctx;
  return (
    <div
      className="flex items-center gap-2.5"
      style={{ marginTop: 18, marginBottom: 9 }}
    >
      <div
        className="grid place-items-center rounded-full"
        style={{
          width: 20,
          height: 20,
          background: tk.surfaceAlt,
          fontSize: 10,
          fontWeight: 700,
        }}
      >
        {num}
      </div>
      <h3
        className="m-0"
        style={{
          fontFamily: tk.fontDisplay,
          fontSize: 14.5,
          fontWeight: 600,
          letterSpacing: slug === "barber" ? 1.2 : -0.1,
          textTransform: slug === "barber" ? "uppercase" : "none",
        }}
      >
        {title}
      </h3>
    </div>
  );
}

function BookingScreen({ ctx }: { ctx: Ctx }) {
  const { tk, c, D, slug, mode } = ctx;
  const svc = c.services[0];
  const selectedDay = 1;
  const selectedSlot = "15:30";
  return (
    <div className="flex h-full flex-col">
      <StatusBar tk={tk} />
      <div className="relative shrink-0" style={{ height: 150 }}>
        <div className="absolute inset-0" style={cover(svc.img)} />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, ${
              mode === "dark" ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.1)"
            } 0%, ${tk.bg} 100%)`,
          }}
        />
        <div
          className="absolute grid place-items-center rounded-full"
          style={{
            top: 12,
            left: 14,
            width: 34,
            height: 34,
            background: "rgba(255,255,255,0.95)",
            color: "#000",
          }}
        >
          <ArrowLeft size={15} />
        </div>
        <div
          className="absolute grid place-items-center rounded-full"
          style={{
            top: 12,
            right: 14,
            width: 34,
            height: 34,
            background: "rgba(255,255,255,0.95)",
            color: "#000",
          }}
        >
          <Heart size={15} />
        </div>
      </div>

      <div
        className="min-h-0 flex-1 overflow-hidden"
        style={{ paddingInline: D.padX, paddingBottom: 8 }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div
              className="uppercase"
              style={{
                fontSize: 10.5,
                color: tk.fgMuted,
                fontWeight: 600,
                letterSpacing: 1,
              }}
            >
              {svc.cat}
            </div>
            <h1
              className="m-0"
              style={{
                fontFamily: tk.fontDisplay,
                fontSize: 21,
                fontWeight: 600,
                lineHeight: 1.15,
                marginTop: 4,
                letterSpacing: slug === "barber" ? 1.5 : -0.4,
                textTransform: slug === "barber" ? "uppercase" : "none",
              }}
            >
              {svc.name}
            </h1>
            <div
              className="flex items-center gap-2"
              style={{ marginTop: 6, fontSize: 11.5, color: tk.fgMuted }}
            >
              <span className="inline-flex items-center gap-1">
                <Clock size={12} />
                {svc.dur} min
              </span>
              <span
                className="rounded-full"
                style={{ width: 3, height: 3, background: tk.fgFaint }}
              />
              <span
                className="inline-flex items-center gap-1"
                style={{ color: tk.success, fontWeight: 600 }}
              >
                <Star size={12} />
                4.9 · 312
              </span>
            </div>
          </div>
          <div className="text-right">
            <div
              style={{
                fontFamily: tk.fontDisplay,
                fontSize: 21,
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: -0.5,
              }}
            >
              {c.currency}
              {svc.price}
            </div>
            <div style={{ fontSize: 10.5, color: tk.fgMuted, marginTop: 3 }}>
              desde
            </div>
          </div>
        </div>

        <StepHeader ctx={ctx} num={1} title="Elige fecha" />
        <div className="flex overflow-hidden" style={{ gap: 7 }}>
          {previewDays.map((day, index) => {
            const on = index === selectedDay;
            return (
              <div
                key={`${day.wd}-${day.day}`}
                className="flex shrink-0 flex-col items-center"
                style={{
                  width: 50,
                  padding: "8px 0",
                  gap: 1,
                  background: on ? tk.primary : tk.surface,
                  color: on ? tk.primaryFg : tk.fg,
                  border: `1px solid ${on ? tk.primary : tk.border}`,
                  borderRadius: tk.radMd,
                }}
              >
                <span style={{ fontSize: 9, opacity: 0.8, letterSpacing: 0.5 }}>
                  {day.wd}
                </span>
                <span
                  style={{
                    fontFamily: tk.fontDisplay,
                    fontSize: 17,
                    fontWeight: 600,
                  }}
                >
                  {day.day}
                </span>
                <span style={{ fontSize: 9, opacity: 0.7 }}>{day.month}</span>
              </div>
            );
          })}
        </div>

        <StepHeader ctx={ctx} num={2} title="Hora disponible" />
        <div className="grid grid-cols-4" style={{ gap: 7 }}>
          {previewSlots.slice(0, 8).map((slot) => {
            const on = slot.time === selectedSlot;
            const dim = !slot.available;
            return (
              <div
                key={slot.time}
                className="grid place-items-center"
                style={{
                  padding: "9px 0",
                  background: on ? tk.primary : tk.surface,
                  color: dim ? tk.fgFaint : on ? tk.primaryFg : tk.fg,
                  border: `1px solid ${on ? tk.primary : tk.border}`,
                  borderRadius: tk.radSm,
                  fontSize: 11.5,
                  fontWeight: 600,
                  textDecoration: dim ? "line-through" : "none",
                  opacity: dim ? 0.5 : 1,
                }}
              >
                {slot.time}
              </div>
            );
          })}
        </div>

        <StepHeader ctx={ctx} num={3} title="Especialista" />
        <div
          className="flex items-center gap-3"
          style={{
            background: tk.surface,
            border: `1px solid ${tk.border}`,
            borderRadius: tk.radLg,
            padding: 12,
          }}
        >
          <div className="flex-1">
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>
              Prefiero elegir especialista
            </div>
            <div style={{ fontSize: 10.5, color: tk.fgMuted, marginTop: 2 }}>
              En off asignamos al disponible.
            </div>
          </div>
          <FakeSwitch tk={tk} on={false} />
        </div>
      </div>

      <div
        className="flex items-center gap-3"
        style={{
          background: tk.bg,
          paddingInline: D.padX,
          paddingTop: 10,
          paddingBottom: 14,
          borderTop: `1px solid ${tk.border}`,
        }}
      >
        <div>
          <div
            className="uppercase"
            style={{ fontSize: 10, color: tk.fgMuted, letterSpacing: 0.5 }}
          >
            Total
          </div>
          <div
            style={{
              fontFamily: tk.fontDisplay,
              fontSize: 19,
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {c.currency}
            {svc.price}
          </div>
        </div>
        <div
          className="grid flex-1 place-items-center"
          style={{
            height: 46,
            background: tk.primary,
            color: tk.primaryFg,
            borderRadius: tk.radMd,
            fontSize: 13.5,
            fontWeight: 600,
            letterSpacing: slug === "barber" ? 1.5 : 0.1,
            textTransform: slug === "barber" ? "uppercase" : "none",
            boxShadow: tk.shadow,
          }}
        >
          Reservar · {selectedSlot}
        </div>
      </div>
    </div>
  );
}

// ── Éxito ───────────────────────────────────────────────────────────────────

function SuccessScreen({ ctx }: { ctx: Ctx }) {
  const { tk, c, slug } = ctx;
  const a = c.nextAppt;
  const rows = [
    {
      key: "fecha",
      icon: <Calendar size={14} />,
      label: "Fecha",
      value: a.date,
    },
    { key: "hora", icon: <Clock size={14} />, label: "Hora", value: a.time },
    {
      key: "especialista",
      icon: <User size={14} />,
      label: "Especialista",
      value: a.specialist,
    },
    {
      key: "total",
      icon: <CreditCard size={14} />,
      label: "Total",
      value: `${c.currency}${a.price}`,
    },
  ];
  return (
    <div className="flex h-full flex-col">
      <StatusBar tk={tk} />
      <div
        className="flex flex-1 flex-col items-center justify-center text-center"
        style={{ padding: 20 }}
      >
        <div
          className="grid place-items-center rounded-full"
          style={{
            width: 78,
            height: 78,
            background: tk.surfaceAlt,
            color: tk.success,
            boxShadow: `0 0 0 7px ${tk.surface}, 0 0 0 8px ${tk.border}`,
          }}
        >
          <Check size={38} strokeWidth={2.5} />
        </div>
        <h1
          className="m-0"
          style={{
            fontFamily: tk.fontDisplay,
            fontSize: 24,
            fontWeight: 600,
            margin: "18px 0 5px",
            letterSpacing: slug === "barber" ? 2 : -0.4,
            textTransform: slug === "barber" ? "uppercase" : "none",
            lineHeight: 1.1,
          }}
        >
          ¡Cita confirmada!
        </h1>
        <p
          className="m-0"
          style={{
            fontSize: 12.5,
            color: tk.fgMuted,
            marginBottom: 16,
            maxWidth: 240,
            lineHeight: 1.5,
          }}
        >
          Te enviamos un recordatorio por email. Tienes el evento listo para tu
          calendario.
        </p>
        <div
          className="w-full text-left"
          style={{
            maxWidth: 270,
            background: tk.surface,
            border: `1px solid ${tk.border}`,
            borderRadius: tk.radLg,
            padding: 14,
          }}
        >
          <div
            className="uppercase"
            style={{
              fontSize: 10,
              color: tk.fgMuted,
              fontWeight: 600,
              letterSpacing: 0.5,
            }}
          >
            Resumen
          </div>
          <div
            style={{
              fontFamily: tk.fontDisplay,
              fontSize: 15,
              fontWeight: 600,
              lineHeight: 1.2,
              marginTop: 5,
              marginBottom: 8,
              letterSpacing: slug === "barber" ? 1 : -0.2,
              textTransform: slug === "barber" ? "uppercase" : "none",
            }}
          >
            {a.service}
          </div>
          {rows.map((row, index) => (
            <div
              key={row.key}
              className="flex items-center gap-2.5"
              style={{
                paddingBlock: 7,
                borderBottom:
                  index < rows.length - 1 ? `1px solid ${tk.border}` : "none",
              }}
            >
              <span style={{ color: tk.fgMuted }}>{row.icon}</span>
              <span
                className="flex-1"
                style={{ fontSize: 11.5, color: tk.fgMuted }}
              >
                {row.label}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{row.value}</span>
            </div>
          ))}
        </div>
        <div
          className="grid w-full grid-cols-2"
          style={{ maxWidth: 270, gap: 8, marginTop: 12 }}
        >
          <div
            className="flex items-center justify-center gap-1.5"
            style={{
              height: 40,
              background: tk.surface,
              border: `1px solid ${tk.border}`,
              borderRadius: tk.radMd,
              fontSize: 11.5,
              fontWeight: 600,
            }}
          >
            <Download size={14} />
            Descargar .ics
          </div>
          <div
            className="flex items-center justify-center gap-1.5"
            style={{
              height: 40,
              background: tk.surface,
              border: `1px solid ${tk.border}`,
              borderRadius: tk.radMd,
              fontSize: 11.5,
              fontWeight: 600,
            }}
          >
            <Share2 size={14} />
            Compartir
          </div>
        </div>
        <div
          className="grid w-full place-items-center"
          style={{
            maxWidth: 270,
            marginTop: 10,
            height: 44,
            background: tk.primary,
            color: tk.primaryFg,
            borderRadius: tk.radMd,
            fontSize: 13.5,
            fontWeight: 600,
            letterSpacing: slug === "barber" ? 1.5 : 0.1,
            textTransform: slug === "barber" ? "uppercase" : "none",
          }}
        >
          Volver a inicio
        </div>
      </div>
    </div>
  );
}

// ── Perfil ──────────────────────────────────────────────────────────────────

function ProfileScreen({ ctx, brandName }: { ctx: Ctx; brandName: string }) {
  const { tk, c, D, slug, mode } = ctx;
  const stats = [
    { key: "citas", label: "Citas", value: 14 },
    { key: "favoritos", label: "Favoritos", value: 6 },
    { key: "resenas", label: "Reseñas", value: 9 },
  ];
  return (
    <div className="h-full overflow-hidden" style={{ paddingBottom: 24 }}>
      <StatusBar tk={tk} />
      <ScreenTitle
        ctx={ctx}
        title="Perfil"
        right={
          <div
            className="grid place-items-center rounded-full"
            style={{
              width: 36,
              height: 36,
              border: `1px solid ${tk.border}`,
              background: tk.surface,
            }}
          >
            <Settings size={16} />
          </div>
        }
      />
      <div style={{ paddingInline: D.padX, marginTop: 2 }}>
        <SurfaceCard
          tk={tk}
          style={{ display: "flex", alignItems: "center", gap: 12 }}
        >
          <div
            className="rounded-full"
            style={{
              width: 52,
              height: 52,
              border: `2px solid ${tk.surface}`,
              boxShadow: tk.shadowSoft,
              ...cover(c.nextAppt.img),
            }}
          />
          <div className="flex-1">
            <div
              style={{
                fontFamily: tk.fontDisplay,
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: slug === "barber" ? 1 : -0.2,
                textTransform: slug === "barber" ? "uppercase" : "none",
              }}
            >
              {c.userName}
            </div>
            <div style={{ fontSize: 11.5, color: tk.fgMuted, marginTop: 2 }}>
              cliente de {brandName}
            </div>
          </div>
          <ChevronRight size={15} style={{ color: tk.fgMuted }} />
        </SurfaceCard>
      </div>

      <div
        className="grid grid-cols-3"
        style={{ paddingInline: D.padX, marginTop: 12, gap: 9 }}
      >
        {stats.map((stat) => (
          <div
            key={stat.key}
            className="text-center"
            style={{
              background: tk.surface,
              border: `1px solid ${tk.border}`,
              borderRadius: tk.radMd,
              padding: 12,
            }}
          >
            <div
              style={{
                fontFamily: tk.fontDisplay,
                fontSize: 19,
                fontWeight: 700,
              }}
            >
              {stat.value}
            </div>
            <div
              className="uppercase"
              style={{
                fontSize: 10,
                color: tk.fgMuted,
                letterSpacing: 0.5,
                marginTop: 2,
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div style={{ paddingInline: D.padX, marginTop: 14 }}>
        <SectionHeader ctx={ctx} title="Preferencias" />
        <SurfaceCard tk={tk} pad={0}>
          <ProfileRow
            tk={tk}
            icon={<Globe size={14} />}
            label="Idioma"
            value="Español (ES)"
          />
          <ProfileRow
            tk={tk}
            icon={<CreditCard size={14} />}
            label="Moneda"
            value="EUR · €"
          />
          <ProfileRow
            tk={tk}
            icon={<Bell size={14} />}
            label="Notificaciones"
            value="Activadas"
          />
          <ProfileRow
            tk={tk}
            icon={<Mail size={14} />}
            label="Marketing"
            toggle
            last
          />
        </SurfaceCard>
      </div>

      <div style={{ paddingInline: D.padX, marginTop: 14 }}>
        <SectionHeader ctx={ctx} title="Apariencia" />
        <SurfaceCard tk={tk} pad={12}>
          <div className="flex items-center gap-3">
            <div
              className="grid place-items-center"
              style={{
                width: 32,
                height: 32,
                borderRadius: tk.radSm,
                background: tk.surfaceAlt,
              }}
            >
              {mode === "dark" ? "◐" : "◑"}
            </div>
            <div className="flex-1">
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>
                {mode === "dark" ? "Modo oscuro" : "Modo claro"}
              </div>
              <div style={{ fontSize: 10.5, color: tk.fgMuted, marginTop: 1 }}>
                Toca para alternar
              </div>
            </div>
            <FakeSwitch tk={tk} on={mode === "dark"} />
          </div>
        </SurfaceCard>
      </div>

      <div style={{ paddingInline: D.padX, marginTop: 14 }}>
        <SurfaceCard tk={tk} pad={0}>
          <ProfileRow
            tk={tk}
            icon={<LogOut size={14} />}
            label="Cerrar sesión"
            danger
            last
          />
        </SurfaceCard>
      </div>
    </div>
  );
}

function ProfileRow({
  tk,
  icon,
  label,
  value,
  toggle,
  last,
  danger,
}: {
  tk: Tokens;
  icon: ReactNode;
  label: string;
  value?: string;
  toggle?: boolean;
  last?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3"
      style={{
        padding: "11px 14px",
        borderBottom: last ? "none" : `1px solid ${tk.border}`,
        color: danger ? "#c95a4a" : tk.fg,
      }}
    >
      <div
        className="grid place-items-center"
        style={{
          width: 28,
          height: 28,
          borderRadius: tk.radSm,
          background: tk.surfaceAlt,
          color: "inherit",
        }}
      >
        {icon}
      </div>
      <div className="flex-1" style={{ fontSize: 12.5, fontWeight: 600 }}>
        {label}
      </div>
      {value ? (
        <span style={{ fontSize: 11.5, color: tk.fgMuted }}>{value}</span>
      ) : null}
      {toggle ? (
        <FakeSwitch tk={tk} on />
      ) : !danger ? (
        <ChevronRight size={14} style={{ color: tk.fgMuted }} />
      ) : null}
    </div>
  );
}
