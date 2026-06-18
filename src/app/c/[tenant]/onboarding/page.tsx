// src/app/c/[tenant]/onboarding/page.tsx
// Onboarding post-registro en pasos (prototipo): nombre → contacto → preferencias.
"use client";

import { Bell, Loader2, Phone, User } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ClientButton,
  ClientChip,
  ClientField,
  clientInputClass,
  Display,
} from "@/components/client/themed";
import { useClientProfile } from "@/hooks/supabase/use-client-profile";
import { clientAuthService } from "@/lib/services/client-auth";

const STEPS = ["nombre", "contacto", "preferencias"] as const;

export default function ClientOnboardingPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenant as string;

  const { customer, isLoading } = useClientProfile(tenantSlug);

  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState<string>("es");
  const [marketingConsent, setMarketingConsent] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (customer) {
      setFirstName(customer.first_name || "");
      setLastName(customer.last_name || "");
      setPhone(customer.phone || "");
      setLanguage(customer.preferred_language || "es");
      setMarketingConsent(customer.accepts_marketing ?? true);
    }
  }, [customer]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await clientAuthService.completeOnboarding({
        tenant_slug: tenantSlug,
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`.trim(),
        phone: phone || null,
        preferred_language: language,
        marketing_consent: marketingConsent,
      });
      toast.success("¡Listo! Tu perfil está configurado");
      router.replace(`/c/${tenantSlug}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo guardar",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleNext = (event: FormEvent) => {
    event.preventDefault();
    if (step === 0 && !firstName.trim()) {
      toast.error("Cuéntanos tu nombre");
      return;
    }
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      void handleSubmit();
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--client-bg)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--client-primary)]" />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleNext}
      className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-8 pt-10"
    >
      {/* Progreso */}
      <div className="mb-8 flex gap-1.5">
        {STEPS.map((key, index) => (
          <span
            key={key}
            className="h-1 flex-1 rounded-full transition-colors"
            style={{
              background:
                index <= step
                  ? "var(--client-primary)"
                  : "var(--client-surface-alt)",
            }}
          />
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-3.5">
        {step === 0 ? (
          <>
            <Display className="text-[30px] font-medium leading-[1.1]">
              ¿Cómo te llamas?
            </Display>
            <p className="mb-4 text-sm text-[var(--client-fg-muted)]">
              Lo usaremos para personalizar tu experiencia.
            </p>
            <ClientField icon={<User className="h-[18px] w-[18px]" />}>
              <input
                id="firstName"
                required
                placeholder="Tu nombre"
                className={clientInputClass}
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                disabled={saving}
              />
            </ClientField>
            <ClientField icon={<User className="h-[18px] w-[18px]" />}>
              <input
                id="lastName"
                placeholder="Tu apellido"
                className={clientInputClass}
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                disabled={saving}
              />
            </ClientField>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Display className="text-[30px] font-medium leading-[1.1]">
              Tu contacto
            </Display>
            <p className="mb-4 text-sm text-[var(--client-fg-muted)]">
              Para recordatorios de cita y avisos importantes.
            </p>
            <ClientField icon={<Phone className="h-[18px] w-[18px]" />}>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+593 000 000 000"
                className={clientInputClass}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                disabled={saving}
              />
            </ClientField>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-[var(--client-fg-faint)]">
              Idioma preferido
            </p>
            <div className="flex gap-2">
              <ClientChip
                active={language === "es"}
                onClick={() => setLanguage("es")}
              >
                Español
              </ClientChip>
              <ClientChip
                active={language === "en"}
                onClick={() => setLanguage("en")}
              >
                English
              </ClientChip>
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Display className="text-[30px] font-medium leading-[1.1]">
              Últimos detalles
            </Display>
            <p className="mb-4 text-sm text-[var(--client-fg-muted)]">
              Lo cambias cuando quieras desde tu perfil.
            </p>
            <button
              type="button"
              onClick={() => setMarketingConsent((current) => !current)}
              className="flex items-center gap-3 border border-[var(--client-border)] bg-[var(--client-surface)] p-3.5 text-left"
              style={{ borderRadius: "var(--client-rad-lg)" }}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--client-surface-alt)] text-[var(--client-fg)]">
                <Bell className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[var(--client-fg)]">
                  Recibir promociones
                </span>
                <span className="block text-xs text-[var(--client-fg-muted)]">
                  Ofertas y novedades por email
                </span>
              </span>
              <span
                className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
                style={{
                  background: marketingConsent
                    ? "var(--client-primary)"
                    : "var(--client-surface-alt)",
                }}
              >
                <span
                  className="absolute top-[3px] h-[18px] w-[18px] rounded-full shadow transition-all"
                  style={{
                    left: marketingConsent ? 22 : 3,
                    background: marketingConsent
                      ? "var(--client-primary-fg)"
                      : "var(--client-surface)",
                  }}
                />
              </span>
            </button>
          </>
        ) : null}
      </div>

      <div className="mt-8 flex gap-2.5">
        {step > 0 ? (
          <ClientButton
            variant="ghost"
            onClick={() => setStep(step - 1)}
            disabled={saving}
            className="h-[52px] flex-1"
          >
            Atrás
          </ClientButton>
        ) : null}
        <ClientButton
          type="submit"
          disabled={saving}
          className="h-[52px] flex-[2]"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Guardando…
            </>
          ) : step < STEPS.length - 1 ? (
            "Continuar"
          ) : (
            "Comenzar"
          )}
        </ClientButton>
      </div>
    </form>
  );
}
