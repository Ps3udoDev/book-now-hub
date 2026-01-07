// src/components/shared/app-sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Building2,
    Puzzle,
    Layout,
    Palette,
    Settings,
    ChevronsUpDown,
    LogOut,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/stores/auth-store";
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
    SidebarRail,
} from "@/components/ui/sidebar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Navegación principal
const mainNavigation = [
    {
        title: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
    },
    {
        title: "Tenants",
        href: "/tenants",
        icon: Building2,
    },
    {
        title: "Módulos",
        href: "/modules",
        icon: Puzzle,
    },
];

// Navegación de configuración
const configNavigation = [
    {
        title: "Templates",
        href: "/templates",
        icon: Layout,
    },
    {
        title: "Temas",
        href: "/themes",
        icon: Palette,
    },
    {
        title: "Configuración",
        href: "/settings",
        icon: Settings,
    },
];

interface AppSidebarProps {
    onLogout?: () => void;
}

export function AppSidebar({ onLogout }: AppSidebarProps) {
    const pathname = usePathname();
    const { globalUser } = useAuthStore();

    const isActive = (href: string) => {
        if (href === "/") {
            return pathname === "/";
        }
        return pathname.startsWith(href);
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <Sidebar collapsible="icon">
            {/* Header */}
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                    <span className="font-bold text-sm">BN</span>
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">Book Now Hub</span>
                                    <span className="truncate text-xs text-muted-foreground">
                                        Admin Panel
                                    </span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            {/* Content */}
            <SidebarContent>
                {/* Main Navigation */}
                <SidebarGroup>
                    <SidebarGroupLabel>Principal</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {mainNavigation.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={isActive(item.href)}
                                        tooltip={item.title}
                                    >
                                        <Link href={item.href}>
                                            <item.icon className="h-4 w-4" />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {/* Config Navigation */}
                <SidebarGroup>
                    <SidebarGroupLabel>Configuración</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {configNavigation.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={isActive(item.href)}
                                        tooltip={item.title}
                                    >
                                        <Link href={item.href}>
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

            {/* Footer - User Menu */}
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                >
                                    <Avatar className="h-8 w-8 rounded-lg">
                                        <AvatarImage
                                            src={globalUser?.avatar_url || undefined}
                                            alt={globalUser?.full_name || ""}
                                        />
                                        <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                                            {globalUser?.full_name
                                                ? getInitials(globalUser.full_name)
                                                : "AD"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-semibold">
                                            {globalUser?.full_name || "Admin"}
                                        </span>
                                        <span className="truncate text-xs text-muted-foreground">
                                            {globalUser?.email || "admin@example.com"}
                                        </span>
                                    </div>
                                    <ChevronsUpDown className="ml-auto size-4" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                                side="bottom"
                                align="end"
                                sideOffset={4}
                            >
                                <DropdownMenuLabel className="p-0 font-normal">
                                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                        <Avatar className="h-8 w-8 rounded-lg">
                                            <AvatarImage
                                                src={globalUser?.avatar_url || undefined}
                                                alt={globalUser?.full_name || ""}
                                            />
                                            <AvatarFallback className="rounded-lg">
                                                {globalUser?.full_name
                                                    ? getInitials(globalUser.full_name)
                                                    : "AD"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="grid flex-1 text-left text-sm leading-tight">
                                            <span className="truncate font-semibold">
                                                {globalUser?.full_name || "Admin"}
                                            </span>
                                            <span className="truncate text-xs text-muted-foreground capitalize">
                                                {globalUser?.role?.replace("_", " ") || "Admin"}
                                            </span>
                                        </div>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={onLogout}
                                    className="text-destructive focus:text-destructive"
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Cerrar sesión
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}