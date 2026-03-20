// src/components/workstations/workstation-icon.tsx
"use client";

import {
    Armchair,
    Droplets,
    Sparkles,
    Hand,
    Footprints,
    Flower2,
    Heart,
    Palette,
    Sofa,
    ConciergeBell,
    type LucideIcon,
} from "lucide-react";
import { getStationType } from "@/lib/services/workstations";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, LucideIcon> = {
    Armchair,
    Droplets,
    Sparkles,
    Hand,
    Footprints,
    Flower2,
    Heart,
    Palette,
    Sofa,
    ConciergeBell,
};

interface WorkstationIconProps {
    stationType: string;
    size?: number;
    className?: string;
    showBackground?: boolean;
}

export function WorkstationIcon({
    stationType,
    size = 20,
    className,
    showBackground = false,
}: WorkstationIconProps) {
    const typeInfo = getStationType(stationType);
    const IconComponent = ICON_MAP[typeInfo.icon] || Armchair;

    if (showBackground) {
        return (
            <div
                className={cn(
                    "flex items-center justify-center rounded-lg",
                    className
                )}
                style={{
                    backgroundColor: `${typeInfo.color}20`,
                    width: size + 16,
                    height: size + 16,
                }}
            >
                <IconComponent
                    size={size}
                    style={{ color: typeInfo.color }}
                />
            </div>
        );
    }

    return (
        <IconComponent
            size={size}
            style={{ color: typeInfo.color }}
            className={className}
        />
    );
}