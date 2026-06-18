// src/components/client/specialist-picker.tsx
// Lista de especialistas elegibles, fiel al prototipo: card surface con
// avatar, rating con estrella acento y radio de seleccion.
"use client";

import { Check, Star } from "lucide-react";
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
      <p className="text-sm text-[var(--client-fg-muted)]">
        No hay especialistas disponibles para este horario.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2.5">
      {specialists.map((specialist) => {
        const isSelected = selectedId === specialist.specialist_id;
        return (
          <button
            key={specialist.specialist_id}
            type="button"
            onClick={() => onSelect(specialist.specialist_id)}
            className={cn(
              "flex items-center gap-3.5 border p-3 text-left transition-colors",
              isSelected
                ? "border-[var(--client-primary)] bg-[var(--client-surface-alt)]"
                : "border-[var(--client-border)] bg-[var(--client-surface)] hover:bg-[var(--client-surface-alt)]",
            )}
            style={{ borderRadius: "var(--client-rad-lg)" }}
          >
            <Avatar className="h-12 w-12">
              <AvatarImage
                src={specialist.specialist_avatar_url ?? undefined}
              />
              <AvatarFallback className="bg-[var(--client-surface-alt)] text-[var(--client-fg)]">
                {getInitials(specialist.specialist_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p
                className="truncate font-semibold text-[var(--client-fg)]"
                style={{ fontFamily: "var(--client-font-display)" }}
              >
                {specialist.specialist_name}
              </p>
              {specialist.specialist_total_ratings > 0 ? (
                <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-[var(--client-fg)]">
                  <Star className="h-3 w-3 fill-[var(--client-accent)] text-[var(--client-accent)]" />
                  {specialist.specialist_rating.toFixed(1)}
                  <span className="font-normal text-[var(--client-fg-muted)]">
                    · {specialist.specialist_total_ratings} valoraciones
                  </span>
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-[var(--client-fg-muted)]">
                  Sin valoraciones
                </p>
              )}
            </div>
            <span
              className={cn(
                "grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-[1.5px]",
                isSelected
                  ? "border-[var(--client-primary)] bg-[var(--client-primary)] text-[var(--client-primary-fg)]"
                  : "border-[var(--client-border)] text-transparent",
              )}
            >
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
