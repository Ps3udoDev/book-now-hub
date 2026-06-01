"use client";

import {
  BarChart3,
  Calendar,
  ClipboardList,
  Coffee,
  CreditCard,
  History,
  LayoutDashboard,
  LayoutGrid,
  Lock,
  LogOut,
  type LucideIcon,
  Package,
  PercentCircle,
  Scissors,
  Settings,
  ShoppingBag,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { useAuthStore } from "@/lib/stores/auth-store";
import { useActiveBranches } from "@/hooks/supabase/use-branches";
import { useCafeteriaQrWorkstations } from "@/hooks/supabase/use-cafeteria-qr";
import { useTenant } from "@/providers/tenant-provider";

const moduleIcons: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  services: Scissors,
  appointments: Calendar,
  customers: Users,
  specialists: UserCog,
  workstations: LayoutGrid,
  inventory: Package,
  ecommerce: ShoppingBag,
  pos: CreditCard,
  cafeteria: Coffee,
  reports: BarChart3,
};

const implementedModuleSlugs = new Set([
  "dashboard",
  "services",
  "appointments",
  "customers",
  "specialists",
  "workstations",
  "inventory",
  "ecommerce",
  "cafeteria",
]);

type SidebarItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  available: boolean;
};

interface TenantSidebarProps {
  onLogout: () => void;
}

export function TenantSidebar({ onLogout }: TenantSidebarProps) {
  const pathname = usePathname();
  const { tenant, tenantUser } = useAuthStore();
  const { modules } = useTenant();
  const { branches } = useActiveBranches(tenant?.id ?? null);

  const tenantSlug = tenant?.slug || "";
  const basePath = `/t/${tenantSlug}`;
  const isAdminOrOwner = ["owner", "admin"].includes(tenantUser?.role ?? "");
  const canManageInventory = ["owner", "admin", "manager"].includes(
    tenantUser?.role ?? "",
  );
  const currentBranchId = branches[0]?.id ?? null;
  const { workstations: cafeteriaStations } = useCafeteriaQrWorkstations(
    tenant?.id ?? null,
    currentBranchId,
  );

  const fixedItems: SidebarItem[] = [
    {
      title: "Dashboard",
      url: `${basePath}/dashboard`,
      icon: LayoutDashboard,
      available: true,
    },
  ];

  const moduleItems: SidebarItem[] = modules.map((module) => ({
    title: module.name,
    url: `${basePath}/${module.slug}`,
    icon: moduleIcons[module.slug] || Scissors,
    available: implementedModuleSlugs.has(module.slug),
  }));

  const operationItems: SidebarItem[] = [
    {
      title: "Comandas",
      url: `${basePath}/orders`,
      icon: ClipboardList,
      available: true,
    },
    {
      title: "Caja",
      url: `${basePath}/caja`,
      icon: CreditCard,
      available: true,
    },
    {
      title: "Apertura de caja",
      url: `${basePath}/caja/apertura`,
      icon: Wallet,
      available: true,
    },
    {
      title: "Cierre de caja",
      url: `${basePath}/caja/cierre`,
      icon: Lock,
      available: true,
    },
    {
      title: "Historial de cierres",
      url: `${basePath}/caja/cierres`,
      icon: History,
      available: true,
    },
    {
      title: "Comisiones",
      url: `${basePath}/comisiones`,
      icon: PercentCircle,
      available: true,
    },
    {
      title: "Mis comisiones",
      url: `${basePath}/mis-comisiones`,
      icon: PercentCircle,
      available: true,
    },
    {
      title: "Mis productos",
      url: `${basePath}/mis-productos`,
      icon: Package,
      available: true,
    },
    {
      title: "Menú cafetería",
      url: `${basePath}/cafeteria/menu`,
      icon: Coffee,
      available: true,
    },
    {
      title: "Cocina cafetería",
      url: `${basePath}/cafeteria/cocina`,
      icon: Coffee,
      available: true,
    },
    ...(canManageInventory
      ? [
          {
            title: "Movimientos inv.",
            url: `${basePath}/inventory/movements`,
            icon: History,
            available: true,
          },
        ]
      : []),
    ...(isAdminOrOwner
      ? [
          {
            title: "Liquidación",
            url: `${basePath}/settings/comisiones/liquidacion`,
            icon: Wallet,
            available: true,
          },
        ]
      : []),
  ];

  const configItems: SidebarItem[] = [
    {
      title: "Configuración",
      url: `${basePath}/settings`,
      icon: Settings,
      available: true,
    },
    {
      title: "Settings cafetería",
      url: `${basePath}/settings/cafeteria`,
      icon: Coffee,
      available: true,
    },
  ];

  const cafeteriaStationItems: SidebarItem[] = cafeteriaStations
    .filter((station) => station.cafeteria_qr_enabled && station.cafeteria_qr_slug)
    .map((station) => ({
      title: station.name,
      url: `${basePath}/cafeteria/estaciones/${station.id}`,
      icon: Coffee,
      available: true,
    }));

  const isActive = (url: string) =>
    pathname === url || pathname.startsWith(`${url}/`);

  const renderSidebarItem = (item: SidebarItem) => {
    const content = (
      <>
        <item.icon className="h-4 w-4" />
        <span>{item.title}</span>
        {!item.available && (
          <span className="ml-auto text-[10px] text-muted-foreground">
            Pronto
          </span>
        )}
      </>
    );

    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          asChild
          isActive={item.available && isActive(item.url)}
          aria-disabled={!item.available}
          tooltip={!item.available ? "Página no disponible" : undefined}
          className={!item.available ? "cursor-not-allowed opacity-50" : undefined}
        >
          {item.available ? (
            <Link href={item.url}>{content}</Link>
          ) : (
            <span>{content}</span>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <Link
          href={`${basePath}/dashboard`}
          className="flex items-center gap-3"
        >
          {tenant?.logo_url ? (
            <img
              src={tenant.logo_url}
              alt={tenant.name || ""}
              className="h-8 w-8 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground">
              {tenant?.name?.charAt(0) || "T"}
            </div>
          )}
          <div className="flex flex-col">
            <span className="max-w-[160px] truncate text-sm font-semibold">
              {tenant?.name || "Mi Empresa"}
            </span>
            <span className="text-xs text-muted-foreground">
              Panel de control
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{fixedItems.map(renderSidebarItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {moduleItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Módulos</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{moduleItems.map(renderSidebarItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Operaciones</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{operationItems.map(renderSidebarItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {cafeteriaStationItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Cafetería QR</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{cafeteriaStationItems.map(renderSidebarItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{configItems.map(renderSidebarItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <span className="text-sm font-medium">
                  {tenantUser?.full_name?.charAt(0) || "U"}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {tenantUser?.full_name || "Usuario"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {tenantUser?.email}
                </p>
              </div>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onLogout}
              className="text-destructive hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
