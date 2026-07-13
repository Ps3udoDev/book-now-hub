// src/lib/modules/module-icon.tsx
// Resuelve el string `icon` de la tabla modules a un componente lucide.
import {
  BarChart3,
  Bell,
  Calendar,
  Coffee,
  Coins,
  CreditCard,
  LayoutDashboard,
  LayoutGrid,
  type LucideIcon,
  Megaphone,
  Package,
  Scissors,
  Store,
  UserCog,
  Users,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Calendar,
  Package,
  Users,
  CreditCard,
  BarChart3,
  Scissors,
  UserCog,
  LayoutGrid,
  Megaphone,
  Coffee,
  Bell,
  Coins,
  Store,
};

export function getModuleIcon(icon?: string | null): LucideIcon {
  return (icon && ICONS[icon]) || Package;
}
