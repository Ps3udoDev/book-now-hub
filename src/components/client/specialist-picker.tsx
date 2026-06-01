// src/components/client/specialist-picker.tsx
"use client";

import { Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ClientSlotSpecialist } from "@/lib/services/client-services";
import { cn } from "@/lib/utils";

interface SpecialistPickerProps {
  specialists: ClientSlotSpecialist[];
  selectedId: string | null;
  onSelect: (specialistId: string) => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function SpecialistPicker({
  specialists,
  selectedId,
  onSelect,
}: SpecialistPickerProps) {
  if (specialists.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay especialistas disponibles para este horario.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2">
      {specialists.map((specialist) => {
        const isSelected = selectedId === specialist.specialist_id;
        return (
          <button
            key={specialist.specialist_id}
            type="button"
            onClick={() => onSelect(specialist.specialist_id)}
            className={cn(
              "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
              isSelected ? "border-primary bg-primary/5" : "hover:bg-accent/50",
            )}
          >
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={specialist.specialist_avatar_url ?? undefined}
              />
              <AvatarFallback>
                {getInitials(specialist.specialist_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {specialist.specialist_name}
              </p>
              {specialist.specialist_total_ratings > 0 ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {specialist.specialist_rating.toFixed(1)} ·{" "}
                  {specialist.specialist_total_ratings} valoraciones
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Sin valoraciones
                </p>
              )}
            </div>
            {isSelected ? (
              <span className="text-xs font-medium text-primary">
                Seleccionado
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
