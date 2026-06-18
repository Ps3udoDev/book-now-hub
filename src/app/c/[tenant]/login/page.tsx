// src/app/c/[tenant]/login/page.tsx
// Login del cliente final, fiel al prototipo: banda hero con imagen del
// template, campos con icono, CTA primaria y social login.
"use client";

import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import {
  AuthHero,
  ClientButton,
  ClientDivider,
  ClientField,
  clientInputClass,
} from "@/components/client/themed";
import { usePublicClientAppSettings } from "@/hooks/supabase/use-client-app-settings";
import { clientAuthService } from "@/lib/services/client-auth";

export default function ClientLoginPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenant as string;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { settings } = usePublicClientAppSettings(tenantSlug);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await clientAuthService.signInWithPassword(email, password);
      router.replace(`/c/${tenantSlug}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo iniciar sesión",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!settings?.google_login_enabled) {
      toast.info("Google estará disponible próximamente");
      return;
    }
    setGoogleLoading(true);
    try {
      await clientAuthService.signInWithGoogle(tenantSlug, `/c/${tenantSlug}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo iniciar sesión con Google",
      );
      setGoogleLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      <AuthHero
        title={
          settings?.welcome_title || settings?.brand_name || "Reserva tu hora."
        }
      />

      <form
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col gap-3.5 px-6 pb-8 pt-6"
      >
        <ClientField icon={<Mail className="h-[18px] w-[18px]" />}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder="tu@email.com"
            className={clientInputClass}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={loading}
          />
        </ClientField>
        <ClientField icon={<Lock className="h-[18px] w-[18px]" />}>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="Contraseña"
            className={clientInputClass}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="p-1 text-[var(--client-fg-muted)]"
            aria-label={
              showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
            }
          >
            {showPassword ? (
              <EyeOff className="h-[18px] w-[18px]" />
            ) : (
              <Eye className="h-[18px] w-[18px]" />
            )}
          </button>
        </ClientField>

        <Link
          href={`/c/${tenantSlug}/forgot-password`}
          className="self-end text-[13px] font-medium text-[var(--client-fg-muted)] hover:text-[var(--client-fg)]"
        >
          ¿Olvidaste tu contraseña?
        </Link>

        <ClientButton type="submit" disabled={loading} className="h-[52px]">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Iniciando sesión…
            </>
          ) : (
            "Iniciar sesión"
          )}
        </ClientButton>

        {(settings?.show_google_login_preview ?? true) ? (
          <>
            <ClientDivider label="o continúa con" />
            <ClientButton
              variant="surface"
              onClick={handleGoogle}
              disabled={googleLoading}
              className="h-[50px]"
            >
              {googleLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Conectando con Google…
                </>
              ) : (
                `Google${settings?.google_login_enabled ? "" : " (pronto)"}`
              )}
            </ClientButton>
          </>
        ) : null}

        <p className="mt-2 text-center text-sm text-[var(--client-fg-muted)]">
          ¿No tienes cuenta?{" "}
          <Link
            href={`/c/${tenantSlug}/register`}
            className="font-semibold text-[var(--client-primary)] hover:underline"
          >
            Crear cuenta
          </Link>
        </p>
      </form>
    </div>
  );
}
