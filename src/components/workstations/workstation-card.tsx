// src/components/workstations/workstation-card.tsx
"use client";

import { useRouter, useParams } from "next/navigation";
import {
    MoreHorizontal,
    Pencil,
    Trash2,
    Power,
    PowerOff,
    Copy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
} from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WorkstationIcon } from "./workstation-icon";
import { getStationType } from "@/lib/services/workstations";
import type { Tables } from "@/types";

type Workstation = Tables["workstations"]["Row"];

interface WorkstationCardProps {
    workstation: Workstation;
    branchName?: string;
    onToggleActive?: (workstation: Workstation) => void;
    onDelete?: (workstation: Workstation) => void;
    onDuplicate?: (workstation: Workstation) => void;
}

export function WorkstationCard({
    workstation,
    branchName,
    onToggleActive,
    onDelete,
    onDuplicate,
}: WorkstationCardProps) {
    const router = useRouter();
    const params = useParams();
    const tenantSlug = params.tenant as string;
    const typeInfo = getStationType(workstation.station_type || "general");

    const servicesCount = workstation.compatible_services?.length || 0;

    return (
        <Card
            className={`cursor-pointer transition-all hover:shadow-md ${
                !workstation.is_active ? "opacity-60" : ""
            }`}
            onClick={() =>
                router.push(`/t/${tenantSlug}/workstations/${workstation.id}`)
            }
        >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                    <WorkstationIcon
                        stationType={workstation.station_type || "general"}
                        size={24}
                        showBackground
                    />
                    <div>
                        <h3 className="font-semibold text-sm leading-tight">
                            {workstation.name}
                        </h3>
                        {workstation.code && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Código: {workstation.code}
                            </p>
                        )}
                    </div>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/t/${tenantSlug}/workstations/${workstation.id}`);
                            }}
                        >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                        </DropdownMenuItem>
                        {onDuplicate && (
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDuplicate(workstation);
                                }}
                            >
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicar
                            </DropdownMenuItem>
                        )}
                        {onToggleActive && (
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleActive(workstation);
                                }}
                            >
                                {workstation.is_active ? (
                                    <>
                                        <PowerOff className="mr-2 h-4 w-4" />
                                        Desactivar
                                    </>
                                ) : (
                                    <>
                                        <Power className="mr-2 h-4 w-4" />
                                        Activar
                                    </>
                                )}
                            </DropdownMenuItem>
                        )}
                        {onDelete && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(workstation);
                                    }}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Eliminar
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>

            <CardContent className="pt-0">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                        {typeInfo.label}
                    </Badge>
                    {!workstation.is_active && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                            Inactivo
                        </Badge>
                    )}
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    {branchName && <span>{branchName}</span>}
                    <span>
                        {servicesCount > 0
                            ? `${servicesCount} servicio${servicesCount > 1 ? "s" : ""}`
                            : "Sin servicios asignados"}
                    </span>
                </div>

                {workstation.floor && workstation.floor > 1 && (
                    <p className="text-xs text-muted-foreground mt-1">
                        Piso {workstation.floor}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}