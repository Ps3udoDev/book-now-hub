// src/app/c/[tenant]/perfil/page.tsx
// Perfil y configuracion del cliente (tarea 3.8): card editable, stats,
// moneda preferida, preferencias de notificacion, consentimiento de
// marketing, cierre de sesion y eliminacion de cuenta con doble confirmacion.
"use client";

import {
  CalendarDays,
  ChevronRight,
  Globe,
  Heart,
  Loader2,
  LogOut,
  Mail,
  MessageCircle,
  Pencil,
  Smartphone,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ClientCard,
  displayStyle,
  ScreenHeader,
  SectionHeading,
  useClientTheme,
} from "@/components/client/themed";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useClientFavorites,
  useClientHistory,
} from "@/hooks/supabase/use-client-profile";
import { clientAuthService } from "@/lib/services/client-auth";
import {
  clientProfileService,
  type UpdateProfilePayload,
} from "@/lib/services/client-profile";
import { cn } from "@/lib/utils";
import { useClientCurrency } from "@/providers/client-currency-provider";
import { useClientTenant } from "@/providers/client-tenant-provider";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

interface NotifyPrefs {
  notify_email: boolean;
  notify_sms: boolean;
  notify_whatsapp: boolean;
  accepts_marketing: boolean;
}

export default function ClientProfilePage() {
  const router = useRouter();
  const { tenantSlug, customer, userEmail, isLoading, refresh } =
    useClientTenant();
  const { isBarber } = useClientTheme();
  const { availableCurrencies } = useClientCurrency();
  const { favorites } = useClientFavorites(tenantSlug);
  const { pagination } = useClientHistory(tenantSlug, { page: 1, pageSize: 1 });

  // Estado local de preferencias (optimista, sembrado desde el customer).
  const [prefs, setPrefs] = useState<NotifyPrefs>({
    notify_email: true,
    notify_sms: false,
    notify_whatsapp: false,
    accepts_marketing: true,
  });
  const [currency, setCurrency] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    if (customer) {
      setPrefs({
        notify_email: customer.notify_email ?? true,
        notify_sms: customer.notify_sms ?? false,
        notify_whatsapp: customer.notify_whatsapp ?? false,
        accepts_marketing: customer.accepts_marketing ?? true,
      });
      setCurrency(customer.preferred_currency ?? null);
    }
  }, [customer]);

  const fullName =
    customer?.full_name ||
    `${customer?.first_name ?? ""} ${customer?.last_name ?? ""}`.trim() ||
    "Cliente";

  // Persiste un patch del perfil y refresca el contexto.
  const savePatch = async (
    key: string,
    payload: UpdateProfilePayload,
    rollback: () => void,
  ) => {
    setSavingKey(key);
    try {
      await clientProfileService.updateProfile(tenantSlug, payload);
      await refresh();
    } catch (error) {
      rollback();
      toast.error(
        error instanceof Error ? error.message : "No se pudo guardar",
      );
    } finally {
      setSavingKey(null);
    }
  };

  const togglePref = (key: keyof NotifyPrefs) => {
    const prev = prefs[key];
    const next = !prev;
    setPrefs((current) => ({ ...current, [key]: next }));
    const payload: UpdateProfilePayload =
      key === "accepts_marketing"
        ? { marketing_consent: next }
        : { [key]: next };
    void savePatch(key, payload, () =>
      setPrefs((current) => ({ ...current, [key]: prev })),
    );
  };

  const selectCurrency = (code: string) => {
    if (code === currency) return;
    const prev = currency;
    setCurrency(code);
    void savePatch("currency", { preferred_currency: code }, () =>
      setCurrency(prev),
    );
  };

  const handleLogout = async () => {
    await clientAuthService.signOut();
    router.replace(`/c/${tenantSlug}/login`);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await clientProfileService.deleteAccount(tenantSlug);
      await clientAuthService.signOut().catch(() => {});
      toast.success("Tu cuenta fue eliminada");
      router.replace(`/c/${tenantSlug}/login`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo eliminar",
      );
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-5 py-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-5 px-5 pb-28 pt-4">
      <ScreenHeader title="Perfil" />

      {/* Card de usuario (editable) */}
      <Link href={`/c/${tenantSlug}/perfil/editar`} className="block">
        <ClientCard className="flex items-center gap-3.5 p-4 transition-colors hover:bg-[var(--client-surface-alt)]">
          <Avatar className="h-[60px] w-[60px] border-2 border-[var(--client-surface)] shadow-[var(--client-shadow-soft)]">
            <AvatarImage src={customer?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-[var(--client-primary)] text-lg text-[var(--client-primary-fg)]">
              {getInitials(fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-lg font-semibold text-[var(--client-fg)]"
              style={displayStyle(isBarber)}
            >
              {fullName}
            </p>
            <p className="mt-0.5 truncate text-[12.5px] text-[var(--client-fg-muted)]">
              {userEmail ?? ""}
              {customer?.phone ? ` · ${customer.phone}` : ""}
            </p>
          </div>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--client-border)] text-[var(--client-fg)]">
            <Pencil className="h-3.5 w-3.5" />
          </span>
        </ClientCard>
      </Link>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2.5">
        <StatCard label="Citas" value={pagination?.total ?? 0} />
        <StatCard label="Favoritos" value={favorites.length} />
        <StatCard
          label="Idioma"
          value={(customer?.preferred_language ?? "es").toUpperCase()}
        />
      </div>

      {/* Moneda preferida */}
      <section>
        <SectionHeading title="Moneda preferida" />
        <ClientCard className="space-y-2.5 p-4">
          <p className="text-[12.5px] text-[var(--client-fg-muted)]">
            Los precios se mostrarán convertidos a esta moneda.
          </p>
          <div className="flex flex-wrap gap-2">
            {availableCurrencies.length === 0 ? (
              <Skeleton className="h-9 w-full rounded-full" />
            ) : (
              availableCurrencies.map((option) => {
                const active = currency === option.code;
                return (
                  <button
                    key={option.code}
                    type="button"
                    disabled={savingKey === "currency"}
                    onClick={() => selectCurrency(option.code)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition disabled:opacity-60",
                      active
                        ? "border-[var(--client-primary)] bg-[var(--client-primary)] text-[var(--client-primary-fg)]"
                        : "border-[var(--client-border)] bg-[var(--client-surface)] text-[var(--client-fg)] hover:bg-[var(--client-surface-alt)]",
                    )}
                  >
                    <span>{option.code}</span>
                    <span className="opacity-70">{option.symbol}</span>
                  </button>
                );
              })
            )}
          </div>
        </ClientCard>
      </section>

      {/* Preferencias de notificacion */}
      <section>
        <SectionHeading title="Notificaciones" />
        <ClientCard className="overflow-hidden">
          <PrefToggle
            icon={<Mail className="h-4 w-4" />}
            label="Email"
            description="Recordatorios y confirmaciones de cita"
            checked={prefs.notify_email}
            saving={savingKey === "notify_email"}
            onToggle={() => togglePref("notify_email")}
          />
          <PrefToggle
            icon={<Smartphone className="h-4 w-4" />}
            label="SMS"
            description="Avisos por mensaje de texto"
            checked={prefs.notify_sms}
            saving={savingKey === "notify_sms"}
            onToggle={() => togglePref("notify_sms")}
          />
          <PrefToggle
            icon={<MessageCircle className="h-4 w-4" />}
            label="WhatsApp"
            description="Avisos por WhatsApp"
            checked={prefs.notify_whatsapp}
            saving={savingKey === "notify_whatsapp"}
            onToggle={() => togglePref("notify_whatsapp")}
            last
          />
        </ClientCard>
      </section>

      {/* Marketing */}
      <section>
        <SectionHeading title="Marketing" />
        <ClientCard className="overflow-hidden">
          <PrefToggle
            icon={<Heart className="h-4 w-4" />}
            label="Promociones y novedades"
            description="Ofertas especiales del salón"
            checked={prefs.accepts_marketing}
            saving={savingKey === "accepts_marketing"}
            onToggle={() => togglePref("accepts_marketing")}
            last
          />
        </ClientCard>
      </section>

      {/* Accesos */}
      <section>
        <SectionHeading title="Tu actividad" />
        <ClientCard className="overflow-hidden">
          <ProfileRow
            href={`/c/${tenantSlug}/historial`}
            icon={<CalendarDays className="h-4 w-4" />}
            label="Mis citas"
          />
          <ProfileRow
            href={`/c/${tenantSlug}/servicios`}
            icon={<Globe className="h-4 w-4" />}
            label="Reservar un servicio"
            last
          />
        </ClientCard>
      </section>

      {/* Logout */}
      <ClientCard className="overflow-hidden">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[#c95a4a] transition-colors hover:bg-[var(--client-surface-alt)]"
        >
          <span
            className="grid h-8 w-8 place-items-center bg-[var(--client-surface-alt)]"
            style={{ borderRadius: "var(--client-rad-sm)" }}
          >
            <LogOut className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold">Cerrar sesión</span>
        </button>
      </ClientCard>

      {/* Eliminar cuenta (doble confirmacion) */}
      <AlertDialog
        onOpenChange={(open) => {
          if (!open) setConfirmText("");
        }}
      >
        <AlertDialogTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 py-2 text-[13px] font-medium text-[var(--client-fg-faint)] transition-colors hover:text-[#c0392b]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Eliminar mi cuenta
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tu cuenta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es permanente. Perderás el acceso a tu cuenta y a tus
              favoritos. Tu historial de citas se conserva para el salón pero ya
              no podrás iniciar sesión.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">
              Escribe <span className="font-semibold">ELIMINAR</span> para
              confirmar:
            </p>
            <input
              value={confirmText}
              onChange={(event) =>
                setConfirmText(event.target.value.toUpperCase())
              }
              placeholder="ELIMINAR"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmText !== "ELIMINAR" || deleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteAccount();
              }}
              className="bg-[#c0392b] text-white hover:bg-[#a93226]"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Eliminando…
                </>
              ) : (
                "Eliminar definitivamente"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div
      className="border border-[var(--client-border)] bg-[var(--client-surface)] p-3.5 text-center"
      style={{ borderRadius: "var(--client-rad-md)" }}
    >
      <p
        className="text-[22px] font-bold text-[var(--client-fg)]"
        style={{ fontFamily: "var(--client-font-display)" }}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] uppercase tracking-wide text-[var(--client-fg-muted)]">
        {label}
      </p>
    </div>
  );
}

function PrefToggle({
  icon,
  label,
  description,
  checked,
  saving,
  onToggle,
  last,
}: {
  icon: ReactNode;
  label: string;
  description: string;
  checked: boolean;
  saving: boolean;
  onToggle: () => void;
  last?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={saving}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--client-surface-alt)] disabled:opacity-70"
      style={
        last ? undefined : { borderBottom: "1px solid var(--client-border)" }
      }
    >
      <span
        className="grid h-8 w-8 shrink-0 place-items-center bg-[var(--client-surface-alt)] text-[var(--client-fg)]"
        style={{ borderRadius: "var(--client-rad-sm)" }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[var(--client-fg)]">
          {label}
        </span>
        <span className="block truncate text-xs text-[var(--client-fg-muted)]">
          {description}
        </span>
      </span>
      {saving ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--client-fg-muted)]" />
      ) : (
        <span
          className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
          style={{
            background: checked
              ? "var(--client-primary)"
              : "var(--client-surface-alt)",
          }}
        >
          <span
            className="absolute top-[3px] h-[18px] w-[18px] rounded-full shadow transition-all"
            style={{
              left: checked ? 22 : 3,
              background: checked
                ? "var(--client-primary-fg)"
                : "var(--client-surface)",
            }}
          />
        </span>
      )}
    </button>
  );
}

function ProfileRow({
  href,
  icon,
  label,
  value,
  last,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  value?: string;
  last?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--client-surface-alt)]"
      style={
        last ? undefined : { borderBottom: "1px solid var(--client-border)" }
      }
    >
      <span
        className="grid h-8 w-8 shrink-0 place-items-center bg-[var(--client-surface-alt)] text-[var(--client-fg)]"
        style={{ borderRadius: "var(--client-rad-sm)" }}
      >
        {icon}
      </span>
      <span className="flex-1 text-sm font-semibold text-[var(--client-fg)]">
        {label}
      </span>
      {value ? (
        <span className="text-[13px] text-[var(--client-fg-muted)]">
          {value}
        </span>
      ) : null}
      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--client-fg-muted)]" />
    </Link>
  );
}
