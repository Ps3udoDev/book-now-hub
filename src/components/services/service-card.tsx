// src/components/services/service-card.tsx
"use client";

import Link from "next/link";
import {
    Clock,
    DollarSign,
    MoreHorizontal,
    Pencil,
    Copy,
    Trash2,
    Star,
    Eye,
    EyeOff,
    Layers,
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
import type { Service } from "@/types";
import { SERVICE_CATEGORIES } from "./service-form";

interface ServiceCardProps {
    service: Service;
    tenantSlug: string;
    onDuplicate?: (service: Service) => void;
    onDelete?: (service: Service) => void;
    onToggleActive?: (service: Service) => void;
}

export function ServiceCard({
    service,
    tenantSlug,
    onDuplicate,
    onDelete,
    onToggleActive,
}: ServiceCardProps) {
    const category = SERVICE_CATEGORIES.find((c) => c.value === service.category);

    // Formatear duración
    const formatDuration = (minutes: number) => {
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    };

    // Formatear precio
    const formatPrice = (price: number, currency: string) => {
        return new Intl.NumberFormat("es", {
            style: "currency",
            currency: currency || "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(price);
    };

    return (
        <Card className={!service.is_active ? "opacity-60" : ""}>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="text-2xl">{category?.emoji || "📦"}</div>
                        <div className="min-w-0">
                            <CardTitle className="text-base flex items-center gap-2">
                                <span className="truncate">{service.name}</span>
                                {service.is_featured && (
                                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 shrink-0" />
                                )}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-0.5">
                                <Badge variant="secondary" className="text-xs">
                                    {category?.label || service.category}
                                </Badge>
                                {service.has_variants && (
                                    <Badge variant="outline" className="text-xs gap-1">
                                        <Layers className="h-3 w-3" />
                                        Variantes
                                    </Badge>
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
                                <Link href={`/t/${tenantSlug}/services/${service.id}`}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Editar
                                </Link>
                            </DropdownMenuItem>
                            {service.has_variants && (
                                <DropdownMenuItem asChild>
                                    <Link href={`/t/${tenantSlug}/services/${service.id}/variants`}>
                                        <Layers className="h-4 w-4 mr-2" />
                                        Variantes
                                    </Link>
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => onDuplicate?.(service)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onToggleActive?.(service)}>
                                {service.is_active ? (
                                    <>
                                        <EyeOff className="h-4 w-4 mr-2" />
                                        Desactivar
                                    </>
                                ) : (
                                    <>
                                        <Eye className="h-4 w-4 mr-2" />
                                        Activar
                                    </>
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => onDelete?.(service)}
                                className="text-destructive focus:text-destructive"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>

            <CardContent className="pt-0">
                {service.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {service.description}
                    </p>
                )}

                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {formatDuration(service.duration_minutes)}
                        </span>
                    </div>
                    <div className="flex items-center gap-1 font-semibold">
                        <DollarSign className="h-4 w-4" />
                        {formatPrice(service.base_price, service.currency_code ?? "USD")}
                        {service.has_variants && (
                            <span className="text-xs text-muted-foreground font-normal">
                                +
                            </span>
                        )}
                    </div>
                </div>

                {!service.is_active && (
                    <div className="mt-3 pt-3 border-t">
                        <Badge variant="outline" className="text-xs">
                            <EyeOff className="h-3 w-3 mr-1" />
                            Inactivo
                        </Badge>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}