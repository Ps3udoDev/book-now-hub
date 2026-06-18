// src/app/c/[tenant]/layout.tsx
// Layout de la app del cliente final (/c/[tenant]/...).
// - Verifica que el tenant exista y tenga `client_app_enabled = true`.
// - Paginas publicas (login/register/etc): renderiza sin guard de sesion.
// - Paginas privadas: verifica sesion + customer en el tenant.
"use client";

import { Loader2, Lock } from "lucide-react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { ClientBottomNav } from "@/components/client/client-bottom-nav";
import { ClientThemeProvider } from "@/components/client/themed";
import {
  type ClientAppSettingsShape,
  getClientAppFontHref,
  getClientAppThemeStyle,
} from "@/features/client-app/templates";
import { createBrowserSB } from "@/lib/supabase/client";
import { ClientTenantProvider } from "@/providers/client-tenant-provider";

const PUBLIC_SUBPATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

interface TenantStatus {
  enabled: boolean;
  name: string;
  settings: ClientAppSettingsShape;
}

export default function ClientAppLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const tenantSlug = params.tenant as string;

  const subPath = pathname.replace(`/c/${tenantSlug}`, "") || "/";
  const isPublic = PUBLIC_SUBPATHS.some(
    (publicPath) =>
      subPath === publicPath || subPath.startsWith(`${publicPath}/`),
  );

  const [checkingSession, setCheckingSession] = useState(!isPublic);
  const [tenantStatus, setTenantStatus] = useState<TenantStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/client/tenant-status?tenant=${encodeURIComponent(tenantSlug)}`,
        );
        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          throw new Error(
            `Respuesta inesperada del servidor (${res.status || "sin status"})`,
          );
        }
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setStatusError(data.error ?? "No se pudo cargar el tenant");
          return;
        }
        setTenantStatus({
          enabled: data.enabled,
          name: data.name,
          settings: data.settings,
        });
      } catch (err) {
        if (!cancelled) {
          setStatusError(err instanceof Error ? err.message : "Error de red");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantSlug]);

  useEffect(() => {
    if (isPublic) {
      setCheckingSession(false);
      return;
    }

    const supabase = createBrowserSB();
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        router.replace(`/c/${tenantSlug}/login`);
        return;
      }
      setCheckingSession(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isPublic, router, tenantSlug]);

  // Pantalla mientras se carga el status del tenant
  if (!tenantStatus && !statusError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Tenant no encontrado o error
  if (statusError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-semibold">No pudimos cargar la app</h1>
          <p className="text-muted-foreground text-sm">{statusError}</p>
        </div>
      </div>
    );
  }

  // App deshabilitada por el staff
  if (tenantStatus && !tenantStatus.enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md text-center space-y-4">
          <div className="h-16 w-16 mx-auto rounded-full bg-muted flex items-center justify-center">
            <Lock className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">App no disponible</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {tenantStatus.name} aún no tiene activa la reserva online. Por
              favor contacta directamente al negocio.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isPublic) {
    return (
      <ClientThemeProvider settings={tenantStatus?.settings}>
        <div
          className="min-h-screen bg-[var(--client-bg)] text-[var(--client-fg)]"
          style={{
            ...getClientAppThemeStyle(tenantStatus?.settings),
            fontFamily: "var(--client-font-body)",
          }}
        >
          <link rel="stylesheet" href={getClientAppFontHref()} />
          {children}
        </div>
      </ClientThemeProvider>
    );
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando…</p>
        </div>
      </div>
    );
  }

  return (
    <ClientTenantProvider tenantSlug={tenantSlug}>
      <ClientThemeProvider settings={tenantStatus?.settings}>
        <div
          className="min-h-screen bg-[var(--client-bg)] text-[var(--client-fg)]"
          style={{
            ...getClientAppThemeStyle(tenantStatus?.settings),
            fontFamily: "var(--client-font-body)",
          }}
        >
          <link rel="stylesheet" href={getClientAppFontHref()} />
          {children}
          <ClientBottomNav tenantSlug={tenantSlug} />
        </div>
      </ClientThemeProvider>
    </ClientTenantProvider>
  );
}
