// src/app/c/[tenant]/perfil/editar/page.tsx
// Edicion de datos personales del cliente (tarea 3.8): avatar, nombre,
// apellido, telefono. El email es de solo lectura (lo gestiona auth).
"use client";

import { Camera, Loader2, Mail, Phone, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ClientButton,
  ClientField,
  clientInputClass,
  ScreenHeader,
} from "@/components/client/themed";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { clientProfileService } from "@/lib/services/client-profile";
import { useClientTenant } from "@/providers/client-tenant-provider";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function ClientEditProfilePage() {
  const router = useRouter();
  const { tenantSlug, customer, userEmail, isLoading, refresh } =
    useClientTenant();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (customer) {
      setFirstName(customer.first_name || "");
      setLastName(customer.last_name || "");
      setPhone(customer.phone || "");
    }
  }, [customer]);

  const fullName =
    `${firstName} ${lastName}`.trim() || customer?.full_name || "Cliente";

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarPreview(URL.createObjectURL(file));
    setUploadingAvatar(true);
    try {
      await clientProfileService.uploadAvatar(tenantSlug, file);
      await refresh();
      toast.success("Foto actualizada");
    } catch (error) {
      setAvatarPreview(null);
      toast.error(
        error instanceof Error ? error.message : "No se pudo subir la foto",
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!firstName.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    try {
      await clientProfileService.updateProfile(tenantSlug, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone || null,
      });
      await refresh();
      toast.success("Datos guardados");
      router.push(`/c/${tenantSlug}/perfil`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo guardar",
      );
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-5 py-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="mx-auto h-24 w-24 rounded-full" />
        <Skeleton className="h-[52px] w-full rounded-xl" />
        <Skeleton className="h-[52px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-md space-y-5 px-5 pb-28 pt-4"
    >
      <ScreenHeader
        title="Editar perfil"
        backHref={`/c/${tenantSlug}/perfil`}
      />

      {/* Avatar */}
      <div className="flex flex-col items-center gap-2.5 py-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingAvatar}
          className="relative"
          aria-label="Cambiar foto de perfil"
        >
          <Avatar className="h-24 w-24 border-2 border-[var(--client-surface)] shadow-[var(--client-shadow-soft)]">
            <AvatarImage
              src={avatarPreview ?? customer?.avatar_url ?? undefined}
            />
            <AvatarFallback className="bg-[var(--client-primary)] text-2xl text-[var(--client-primary-fg)]">
              {getInitials(fullName)}
            </AvatarFallback>
          </Avatar>
          <span className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full border-2 border-[var(--client-bg)] bg-[var(--client-primary)] text-[var(--client-primary-fg)]">
            {uploadingAvatar ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleAvatarChange}
        />
        <p className="text-[12.5px] text-[var(--client-fg-muted)]">
          Toca para cambiar tu foto
        </p>
      </div>

      {/* Campos */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--client-fg-faint)]">
            Nombre
          </span>
          <ClientField icon={<User className="h-[18px] w-[18px]" />}>
            <input
              required
              placeholder="Tu nombre"
              className={clientInputClass}
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              disabled={saving}
            />
          </ClientField>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--client-fg-faint)]">
            Apellido
          </span>
          <ClientField icon={<User className="h-[18px] w-[18px]" />}>
            <input
              placeholder="Tu apellido"
              className={clientInputClass}
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              disabled={saving}
            />
          </ClientField>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--client-fg-faint)]">
            Teléfono
          </span>
          <ClientField icon={<Phone className="h-[18px] w-[18px]" />}>
            <input
              type="tel"
              autoComplete="tel"
              placeholder="+58 000 000 0000"
              className={clientInputClass}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              disabled={saving}
            />
          </ClientField>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--client-fg-faint)]">
            Email
          </span>
          <ClientField icon={<Mail className="h-[18px] w-[18px]" />}>
            <input
              readOnly
              disabled
              className={`${clientInputClass} cursor-not-allowed opacity-70`}
              value={userEmail ?? ""}
            />
          </ClientField>
          <p className="text-[11.5px] text-[var(--client-fg-faint)]">
            El correo no se puede cambiar desde aquí.
          </p>
        </div>
      </div>

      <ClientButton type="submit" disabled={saving} className="h-[52px] w-full">
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Guardando…
          </>
        ) : (
          "Guardar cambios"
        )}
      </ClientButton>
    </form>
  );
}
