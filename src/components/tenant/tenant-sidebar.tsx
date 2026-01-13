// src/components/tenant/tenant-sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useTenant } from "@/providers/tenant-provider";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Scissors,
  Calendar,
  Users,
  Package,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  UserCog,
  LayoutGrid,
  Coffee,
  type LucideIcon,
} from "lucide-react";

// Mapeo de slugs de módulos a iconos
const moduleIcons: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  services: Scissors,
  appointments: Calendar,
  customers: Users,
  specialists: UserCog,
  workstations: LayoutGrid,
  inventory: Package,
  pos: CreditCard,
  cafeteria: Coffee,
  reports: BarChart3,
};

interface TenantSidebarProps {
  onLogout: () => void;
}

export function TenantSidebar({ onLogout }: TenantSidebarProps) {
  const pathname = usePathname();
  const { tenant, tenantUser } = useAuthStore();
  const { modules } = useTenant();

  const tenantSlug = tenant?.slug || "";
  const basePath = `/t/${tenantSlug}`;

  // Items fijos (siempre visibles)
  const fixedItems = [
    {
      title: "Dashboard",
      url: `${basePath}/dashboard`,
      icon: LayoutDashboard,
    },
  ];

  // Items basados en módulos activos
  const moduleItems = modules.map((module) => ({
    title: module.name,
    url: `${basePath}/${module.slug}`,
    icon: moduleIcons[module.slug] || Scissors,
  }));

  // Items de configuración (siempre al final)
  const configItems = [
    {
      title: "Configuración",
      url: `${basePath}/settings`,
      icon: Settings,
    },
  ];

  const isActive = (url: string) => pathname === url || pathname.startsWith(`${url}/`);

  return (
    <Sidebar>
      {/* Header con logo del tenant */}
      <SidebarHeader className="border-b px-4 py-3">
        <Link href={`${basePath}/dashboard`} className="flex items-center gap-3">
          {tenant?.logo_url ? (
            <img
              src={tenant.logo_url}
              alt={tenant.name || ""}
              className="h-8 w-8 rounded-lg object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-semibold">
              {tenant?.name?.charAt(0) || "T"}
            </div>
          )}
          <div className="flex flex-col">
            <span className="font-semibold text-sm truncate max-w-[160px]">
              {tenant?.name || "Mi Empresa"}
            </span>
            <span className="text-xs text-muted-foreground">Panel de control</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {/* Menú principal */}
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {fixedItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Módulos activos */}
        {moduleItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Módulos</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {moduleItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Configuración */}
        <SidebarGroup>
          <SidebarGroupLabel>Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {configItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer con usuario y logout */}
      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <span className="text-sm font-medium">
                  {tenantUser?.full_name?.charAt(0) || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {tenantUser?.full_name || "Usuario"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {tenantUser?.email}
                </p>
              </div>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onLogout} className="text-destructive hover:text-destructive">
              <LogOut className="h-4 w-4" />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}