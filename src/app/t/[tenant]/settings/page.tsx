// src/app/t/[tenant]/settings/page.tsx
"use client";

import {
  Bell,
  Building2,
  ChevronRight,
  Coffee,
  Coins,
  Palette,
  ShoppingBag,
  Smartphone,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/lib/stores/auth-store";

const settingsSections = [
  {
    title: "Sucursales",
    description: "Gestiona las ubicaciones y sedes de tu negocio",
    href: "branches",
    icon: Building2,
    available: true,
  },
  {
    title: "Apariencia",
    description: "Personaliza el tema y estilo visual",
    href: "appearance",
    icon: Palette,
    available: true,
  },
  {
    title: "Monedas",
    description: "Configura tasas de cambio para VES, COP y USD",
    href: "monedas",
    icon: Coins,
    available: true,
  },
  {
    title: "Ecommerce",
    description:
      "Configura la tienda publica, templates y contacto por WhatsApp",
    href: "ecommerce",
    icon: ShoppingBag,
    available: true,
  },
  {
    title: "App del cliente",
    description:
      "Comparte el enlace, descarga el QR y activa el acceso publico para reservas",
    href: "app-cliente",
    icon: Smartphone,
    available: true,
  },
  {
    title: "Settings Cafetería",
    description: "Gestiona QR por estación y accesos públicos al menú",
    href: "cafeteria",
    icon: Coffee,
    available: true,
  },
  {
    title: "Notificaciones",
    description: "Configura emails, SMS y alertas",
    href: "notifications",
    icon: Bell,
    available: false,
  },
  {
    title: "Mi Cuenta",
    description: "Actualiza tu perfil y seguridad",
    href: "account",
    icon: User,
    available: false,
  },
];

export default function SettingsPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const { tenant } = useAuthStore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-muted-foreground">
          Administra la configuración de {tenant?.name || "tu negocio"}
        </p>
      </div>

      {/* Cards de navegación */}
      <div className="grid gap-4 md:grid-cols-2">
        {settingsSections.map((section) => (
          <Link
            key={section.href}
            href={
              section.available
                ? `/t/${tenantSlug}/settings/${section.href}`
                : "#"
            }
            className={!section.available ? "pointer-events-none" : undefined}
          >
            <Card
              className={`transition-all hover:shadow-md hover:border-primary/50 ${
                !section.available ? "opacity-50" : "cursor-pointer"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <section.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {section.title}
                        {!section.available && (
                          <span className="text-xs font-normal text-muted-foreground">
                            (Próximamente)
                          </span>
                        )}
                      </CardTitle>
                    </div>
                  </div>
                  {section.available && (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription>{section.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
