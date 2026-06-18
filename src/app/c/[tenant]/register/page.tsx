// src/app/c/[tenant]/register/page.tsx
// Registro del cliente final con la estetica del prototipo.
"use client";

import { Loader2, Lock, Mail, Phone, User } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import {
  ClientButton,
  ClientField,
  clientInputClass,
  Display,
} from "@/components/client/themed";
import { clientAuthService } from "@/lib/services/client-auth";

export default function ClientRegisterPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenant as string;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();

      await clientAuthService.signOut().catch(() => undefined);

      const res = await clientAuthService.register({
        tenant_slug: tenantSlug,
        email: normalizedEmail,
        password,
        full_name: fullName,
        phone: phone || null,
      });

      if (res.verification_required) {
        setSuccess(
          "Te enviamos un correo para verificar tu cuenta. Revisa tu bandeja antes de iniciar sesión.",
        );
      } else {
        await clientAuthService.signInWithPassword(normalizedEmail, password);
        router.replace(`/c/${tenantSlug}/onboarding`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo registrar",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-8 pt-16">
      <Display className="text-[32px] font-medium leading-[1.1]">
        Crea tu cuenta
      </Display>
      <p className="mb-7 mt-2 text-sm text-[var(--client-fg-muted)]">
        Regístrate para agendar y ver tu historial.
      </p>

      {success ? (
        <div
          className="border border-[var(--client-border)] bg-[var(--client-surface)] p-4 text-sm text-[var(--client-fg)]"
          style={{ borderRadius: "var(--client-rad-md)" }}
        >
          {success}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <ClientField icon={<User className="h-[18px] w-[18px]" />}>
            <input
              id="fullName"
              required
              autoComplete="name"
              placeholder="Nombre completo"
              className={clientInputClass}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              disabled={loading}
            />
          </ClientField>
          <ClientField icon={<Mail className="h-[18px] w-[18px]" />}>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="tu@email.com"
              className={clientInputClass}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loading}
            />
          </ClientField>
          <ClientField icon={<Phone className="h-[18px] w-[18px]" />}>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="Teléfono (opcional)"
              className={clientInputClass}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              disabled={loading}
            />
          </ClientField>
          <div>
            <ClientField icon={<Lock className="h-[18px] w-[18px]" />}>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Contraseña"
                className={clientInputClass}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={loading}
              />
            </ClientField>
            <p className="mt-1.5 text-xs text-[var(--client-fg-faint)]">
              Mínimo 8 caracteres
            </p>
          </div>
          <ClientButton type="submit" disabled={loading} className="h-[52px]">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creando cuenta…
              </>
            ) : (
              "Crear cuenta"
            )}
          </ClientButton>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-[var(--client-fg-muted)]">
        ¿Ya tienes cuenta?{" "}
        <Link
          href={`/c/${tenantSlug}/login`}
          className="font-semibold text-[var(--client-primary)] hover:underline"
        >
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
