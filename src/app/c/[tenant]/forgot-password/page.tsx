// src/app/c/[tenant]/forgot-password/page.tsx
"use client";

import { Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import {
  ClientButton,
  ClientField,
  clientInputClass,
  Display,
} from "@/components/client/themed";
import { clientAuthService } from "@/lib/services/client-auth";

export default function ClientForgotPasswordPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/c/${tenantSlug}/reset-password`;
      await clientAuthService.requestPasswordReset(email, redirectTo);
      setSent(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo enviar el correo",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-8 pt-16">
      <Display className="text-[32px] font-medium leading-[1.1]">
        Recuperar contraseña
      </Display>
      <p className="mb-7 mt-2 text-sm text-[var(--client-fg-muted)]">
        Te enviaremos un enlace para restablecerla.
      </p>

      {sent ? (
        <div
          className="border border-[var(--client-border)] bg-[var(--client-surface)] p-4 text-sm text-[var(--client-fg)]"
          style={{ borderRadius: "var(--client-rad-md)" }}
        >
          Si la cuenta existe, recibirás un correo en breve.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
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
          <ClientButton type="submit" disabled={loading} className="h-[52px]">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando…
              </>
            ) : (
              "Enviar enlace"
            )}
          </ClientButton>
        </form>
      )}

      <Link
        href={`/c/${tenantSlug}/login`}
        className="mt-6 text-center text-sm text-[var(--client-fg-muted)] hover:text-[var(--client-fg)]"
      >
        Volver al inicio de sesión
      </Link>
    </div>
  );
}
