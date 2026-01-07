// src/components/shared/template-preview.tsx
"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TemplateConfig } from "@/templates/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TemplatePreviewProps {
  template: TemplateConfig;
  isSelected?: boolean;
  onClick?: () => void;
  showDetails?: boolean;
}

export function TemplatePreview({
  template,
  isSelected = false,
  onClick,
  showDetails = true,
}: TemplatePreviewProps) {
  const { theme, name, description } = template;

  // Colores principales para el preview
  const lightColors = theme.light;
  const darkColors = theme.dark;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-lg overflow-hidden",
        isSelected && "ring-2 ring-primary"
      )}
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Preview Visual */}
        <div className="grid grid-cols-2 h-32">
          {/* Light Mode Preview */}
          <div
            className="relative p-3 flex flex-col"
            style={{ backgroundColor: lightColors.background }}
          >
            <span
              className="text-[10px] font-medium mb-2"
              style={{ color: lightColors.mutedForeground }}
            >
              Light
            </span>
            <div className="flex-1 flex gap-1.5">
              {/* Mini Sidebar */}
              <div
                className="w-8 rounded-sm"
                style={{ backgroundColor: lightColors.sidebar }}
              />
              {/* Content Area */}
              <div className="flex-1 flex flex-col gap-1">
                {/* Header */}
                <div
                  className="h-3 rounded-sm"
                  style={{ backgroundColor: lightColors.card }}
                />
                {/* Cards */}
                <div className="flex-1 grid grid-cols-2 gap-1">
                  <div
                    className="rounded-sm"
                    style={{ backgroundColor: lightColors.card }}
                  />
                  <div
                    className="rounded-sm"
                    style={{ backgroundColor: lightColors.primary }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dark Mode Preview */}
          <div
            className="relative p-3 flex flex-col"
            style={{ backgroundColor: darkColors.background }}
          >
            <span
              className="text-[10px] font-medium mb-2"
              style={{ color: darkColors.mutedForeground }}
            >
              Dark
            </span>
            <div className="flex-1 flex gap-1.5">
              {/* Mini Sidebar */}
              <div
                className="w-8 rounded-sm"
                style={{ backgroundColor: darkColors.sidebar }}
              />
              {/* Content Area */}
              <div className="flex-1 flex flex-col gap-1">
                {/* Header */}
                <div
                  className="h-3 rounded-sm"
                  style={{ backgroundColor: darkColors.card }}
                />
                {/* Cards */}
                <div className="flex-1 grid grid-cols-2 gap-1">
                  <div
                    className="rounded-sm"
                    style={{ backgroundColor: darkColors.card }}
                  />
                  <div
                    className="rounded-sm"
                    style={{ backgroundColor: darkColors.primary }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Color Palette */}
        <div className="px-3 py-2 border-t flex items-center gap-1">
          <ColorDot color={lightColors.primary} title="Primary" />
          <ColorDot color={lightColors.secondary} title="Secondary" />
          <ColorDot color={lightColors.accent} title="Accent" />
          <ColorDot color={lightColors.destructive} title="Destructive" />
          <ColorDot color={lightColors.muted} title="Muted" />
        </div>

        {/* Details */}
        {showDetails && (
          <div className="px-3 py-3 border-t">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  {name}
                  {isSelected && (
                    <Badge variant="default" className="text-xs h-5">
                      <Check className="w-3 h-3 mr-1" />
                      Activo
                    </Badge>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {description}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ColorDot({ color, title }: { color: string; title: string }) {
  return (
    <div
      className="w-5 h-5 rounded-full border border-border/50 shadow-sm"
      style={{ backgroundColor: color }}
      title={title}
    />
  );
}