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
import { captureAuthError } from "@/lib/monitoring/auth-errors";
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
  const [authMode, setAuthMode] = useState<"password" | "magic">("password");
  const [magicSent, setMagicSent] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const { settings } = usePublicClientAppSettings(tenantSlug);

  const handleMagicLink = async (event: FormEvent) => {
    event.preventDefault();
    setMagicLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?tenant=${tenantSlug}&next=/c/${tenantSlug}`;
      await clientAuthService.sendMagicLink(email, redirectTo);
    } catch (err) {
      // No revelar si la cuenta existe: signInWithOtp con shouldCreateUser:false
      // devuelve error para emails inexistentes. Mostramos siempre el mensaje neutro.
      // A Sentry solo llega si fue una falla real de infraestructura.
      captureAuthError(err, {
        flow: "magic-link",
        surface: "client",
        tenantSlug,
      });
      console.error("magic link:", err);
    } finally {
      setMagicLoading(false);
      setMagicSent(true);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await clientAuthService.signInWithPassword(email, password);
      router.replace(`/c/${tenantSlug}`);
    } catch (error) {
      captureAuthError(error, {
        flow: "login-client",
        surface: "client",
        tenantSlug,
      });
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
      captureAuthError(error, {
        flow: "oauth-google",
        surface: "client",
        tenantSlug,
      });
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
        onSubmit={authMode === "magic" ? handleMagicLink : handleSubmit}
        className="flex flex-1 flex-col gap-3.5 px-6 pb-8 pt-6"
      >
        <div
          className="grid grid-cols-2 gap-1 border border-[var(--client-border)] bg-[var(--client-surface)] p-1"
          style={{ borderRadius: "var(--client-rad-md)" }}
        >
          <button
            type="button"
            onClick={() => {
              setAuthMode("password");
              setMagicSent(false);
            }}
            className={`py-2 text-[13px] font-semibold transition ${
              authMode === "password"
                ? "bg-[var(--client-primary)] text-[var(--client-primary-fg)]"
                : "text-[var(--client-fg-muted)]"
            }`}
            style={{ borderRadius: "var(--client-rad-sm)" }}
          >
            Contraseña
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode("magic");
              setMagicSent(false);
            }}
            className={`py-2 text-[13px] font-semibold transition ${
              authMode === "magic"
                ? "bg-[var(--client-primary)] text-[var(--client-primary-fg)]"
                : "text-[var(--client-fg-muted)]"
            }`}
            style={{ borderRadius: "var(--client-rad-sm)" }}
          >
            Enlace mágico
          </button>
        </div>

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
        {authMode === "password" && (
          <>
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
          </>
        )}

        {authMode === "magic" && magicSent ? (
          <div
            className="border border-[var(--client-border)] bg-[var(--client-surface)] p-4 text-sm text-[var(--client-fg)]"
            style={{ borderRadius: "var(--client-rad-md)" }}
          >
            Si la cuenta existe, recibirás un correo en breve.
          </div>
        ) : authMode === "magic" ? (
          <ClientButton
            type="button"
            onClick={handleMagicLink}
            disabled={magicLoading}
            className="h-[52px]"
          >
            {magicLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando…
              </>
            ) : (
              "Enviar enlace mágico"
            )}
          </ClientButton>
        ) : (
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
        )}

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
