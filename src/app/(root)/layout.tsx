// src/app/(root)/layout.tsx
"use client";

import { type ReactNode, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuthStore } from "@/lib/stores/auth-store";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar, AppHeader } from "@/components/shared";

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isLogin = pathname === "/login";

  const {
    isAuthenticated,
    isGlobalAdmin,
    logout,
    hydrateGlobal,
    initialized,
  } = useAuthStore();

  // 1) Hidratar auth al montar (SIEMPRE)
  useEffect(() => {
    if (!initialized) {
      hydrateGlobal();
    }
  }, [initialized, hydrateGlobal]);

  // 2) Redirigir a login si no está autenticado (PERO solo si NO es login)
  useEffect(() => {
    if (isLogin) return;
    if (initialized && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLogin, initialized, isAuthenticated, router]);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  // Breadcrumbs (memo para no recalcular)
  const breadcrumbs = useMemo(() => generateBreadcrumbs(pathname), [pathname]);

  // ✅ Ahora sí: returns condicionales (sin hooks después)
  if (isLogin) {
    return <>{children}</>;
  }

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isGlobalAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar onLogout={handleLogout} />
      <SidebarInset>
        <AppHeader breadcrumbs={breadcrumbs} />
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

// Helper para generar breadcrumbs
function generateBreadcrumbs(pathname: string) {
  const paths = pathname.split("/").filter(Boolean);

  if (paths.length === 0) {
    return [{ label: "Dashboard" }];
  }

  const breadcrumbLabels: Record<string, string> = {
    tenants: "Tenants",
    modules: "Módulos",
    templates: "Templates",
    themes: "Temas",
    settings: "Configuración",
    new: "Nuevo",
  };

  const breadcrumbs: { label: string; href?: string }[] = [
    { label: "Dashboard", href: "/" },
  ];

  let currentPath = "";
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    currentPath += `/${path}`;
    const isLast = i === paths.length - 1;
    const label = breadcrumbLabels[path] || path;

    breadcrumbs.push({
      label,
      href: isLast ? undefined : currentPath,
    });
  }

  return breadcrumbs;
}
