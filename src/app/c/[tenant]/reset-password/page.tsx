// src/app/c/[tenant]/reset-password/page.tsx
// Cuando el cliente clickea el enlace del email de recuperacion, llega aqui
// con una sesion activa. Permite definir una contraseña nueva.
"use client";

import { Loader2, Lock } from "lucide-react";
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

export default function ClientResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenant as string;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirm) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    if (password.length < 8) {
      toast.error("Mínimo 8 caracteres");
      return;
    }

    setSaving(true);
    try {
      await clientAuthService.updatePassword(password);
      toast.success("Contraseña actualizada");
      router.replace(`/c/${tenantSlug}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar la contraseña",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-8 pt-16">
      <Display className="text-[32px] font-medium leading-[1.1]">
        Nueva contraseña
      </Display>
      <p className="mb-7 mt-2 text-sm text-[var(--client-fg-muted)]">
        Define una contraseña segura.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <ClientField icon={<Lock className="h-[18px] w-[18px]" />}>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            placeholder="Contraseña"
            className={clientInputClass}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={saving}
          />
        </ClientField>
        <ClientField icon={<Lock className="h-[18px] w-[18px]" />}>
          <input
            id="confirm"
            type="password"
            required
            minLength={8}
            placeholder="Confirmar contraseña"
            className={clientInputClass}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            disabled={saving}
          />
        </ClientField>
        <ClientButton type="submit" disabled={saving} className="h-[52px]">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Guardando…
            </>
          ) : (
            "Cambiar contraseña"
          )}
        </ClientButton>
      </form>
    </div>
  );
}
