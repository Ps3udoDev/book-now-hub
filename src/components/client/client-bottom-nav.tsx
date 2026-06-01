// src/components/client/client-bottom-nav.tsx
// Navegacion inferior mobile-first para la app del cliente.
"use client";

import { CalendarClock, Home, Package, Scissors, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { label: "Inicio", href: "", icon: Home },
  { label: "Servicios", href: "/servicios", icon: Scissors },
  { label: "Productos", href: "/productos", icon: Package },
  { label: "Historial", href: "/historial", icon: CalendarClock },
  { label: "Perfil", href: "/perfil", icon: User },
];

export function ClientBottomNav({ tenantSlug }: { tenantSlug: string }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--client-border)] bg-[var(--client-surface)]/95 text-[var(--client-fg)] backdrop-blur supports-[backdrop-filter]:bg-[var(--client-surface)]/85">
      <div className="mx-auto grid h-16 max-w-3xl grid-cols-5 px-1">
        {ITEMS.map((item) => {
          const href = `/c/${tenantSlug}${item.href}`;
          const active =
            item.href === ""
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href || "home"}
              href={href}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-medium text-[var(--client-fg-muted)] transition-colors",
                active && "text-[var(--client-primary)]",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
