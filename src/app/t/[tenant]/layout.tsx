// src/app/t/[tenant]/layout.tsx
"use client";

import { type ReactNode, useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TenantSidebar } from "@/components/tenant/tenant-sidebar";
import { TenantProvider } from "@/providers/tenant-provider";
import { TenantHeader } from "@/components/tenant";
import { Loader2, AlertCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface TenantLayoutProps {
  children: ReactNode;
}

export default function TenantLayout({ children }: TenantLayoutProps) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const tenantSlug = params.tenant as string;

  const {
    isAuthenticated,
    isTenantUser,
    tenant,
    user,
    hydrateTenant,
    logout,
  } = useAuthStore();

  const [isValidating, setIsValidating] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [redirectTimeout, setRedirectTimeout] = useState(false);

  // Páginas públicas
  const publicPages = [
    `/t/${tenantSlug}/login`,
    `/t/${tenantSlug}/register`,
    `/t/${tenantSlug}/forgot-password`,
  ];
  const isPublicPage = publicPages.includes(pathname);

  // 1. Hook de verificación de acceso
  useEffect(() => {
    const checkAccess = async () => {
      if (isPublicPage) {
        setIsValidating(false);
        return;
      }

      setIsValidating(true);
      const access = await hydrateTenant(tenantSlug);
      setHasAccess(access);
      setIsValidating(false);

      if (!access) {
        router.replace(`/t/${tenantSlug}/login`);
      }
    };

    checkAccess();
  }, [tenantSlug, isPublicPage, hydrateTenant, router]);

  // Condición de error de acceso
  const showAccessDenied = !isValidating && !isPublicPage && (
    !hasAccess || !isAuthenticated || !isTenantUser || tenant?.slug !== tenantSlug
  );

  // 2. Hook de Timeout (MOVIDO AQUÍ - NIVEL SUPERIOR) ✅
  // Solo activamos el timeout si estamos en estado de "Access Denied"
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (showAccessDenied) {
      timer = setTimeout(() => {
        setRedirectTimeout(true);
      }, 3000);
    }

    return () => clearTimeout(timer);
  }, [showAccessDenied]); // Dependencia clave

  const handleLogout = async () => {
    await logout();
    router.replace(`/t/${tenantSlug}/login`);
  };

  // --- RENDERIZADO ---

  // A. Páginas públicas
  if (isPublicPage) {
    return (
      <TenantProvider tenantSlug={tenantSlug}>
        {children}
      </TenantProvider>
    );
  }

  // B. Loading
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // C. Sin acceso (Mostrar UI de error si pasó el timeout o inmediatamente si prefieres)
  if (showAccessDenied) {
    // Solo mostramos la UI de error si ya pasó el timeout para evitar parpadeos durante el redirect
    if (redirectTimeout) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-full max-w-md p-8">
            <div className="bg-card rounded-lg border shadow-sm p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
              <h1 className="text-xl font-semibold mb-2">Acceso no disponible</h1>
              <p className="text-muted-foreground mb-6">
                {isAuthenticated
                  ? `Tu sesión actual (${user?.email}) no tiene acceso a esta empresa.`
                  : "Necesitas iniciar sesión para acceder a esta empresa."
                }
              </p>
              <div className="flex flex-col gap-3">
                <Link href={`/t/${tenantSlug}/login`}>
                  <Button className="w-full">
                    Ir al login de esta empresa
                  </Button>
                </Link>
                {isAuthenticated && (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      await logout();
                      window.location.reload();
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Cerrar sesión actual
                  </Button>
                )}
                <Link href="/">
                  <Button variant="ghost" className="w-full text-muted-foreground">
                    Volver al inicio
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Si hay error pero no ha pasado el timeout (está intentando redirigir), seguimos mostrando loading
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  // D. Layout Principal (Acceso concedido)
  const breadcrumbs = generateBreadcrumbs(pathname, tenantSlug);

  return (
    <TenantProvider tenantSlug={tenantSlug}>
      <SidebarProvider>
        <TenantSidebar onLogout={handleLogout} />
        <SidebarInset>
          <TenantHeader breadcrumbs={breadcrumbs} />
          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TenantProvider>
  );
}

// Función auxiliar (se mantiene igual)
function generateBreadcrumbs(pathname: string, tenantSlug: string) {
  const cleanPath = pathname.replace(`/t/${tenantSlug}`, "") || "/";
  const paths = cleanPath.split("/").filter(Boolean);

  if (paths.length === 0) {
    return [{ label: "Dashboard" }];
  }

  const breadcrumbLabels: Record<string, string> = {
    dashboard: "Dashboard",
    services: "Servicios",
    appointments: "Citas",
    customers: "Clientes",
    specialists: "Especialistas",
    inventory: "Inventario",
    pos: "Punto de Venta",
    reports: "Reportes",
    settings: "Configuración",
    branches: "Sucursales",
    appearance: "Apariencia",
    notifications: "Notificaciones",
    account: "Mi Cuenta",
    new: "Nuevo",
    schedule: "Horario",
  };

  const breadcrumbs: { label: string; href?: string }[] = [
    { label: "Dashboard", href: `/t/${tenantSlug}/dashboard` },
  ];

  let currentPath = `/t/${tenantSlug}`;
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    currentPath += `/${path}`;
    const isLast = i === paths.length - 1;
    const label = breadcrumbLabels[path] || path;

    if (path !== "dashboard") {
      breadcrumbs.push({
        label,
        href: isLast ? undefined : currentPath,
      });
    }
  }

  return breadcrumbs;
}