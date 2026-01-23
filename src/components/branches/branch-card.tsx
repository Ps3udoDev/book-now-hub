// src/components/branches/branch-card.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
    MapPin,
    Phone,
    Mail,
    Clock,
    Star,
    MoreHorizontal,
    Pencil,
    Trash2,
    Power,
    PowerOff,
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { branchesService, type OperatingHours } from "@/lib/services/branches";
import type { Tables } from "@/types";

type Branch = Tables["branches"]["Row"];

interface BranchCardProps {
    branch: Branch;
    onDeleted?: () => void;
    onUpdated?: () => void;
}

export function BranchCard({ branch, onDeleted, onUpdated }: BranchCardProps) {
    const params = useParams();
    const tenantSlug = params.tenant as string;
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isToggling, setIsToggling] = useState(false);

    const operatingHours = branch.operating_hours as OperatingHours | null;
    const isOpen = branchesService.isOpenNow(branch);

    const handleToggleActive = async () => {
        setIsToggling(true);
        try {
            if (branch.is_active) {
                await branchesService.deactivateBranch(branch.id);
            } else {
                await branchesService.reactivateBranch(branch.id);
            }
            onUpdated?.();
        } catch (error) {
            console.error("Error toggling branch:", error);
        } finally {
            setIsToggling(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await branchesService.deleteBranch(branch.id);
            onDeleted?.();
        } catch (error) {
            console.error("Error deleting branch:", error);
        } finally {
            setIsDeleting(false);
            setShowDeleteDialog(false);
        }
    };

    const formatAddress = () => {
        const parts = [branch.address, branch.city, branch.state].filter(Boolean);
        return parts.join(", ") || "Sin dirección";
    };

    return (
        <>
            <Card className={!branch.is_active ? "opacity-60" : undefined}>
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-lg">{branch.name}</CardTitle>
                                {branch.is_main && (
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                        <Star className="h-3 w-3" />
                                        Principal
                                    </Badge>
                                )}
                            </div>
                            {branch.code && (
                                <CardDescription className="font-mono text-xs">
                                    {branch.code}
                                </CardDescription>
                            )}
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <Link href={`/t/${tenantSlug}/settings/branches/${branch.id}`}>
                                        <Pencil className="h-4 w-4 mr-2" />
                                        Editar
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleToggleActive} disabled={isToggling}>
                                    {branch.is_active ? (
                                        <>
                                            <PowerOff className="h-4 w-4 mr-2" />
                                            Desactivar
                                        </>
                                    ) : (
                                        <>
                                            <Power className="h-4 w-4 mr-2" />
                                            Activar
                                        </>
                                    )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => setShowDeleteDialog(true)}
                                    className="text-destructive focus:text-destructive"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {/* Estado */}
                    <div className="flex items-center gap-2">
                        <Badge variant={isOpen ? "default" : "secondary"}>
                            <Clock className="h-3 w-3 mr-1" />
                            {isOpen ? "Abierto ahora" : "Cerrado"}
                        </Badge>
                        {!branch.is_active && (
                            <Badge variant="outline" className="text-muted-foreground">
                                Inactivo
                            </Badge>
                        )}
                    </div>

                    {/* Dirección */}
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>{formatAddress()}</span>
                    </div>

                    {/* Contacto */}
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        {branch.phone && (
                            <div className="flex items-center gap-1">
                                <Phone className="h-4 w-4" />
                                <span>{branch.phone}</span>
                            </div>
                        )}
                        {branch.email && (
                            <div className="flex items-center gap-1">
                                <Mail className="h-4 w-4" />
                                <span>{branch.email}</span>
                            </div>
                        )}
                    </div>

                    {/* Acción */}
                    <div className="pt-2">
                        <Button variant="outline" size="sm" className="w-full" asChild>
                            <Link href={`/t/${tenantSlug}/settings/branches/${branch.id}`}>
                                Ver detalles
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Diálogo de confirmación de eliminación */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar sucursal?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará permanentemente la sucursal &quot;{branch.name}&quot;
                            y no se puede deshacer. Los especialistas asignados a esta sucursal
                            perderán su asignación.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? "Eliminando..." : "Eliminar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
