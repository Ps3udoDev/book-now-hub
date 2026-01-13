// src/app/t/[tenant]/layout.tsx
"use client";

import { type ReactNode, useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TenantSidebar } from "@/components/tenant/tenant-sidebar";
import { TenantProvider } from "@/providers/tenant-provider";
import { TenantHeader } from "@/components/tenant";
import { Loader2 } from "lucide-react";

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
    hydrateTenant,
    logout,
  } = useAuthStore();

  const [isValidating, setIsValidating] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  // Páginas públicas del tenant (sin layout completo)
  const publicPages = [
    `/t/${tenantSlug}/login`,
    `/t/${tenantSlug}/register`,
    `/t/${tenantSlug}/forgot-password`,
  ];
  const isPublicPage = publicPages.includes(pathname);

  // Verificar acceso al tenant
  useEffect(() => {
    const checkAccess = async () => {
      // En páginas públicas no necesitamos verificar
      if (isPublicPage) {
        setIsValidating(false);
        return;
      }

      setIsValidating(true);

      // Verificar si el usuario tiene acceso a este tenant
      const access = await hydrateTenant(tenantSlug);
      setHasAccess(access);
      setIsValidating(false);

      // Si no tiene acceso, redirigir al login
      if (!access) {
        router.replace(`/t/${tenantSlug}/login`);
      }
    };

    checkAccess();
  }, [tenantSlug, isPublicPage, hydrateTenant, router]);

  const handleLogout = async () => {
    await logout();
    router.replace(`/t/${tenantSlug}/login`);
  };

  // Páginas públicas - renderizar sin layout completo
  if (isPublicPage) {
    return (
      <TenantProvider tenantSlug={tenantSlug}>
        {children}
      </TenantProvider>
    );
  }

  // Loading mientras verifica acceso
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

  // Sin acceso - redirigiendo (mostrar loading mientras redirige)
  if (!hasAccess || !isAuthenticated || !isTenantUser || tenant?.slug !== tenantSlug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Redirigiendo al login...</p>
        </div>
      </div>
    );
  }

  // Generar breadcrumbs
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
    new: "Nuevo",
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