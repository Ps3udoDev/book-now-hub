// src/components/client/client-bottom-nav.tsx
// Navegacion inferior de la app del cliente, fiel al prototipo:
// barra flotante con sombra (monolitica y recta para el template barber).
"use client";

import { CalendarClock, Home, ShoppingBag, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClientTheme } from "@/components/client/themed";
import { cn } from "@/lib/utils";

const ITEMS = [
  { label: "Inicio", href: "", icon: Home },
  { label: "Servicios", href: "/servicios", icon: Sparkles },
  { label: "Tienda", href: "/productos", icon: ShoppingBag },
  { label: "Historial", href: "/historial", icon: CalendarClock },
  { label: "Perfil", href: "/perfil", icon: User },
];

export function ClientBottomNav({ tenantSlug }: { tenantSlug: string }) {
  const pathname = usePathname();
  const { isBarber } = useClientTheme();

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40",
        isBarber
          ? "border-t border-[var(--client-border)] bg-[var(--client-surface)]"
          : "px-4 pb-4",
      )}
    >
      <div
        className={cn(
          "mx-auto grid h-16 max-w-md grid-cols-5 items-center px-1.5",
          !isBarber &&
            "border border-[var(--client-border)] bg-[var(--client-surface)] shadow-[var(--client-shadow)]",
        )}
        style={isBarber ? undefined : { borderRadius: "var(--client-rad-xl)" }}
      >
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
                "flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10.5px] font-semibold transition-colors",
                active
                  ? "text-[var(--client-primary)]"
                  : "text-[var(--client-fg-faint)] hover:text-[var(--client-fg-muted)]",
                isBarber && "uppercase tracking-wider",
              )}
            >
              <Icon
                className="h-[22px] w-[22px]"
                strokeWidth={active ? 2 : 1.6}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
