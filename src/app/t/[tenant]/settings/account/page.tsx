// src/app/t/[tenant]/settings/account/page.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Briefcase,
  Camera,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Shield,
  User,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
  type AccountProfileFormData,
  accountProfileSchema,
} from "@/lib/validations/account";

const ROLE_LABELS: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  manager: "Gerente",
  staff: "Personal",
  specialist: "Especialista",
};

function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U"
  );
}

export default function AccountPage() {
  const { tenant, tenantUser, hydrateTenant } = useAuthStore();
  const basePath = `/t/${tenant?.slug ?? ""}`;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AccountProfileFormData>({
    resolver: zodResolver(accountProfileSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      city: "",
      address: "",
      position: "",
    },
  });

  // Precargar el formulario cuando el usuario esté disponible.
  useEffect(() => {
    if (tenantUser) {
      reset({
        full_name: tenantUser.full_name ?? "",
        phone: tenantUser.phone ?? "",
        city: tenantUser.city ?? "",
        address: tenantUser.address ?? "",
        position: tenantUser.position ?? "",
      });
    }
  }, [tenantUser, reset]);

  const displayName = tenantUser?.full_name || "Usuario";
  const currentAvatar = avatarPreview ?? tenantUser?.avatar_url ?? undefined;

  async function handleAvatarChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file || !tenant?.id || !tenant?.slug) return;

    setAvatarPreview(URL.createObjectURL(file));
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tenant_id", tenant.id);

      const res = await fetch("/api/tenant/account/avatar", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo subir la foto");

      await hydrateTenant(tenant.slug);
      toast.success("Foto de perfil actualizada");
    } catch (error) {
      setAvatarPreview(null);
      toast.error(
        error instanceof Error ? error.message : "No se pudo subir la foto",
      );
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function onSubmit(values: AccountProfileFormData) {
    if (!tenant?.id || !tenant?.slug) return;
    try {
      const res = await fetch("/api/tenant/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, tenant_id: tenant.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo guardar");

      await hydrateTenant(tenant.slug);
      toast.success("Datos guardados correctamente");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo guardar",
      );
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link
            href={`${basePath}/settings`}
            aria-label="Volver a Configuración"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Mi Cuenta</h1>
          <p className="text-sm text-muted-foreground">
            Edita tu información personal
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Avatar + identidad */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Foto de perfil</CardTitle>
            <CardDescription>
              Se muestra en el panel y junto a tu actividad.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="relative shrink-0"
              aria-label="Cambiar foto de perfil"
            >
              <Avatar className="h-20 w-20 border">
                <AvatarImage src={currentAvatar} alt={displayName} />
                <AvatarFallback className="bg-primary text-xl text-primary-foreground">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border-2 border-background bg-primary text-primary-foreground">
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
            <div className="min-w-0 space-y-1.5">
              <p className="truncate font-medium">{displayName}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                <span className="truncate">{tenantUser?.email}</span>
              </div>
              {tenantUser?.role ? (
                <Badge variant="secondary" className="gap-1">
                  <Shield className="h-3 w-3" />
                  {ROLE_LABELS[tenantUser.role] ?? tenantUser.role}
                </Badge>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Datos personales */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos personales</CardTitle>
            <CardDescription>
              El correo y el rol los gestiona un administrador.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="full_name">
                <User className="mr-1 inline h-3.5 w-3.5" />
                Nombre completo
              </Label>
              <Input
                id="full_name"
                placeholder="Tu nombre"
                {...register("full_name")}
              />
              {errors.full_name && (
                <p className="text-xs text-destructive">
                  {errors.full_name.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">
                <Phone className="mr-1 inline h-3.5 w-3.5" />
                Teléfono
              </Label>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+58 000 000 0000"
                {...register("phone")}
              />
              {errors.phone && (
                <p className="text-xs text-destructive">
                  {errors.phone.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="position">
                <Briefcase className="mr-1 inline h-3.5 w-3.5" />
                Cargo
              </Label>
              <Input
                id="position"
                placeholder="Ej: Estilista, Recepción…"
                {...register("position")}
              />
              {errors.position && (
                <p className="text-xs text-destructive">
                  {errors.position.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="city">
                <MapPin className="mr-1 inline h-3.5 w-3.5" />
                Ciudad
              </Label>
              <Input id="city" placeholder="Tu ciudad" {...register("city")} />
              {errors.city && (
                <p className="text-xs text-destructive">
                  {errors.city.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">
                <Mail className="mr-1 inline h-3.5 w-3.5" />
                Email
              </Label>
              <Input
                id="email"
                value={tenantUser?.email ?? ""}
                readOnly
                disabled
                className="cursor-not-allowed opacity-70"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="address">
                <MapPin className="mr-1 inline h-3.5 w-3.5" />
                Dirección
              </Label>
              <Textarea
                id="address"
                rows={2}
                placeholder="Tu dirección"
                {...register("address")}
              />
              {errors.address && (
                <p className="text-xs text-destructive">
                  {errors.address.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button asChild variant="outline" type="button">
            <Link href={`${basePath}/settings`}>Cancelar</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting || uploadingAvatar}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando…
              </>
            ) : (
              "Guardar cambios"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
