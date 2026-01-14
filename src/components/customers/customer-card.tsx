// src/components/customers/customer-card.tsx
"use client";

import Link from "next/link";
import {
  Phone,
  Mail,
  MoreHorizontal,
  Pencil,
  Trash2,
  User,
  UserX,
  UserCheck,
  Calendar,
  MapPin,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Customer } from "@/types";

interface CustomerCardProps {
  customer: Customer;
  tenantSlug: string;
  onToggleActive?: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
}

export function CustomerCard({
  customer,
  tenantSlug,
  onToggleActive,
  onDelete,
}: CustomerCardProps) {
  // Obtener iniciales
  const getInitials = () => {
    const first = customer.first_name?.charAt(0) || "";
    const last = customer.last_name?.charAt(0) || "";
    return `${first}${last}`.toUpperCase();
  };

  // Formatear nombre completo
  const fullName = `${customer.first_name} ${customer.last_name}`.trim();

  // Formatear teléfono
  const formatPhone = () => {
    if (!customer.phone) return null;
    const code = customer.phone_country_code || "+58";
    return `${code} ${customer.phone}`;
  };

  // Calcular edad si hay fecha de nacimiento
  const getAge = () => {
    if (!customer.birth_date) return null;
    const today = new Date();
    const birth = new Date(customer.birth_date);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age;
  };

  // Verificar si es cumpleaños pronto (próximos 7 días)
  const isBirthdaySoon = () => {
    if (!customer.birth_date) return false;
    const today = new Date();
    const birth = new Date(customer.birth_date);
    birth.setFullYear(today.getFullYear());
    const diffDays = Math.ceil(
      (birth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diffDays >= 0 && diffDays <= 7;
  };

  const age = getAge();
  const phone = formatPhone();
  const birthdaySoon = isBirthdaySoon();

  return (
    <Card className={!customer.is_active ? "opacity-60" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="truncate">{fullName}</span>
                {birthdaySoon && <span className="text-lg">🎂</span>}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-0.5">
                {customer.tags && customer.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {customer.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {customer.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{customer.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs">
                    Sin etiquetas
                  </span>
                )}
              </CardDescription>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Opciones</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/t/${tenantSlug}/customers/${customer.id}`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Ver / Editar
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onToggleActive?.(customer)}>
                {customer.is_active ? (
                  <>
                    <UserX className="h-4 w-4 mr-2" />
                    Desactivar
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Activar
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete?.(customer)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-2">
        {/* Contacto */}
        <div className="space-y-1.5 text-sm">
          {customer.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0" />
              <a
                href={`mailto:${customer.email}`}
                className="truncate hover:text-foreground"
              >
                {customer.email}
              </a>
            </div>
          )}

          {phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 shrink-0" />
              <a
                href={`https://wa.me/${customer.phone_country_code?.replace(
                  "+",
                  ""
                )}${customer.phone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground"
              >
                {phone}
              </a>
            </div>
          )}

          {customer.city && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">{customer.city}</span>
            </div>
          )}

          {age !== null && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>{age} años</span>
              {birthdaySoon && (
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  ¡Cumpleaños pronto!
                </span>
              )}
            </div>
          )}
        </div>

        {/* Notas preview */}
        {customer.notes && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground line-clamp-2">
              📝 {customer.notes}
            </p>
          </div>
        )}

        {/* Estado inactivo */}
        {!customer.is_active && (
          <div className="pt-2 border-t">
            <Badge variant="outline" className="text-xs">
              <UserX className="h-3 w-3 mr-1" />
              Inactivo
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Versión compacta para selección en formularios
interface CustomerSelectItemProps {
  customer: Customer;
  onSelect: (customer: Customer) => void;
  selected?: boolean;
}

export function CustomerSelectItem({
  customer,
  onSelect,
  selected = false,
}: CustomerSelectItemProps) {
  const getInitials = () => {
    const first = customer.first_name?.charAt(0) || "";
    const last = customer.last_name?.charAt(0) || "";
    return `${first}${last}`.toUpperCase();
  };

  const fullName = `${customer.first_name} ${customer.last_name}`.trim();

  return (
    <button
      type="button"
      onClick={() => onSelect(customer)}
      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
        selected
          ? "border-primary bg-primary/5"
          : "border-transparent hover:bg-accent"
      }`}
    >
      <Avatar className="h-10 w-10">
        <AvatarFallback className="bg-primary/10 text-primary text-sm">
          {getInitials()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 text-left min-w-0">
        <p className="font-medium truncate">{fullName}</p>
        <p className="text-sm text-muted-foreground truncate">
          {customer.phone || customer.email || "Sin contacto"}
        </p>
      </div>
      {selected && (
        <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
          ✓
        </div>
      )}
    </button>
  );
}