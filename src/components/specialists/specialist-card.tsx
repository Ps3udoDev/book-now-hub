// src/components/specialists/specialist-card.tsx
"use client";

import Link from "next/link";
import {
    Phone,
    Mail,
    MoreHorizontal,
    Pencil,
    Calendar,
    UserX,
    UserCheck,
    Star,
    Briefcase,
    Clock,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SPECIALTIES } from "@/lib/services/specialists";
import type { Tables } from "@/types";

type Profile = Tables["profiles"]["Row"];

interface SpecialistCardProps {
    specialist: Profile;
    tenantSlug: string;
    onToggleActive?: (specialist: Profile) => void;
}

export function SpecialistCard({
    specialist,
    tenantSlug,
    onToggleActive,
}: SpecialistCardProps) {
    // Obtener iniciales
    const getInitials = () => {
        return specialist.full_name
            .split(" ")
            .map((n) => n.charAt(0))
            .join("")
            .substring(0, 2)
            .toUpperCase();
    };

    // Obtener label de especialidad
    const getSpecialtyLabel = (value: string) => {
        return SPECIALTIES.find((s) => s.value === value)?.label || value;
    };

    // Formatear comisión
    const formatCommission = () => {
        if (!specialist.commission_type) return null;

        switch (specialist.commission_type) {
            case "percentage":
                return `${specialist.commission_percentage}%`;
            case "fixed":
                return `$${specialist.commission_fixed}`;
            case "mixed":
                return `${specialist.commission_percentage}% + $${specialist.commission_fixed}`;
            default:
                return null;
        }
    };

    // Formatear rol
    const getRoleLabel = () => {
        const roles = {
            owner: "Propietario",
            admin: "Administrador",
            manager: "Gerente",
            employee: "Empleado",
        };
        return roles[specialist.role] || specialist.role;
    };

    const commission = formatCommission();

    return (
        <Card className={!specialist.is_active ? "opacity-60" : ""}>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={specialist.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                {getInitials()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <CardTitle className="text-base flex items-center gap-2">
                                <span className="truncate">{specialist.full_name}</span>
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-0.5">
                                <Badge variant="secondary" className="text-xs">
                                    {getRoleLabel()}
                                </Badge>
                                {specialist.rating && specialist.rating > 0 && (
                                    <span className="flex items-center gap-1 text-amber-500">
                                        <Star className="h-3 w-3 fill-current" />
                                        {specialist.rating.toFixed(1)}
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
                                <Link href={`/t/${tenantSlug}/specialists/${specialist.id}`}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Ver / Editar
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href={`/t/${tenantSlug}/specialists/${specialist.id}/schedule`}>
                                    <Calendar className="h-4 w-4 mr-2" />
                                    Horarios
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onToggleActive?.(specialist)}>
                                {specialist.is_active ? (
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
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>

            <CardContent className="pt-0 space-y-3">
                {/* Especialidades */}
                {specialist.specialties && specialist.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {specialist.specialties.slice(0, 3).map((specialty) => (
                            <Badge key={specialty} variant="outline" className="text-xs">
                                {getSpecialtyLabel(specialty)}
                            </Badge>
                        ))}
                        {specialist.specialties.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                                +{specialist.specialties.length - 3}
                            </Badge>
                        )}
                    </div>
                )}

                {/* Contacto */}
                <div className="space-y-1.5 text-sm">
                    {specialist.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-4 w-4 shrink-0" />
                            <a
                                href={`mailto:${specialist.email}`}
                                className="truncate hover:text-foreground"
                            >
                                {specialist.email}
                            </a>
                        </div>
                    )}

                    {specialist.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4 shrink-0" />
                            <span>{specialist.phone}</span>
                        </div>
                    )}

                    {commission && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Briefcase className="h-4 w-4 shrink-0" />
                            <span>Comisión: {commission}</span>
                        </div>
                    )}
                </div>

                {/* Bio preview */}
                {specialist.bio && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                        {specialist.bio}
                    </p>
                )}

                {/* Estado inactivo */}
                {!specialist.is_active && (
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

// Versión compacta para selección
interface SpecialistSelectItemProps {
    specialist: Profile;
    onSelect: (specialist: Profile) => void;
    selected?: boolean;
}

export function SpecialistSelectItem({
    specialist,
    onSelect,
    selected = false,
}: SpecialistSelectItemProps) {
    const getInitials = () => {
        return specialist.full_name
            .split(" ")
            .map((n) => n.charAt(0))
            .join("")
            .substring(0, 2)
            .toUpperCase();
    };

    return (
        <button
            type="button"
            onClick={() => onSelect(specialist)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${selected
                    ? "border-primary bg-primary/5"
                    : "border-transparent hover:bg-accent"
                }`}
        >
            <Avatar className="h-10 w-10">
                <AvatarImage src={specialist.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {getInitials()}
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{specialist.full_name}</p>
                    {specialist.rating && specialist.rating > 0 && (
                        <span className="flex items-center gap-0.5 text-amber-500 text-sm">
                            <Star className="h-3 w-3 fill-current" />
                            {specialist.rating.toFixed(1)}
                        </span>
                    )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                    {specialist.specialties?.slice(0, 2).join(", ") || "Sin especialidades"}
                </p>
            </div>
            {selected && (
                <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                    ✓
                </div>
            )}
        </button>
    );
}