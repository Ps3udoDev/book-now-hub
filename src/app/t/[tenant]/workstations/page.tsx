// src/app/t/[tenant]/workstations/page.tsx
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    Plus,
    Search,
    LayoutGrid,
    Map,
    Filter,
    Loader2,
    LayoutList,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    WorkstationCard,
    WorkstationFloorMap,
} from "@/components/workstations";
import { STATION_TYPES, workstationsService } from "@/lib/services/workstations";
import { useWorkstations } from "@/hooks/supabase/use-workstations";
import { useActiveBranches } from "@/hooks/supabase/use-branches";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { Tables } from "@/types";

type Workstation = Tables["workstations"]["Row"];

export default function WorkstationsPage() {
    const params = useParams();
    const router = useRouter();
    const tenantSlug = params.tenant as string;
    const { tenant } = useAuthStore();
    const tenantId = tenant?.id || null;

    const { workstations, isLoading, mutate } = useWorkstations(tenantId);
    const { branches } = useActiveBranches(tenantId);

    const [search, setSearch] = useState("");
    const [branchFilter, setBranchFilter] = useState<string>("all");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [view, setView] = useState<"grid" | "map">("grid");
    const [mapFloor, setMapFloor] = useState(1);

    // Mapa de branches para mostrar nombre
    const branchMap = Object.fromEntries(branches.map((b) => [b.id, b.name]));

    // Filtrar workstations
    const filtered = workstations.filter((ws) => {
        const matchesSearch =
            ws.name.toLowerCase().includes(search.toLowerCase()) ||
            ws.code?.toLowerCase().includes(search.toLowerCase());

        const matchesBranch =
            branchFilter === "all" || ws.branch_id === branchFilter;

        const matchesType =
            typeFilter === "all" || ws.station_type === typeFilter;

        const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "active" && ws.is_active) ||
            (statusFilter === "inactive" && !ws.is_active);

        return matchesSearch && matchesBranch && matchesType && matchesStatus;
    });

    // Handlers
    const handleToggleActive = async (workstation: Workstation) => {
        try {
            if (workstation.is_active) {
                await workstationsService.deactivateWorkstation(workstation.id);
                toast.success("Puesto desactivado");
            } else {
                await workstationsService.reactivateWorkstation(workstation.id);
                toast.success("Puesto activado");
            }
            mutate();
        } catch (error) {
            toast.error("Error al cambiar estado");
        }
    };

    const handleDelete = async (workstation: Workstation) => {
        if (!confirm(`¿Estás seguro de eliminar "${workstation.name}"?`)) return;
        try {
            await workstationsService.deleteWorkstation(workstation.id);
            toast.success("Puesto eliminado");
            mutate();
        } catch (error) {
            toast.error("Error al eliminar puesto");
        }
    };

    const handleDuplicate = async (workstation: Workstation) => {
        try {
            await workstationsService.createWorkstation({
                tenant_id: workstation.tenant_id,
                branch_id: workstation.branch_id,
                name: `${workstation.name} (copia)`,
                code: workstation.code ? `${workstation.code}-copy` : null,
                station_type: workstation.station_type || "general",
                position_x: (workstation.position_x || 0) + 5,
                position_y: (workstation.position_y || 0) + 5,
                floor: workstation.floor || 1,
                compatible_services: workstation.compatible_services as string[] | null,
            });
            toast.success("Puesto duplicado");
            mutate();
        } catch (error) {
            toast.error("Error al duplicar puesto");
        }
    };

    const handleMapPositionChange = async (
        workstationId: string,
        x: number,
        y: number
    ) => {
        try {
            await workstationsService.updateWorkstation(workstationId, {
                position_x: x,
                position_y: y,
            });
            mutate();
        } catch (error) {
            // Silenciar errores durante drag
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Puestos de Trabajo
                    </h1>
                    <p className="text-muted-foreground">
                        {workstations.length} puesto{workstations.length !== 1 ? "s" : ""} configurado{workstations.length !== 1 ? "s" : ""}
                    </p>
                </div>
                <Button onClick={() => router.push(`/t/${tenantSlug}/workstations/new`)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo puesto
                </Button>
            </div>

            {/* Filtros y vista */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre o código..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {branches.length > 1 && (
                    <Select value={branchFilter} onValueChange={setBranchFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Sucursal" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las sucursales</SelectItem>
                            {branches.map((b) => (
                                <SelectItem key={b.id} value={b.id}>
                                    {b.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los tipos</SelectItem>
                        {STATION_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                                {t.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="active">Activos</SelectItem>
                        <SelectItem value="inactive">Inactivos</SelectItem>
                    </SelectContent>
                </Select>

                {/* Toggle vista */}
                <Tabs
                    value={view}
                    onValueChange={(v) => setView(v as "grid" | "map")}
                >
                    <TabsList className="h-9">
                        <TabsTrigger value="grid" className="px-3">
                            <LayoutGrid className="h-4 w-4" />
                        </TabsTrigger>
                        <TabsTrigger value="map" className="px-3">
                            <Map className="h-4 w-4" />
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Contenido */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
                    <LayoutList className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium">No hay puestos de trabajo</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        {workstations.length === 0
                            ? "Crea tu primer puesto de trabajo para empezar."
                            : "No se encontraron resultados con los filtros actuales."}
                    </p>
                    {workstations.length === 0 && (
                        <Button
                            className="mt-4"
                            onClick={() => router.push(`/t/${tenantSlug}/workstations/new`)}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Crear primer puesto
                        </Button>
                    )}
                </div>
            ) : view === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map((ws) => (
                        <WorkstationCard
                            key={ws.id}
                            workstation={ws}
                            branchName={branchMap[ws.branch_id]}
                            onToggleActive={handleToggleActive}
                            onDelete={handleDelete}
                            onDuplicate={handleDuplicate}
                        />
                    ))}
                </div>
            ) : (
                <WorkstationFloorMap
                    workstations={filtered}
                    floor={mapFloor}
                    editable
                    onPositionChange={handleMapPositionChange}
                    onFloorChange={setMapFloor}
                />
            )}
        </div>
    );
}