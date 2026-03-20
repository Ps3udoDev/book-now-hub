// src/components/workstations/workstation-floor-map.tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { WorkstationIcon } from "./workstation-icon";
import { getStationType } from "@/lib/services/workstations";
import type { Tables } from "@/types";

type Workstation = Tables["workstations"]["Row"];

interface WorkstationFloorMapProps {
    workstations: Workstation[];
    floor?: number;
    editable?: boolean;
    onPositionChange?: (workstationId: string, x: number, y: number) => void;
    onFloorChange?: (floor: number) => void;
    selectedId?: string | null;
    onSelect?: (workstation: Workstation) => void;
}

export function WorkstationFloorMap({
    workstations,
    floor = 1,
    editable = false,
    onPositionChange,
    onFloorChange,
    selectedId,
    onSelect,
}: WorkstationFloorMapProps) {
    const router = useRouter();
    const params = useParams();
    const tenantSlug = params.tenant as string;
    const mapRef = useRef<HTMLDivElement>(null);
    const [zoom, setZoom] = useState(1);
    const [dragging, setDragging] = useState<string | null>(null);

    // Filtrar por piso
    const floorWorkstations = workstations.filter(
        (w) => (w.floor || 1) === floor
    );

    // Pisos disponibles
    const floors = [...new Set(workstations.map((w) => w.floor || 1))].sort();

    const handleZoomIn = () => setZoom((z) => Math.min(z + 0.2, 2));
    const handleZoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.4));
    const handleZoomReset = () => setZoom(1);

    // Drag & drop para modo editable
    const handleMouseDown = useCallback(
        (e: React.MouseEvent, workstationId: string) => {
            if (!editable) return;
            e.preventDefault();
            setDragging(workstationId);
        },
        [editable]
    );

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (!dragging || !mapRef.current || !editable) return;

            const rect = mapRef.current.getBoundingClientRect();
            const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
            const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

            onPositionChange?.(dragging, Math.round(x), Math.round(y));
        },
        [dragging, editable, onPositionChange]
    );

    const handleMouseUp = useCallback(() => {
        setDragging(null);
    }, []);

    const handleStationClick = (workstation: Workstation) => {
        if (editable) {
            onSelect?.(workstation);
            return;
        }
        // En modo vista, navegar al detalle
        router.push(`/t/${tenantSlug}/workstations/${workstation.id}`);
    };

    return (
        <div className="space-y-3">
            {/* Controles de zoom y piso */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {floors.length > 1 &&
                        floors.map((f) => (
                            <Badge
                                key={f}
                                variant={f === floor ? "default" : "outline"}
                                className="cursor-pointer"
                                onClick={() => onFloorChange?.(f)}
                            >
                                Piso {f}
                            </Badge>
                        ))}
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomOut}>
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground w-10 text-center">
                        {Math.round(zoom * 100)}%
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomIn}>
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomReset}>
                        <Maximize2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Mapa */}
            <div className="overflow-auto rounded-xl border bg-muted/30">
                <div
                    ref={mapRef}
                    className="relative select-none"
                    style={{
                        width: `${600 * zoom}px`,
                        height: `${400 * zoom}px`,
                        margin: "0 auto",
                        backgroundImage:
                            "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
                        backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
                    }}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {floorWorkstations.length === 0 ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <p className="text-sm text-muted-foreground">
                                No hay estaciones en este piso.
                                {editable
                                    ? " Agrega una y arrastra para posicionarla."
                                    : ""}
                            </p>
                        </div>
                    ) : (
                        <TooltipProvider delayDuration={200}>
                            {floorWorkstations.map((ws) => {
                                const typeInfo = getStationType(ws.station_type || "general");
                                const isSelected = ws.id === selectedId;
                                const posX = (ws.position_x || 50) * zoom;
                                const posY = (ws.position_y || 50) * zoom;

                                return (
                                    <Tooltip key={ws.id}>
                                        <TooltipTrigger asChild>
                                            <button
                                                type="button"
                                                className={`absolute flex flex-col items-center gap-0.5 transition-shadow rounded-lg p-1.5 ${
                                                    editable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                                                } ${
                                                    isSelected
                                                        ? "ring-2 ring-primary ring-offset-2"
                                                        : "hover:ring-1 hover:ring-primary/50"
                                                } ${
                                                    !ws.is_active ? "opacity-40" : ""
                                                }`}
                                                style={{
                                                    left: `${(ws.position_x || 50)}%`,
                                                    top: `${(ws.position_y || 50)}%`,
                                                    transform: "translate(-50%, -50%)",
                                                    backgroundColor: `${typeInfo.color}15`,
                                                    borderColor: typeInfo.color,
                                                    borderWidth: "1px",
                                                }}
                                                onClick={() => handleStationClick(ws)}
                                                onMouseDown={(e) => handleMouseDown(e, ws.id)}
                                            >
                                                <WorkstationIcon
                                                    stationType={ws.station_type || "general"}
                                                    size={20 * zoom}
                                                />
                                                <span
                                                    className="text-[10px] font-medium leading-tight max-w-[60px] truncate"
                                                    style={{
                                                        fontSize: `${10 * zoom}px`,
                                                    }}
                                                >
                                                    {ws.code || ws.name}
                                                </span>
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="text-xs">
                                            <p className="font-semibold">{ws.name}</p>
                                            <p className="text-muted-foreground">{typeInfo.label}</p>
                                            {!ws.is_active && (
                                                <p className="text-amber-500">Inactivo</p>
                                            )}
                                        </TooltipContent>
                                    </Tooltip>
                                );
                            })}
                        </TooltipProvider>
                    )}
                </div>
            </div>

            {/* Leyenda */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="font-medium">Leyenda:</span>
                {[...new Set(floorWorkstations.map((w) => w.station_type || "general"))].map(
                    (type) => {
                        const info = getStationType(type);
                        return (
                            <div key={type} className="flex items-center gap-1">
                                <div
                                    className="h-3 w-3 rounded-sm"
                                    style={{ backgroundColor: info.color }}
                                />
                                <span>{info.label}</span>
                            </div>
                        );
                    }
                )}
            </div>
        </div>
    );
}