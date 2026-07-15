"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { requiredModuleForSegment } from "@/lib/modules/route-map";
import { useTenant } from "@/providers/tenant-provider";

interface ModuleRouteGuardProps {
  tenantSlug: string;
}

/**
 * Guard cliente: si la ruta actual corresponde a un módulo NO activo del
 * tenant, redirige al dashboard. Se monta dentro de TenantProvider para
 * disponer de los módulos habilitados.
 */
export function ModuleRouteGuard({ tenantSlug }: ModuleRouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { modules, loading } = useTenant();

  useEffect(() => {
    if (loading) return;

    // Primer segmento tras /t/[tenant]/
    const rest = pathname.replace(`/t/${tenantSlug}`, "").replace(/^\//, "");
    const segment = rest.split("/")[0];
    if (!segment) return;

    const requiredSlug = requiredModuleForSegment(segment);
    if (!requiredSlug) return; // ruta no gateada

    const enabled = new Set(modules.map((m) => m.slug));
    if (!enabled.has(requiredSlug)) {
      router.replace(`/t/${tenantSlug}/dashboard`);
    }
  }, [pathname, tenantSlug, modules, loading, router]);

  return null;
}
