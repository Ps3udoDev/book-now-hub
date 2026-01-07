// src/components/shared/color-editor.tsx
"use client";

import { useState } from "react";
import { Sun, Moon, RotateCcw, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTemplateStore } from "@/lib/stores/template-store";
import type { ThemeColors } from "@/templates/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface ColorEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Grupos de colores para organizar el editor
const colorGroups = [
  {
    name: "Base",
    colors: [
      { key: "background", label: "Fondo" },
      { key: "foreground", label: "Texto" },
    ] as const,
  },
  {
    name: "Primary",
    colors: [
      { key: "primary", label: "Primary" },
      { key: "primaryForeground", label: "Primary Text" },
    ] as const,
  },
  {
    name: "Secondary",
    colors: [
      { key: "secondary", label: "Secondary" },
      { key: "secondaryForeground", label: "Secondary Text" },
    ] as const,
  },
  {
    name: "Accent",
    colors: [
      { key: "accent", label: "Accent" },
      { key: "accentForeground", label: "Accent Text" },
    ] as const,
  },
  {
    name: "Muted",
    colors: [
      { key: "muted", label: "Muted" },
      { key: "mutedForeground", label: "Muted Text" },
    ] as const,
  },
  {
    name: "Card",
    colors: [
      { key: "card", label: "Card" },
      { key: "cardForeground", label: "Card Text" },
    ] as const,
  },
  {
    name: "Destructive",
    colors: [{ key: "destructive", label: "Destructive" }] as const,
  },
  {
    name: "Border & Input",
    colors: [
      { key: "border", label: "Border" },
      { key: "input", label: "Input" },
      { key: "ring", label: "Ring (Focus)" },
    ] as const,
  },
  {
    name: "Sidebar",
    colors: [
      { key: "sidebar", label: "Sidebar" },
      { key: "sidebarForeground", label: "Sidebar Text" },
      { key: "sidebarPrimary", label: "Sidebar Primary" },
      { key: "sidebarAccent", label: "Sidebar Accent" },
      { key: "sidebarBorder", label: "Sidebar Border" },
    ] as const,
  },
];

export function ColorEditor({ open, onOpenChange }: ColorEditorProps) {
  const {
    activeTemplate,
    editingMode,
    setEditingMode,
    updateColor,
    applyPreview,
    resetToOriginal,
    getCurrentColors,
    hasUnsavedChanges,
  } = useTemplateStore();

  const currentColors = getCurrentColors(editingMode);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Editar Colores</SheetTitle>
          <SheetDescription>
            Personaliza los colores del template "{activeTemplate.name}"
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {/* Mode Tabs */}
          <Tabs
            value={editingMode}
            onValueChange={(v) => setEditingMode(v as "light" | "dark")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="light" className="gap-2">
                <Sun className="h-4 w-4" />
                Light
              </TabsTrigger>
              <TabsTrigger value="dark" className="gap-2">
                <Moon className="h-4 w-4" />
                Dark
              </TabsTrigger>
            </TabsList>

            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={applyPreview}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetToOriginal}
                disabled={!hasUnsavedChanges}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>

            <TabsContent value="light" className="mt-4">
              <ColorGroups
                colors={currentColors}
                onColorChange={updateColor}
              />
            </TabsContent>

            <TabsContent value="dark" className="mt-4">
              <ColorGroups
                colors={currentColors}
                onColorChange={updateColor}
              />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface ColorGroupsProps {
  colors: ThemeColors;
  onColorChange: (key: keyof ThemeColors, value: string) => void;
}

function ColorGroups({ colors, onColorChange }: ColorGroupsProps) {
  return (
    <ScrollArea className="h-[calc(100vh-280px)]">
      <div className="space-y-6 pr-4">
        {colorGroups.map((group) => (
          <div key={group.name}>
            <h4 className="text-sm font-medium mb-3">{group.name}</h4>
            <div className="space-y-3">
              {group.colors.map(({ key, label }) => (
                <ColorInput
                  key={key}
                  label={label}
                  value={colors[key] || ""}
                  onChange={(value) => onColorChange(key, value)}
                />
              ))}
            </div>
            <Separator className="mt-4" />
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorInput({ label, value, onChange }: ColorInputProps) {
  const [localValue, setLocalValue] = useState(value);

  // Convertir oklch a color aproximado para el color picker
  const getPreviewColor = (oklchValue: string) => {
    // Por ahora devolvemos el valor directo, el navegador lo renderizará
    return oklchValue;
  };

  const handleInputChange = (newValue: string) => {
    setLocalValue(newValue);
    onChange(newValue);
  };

  return (
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-md border border-border shadow-sm flex-shrink-0"
        style={{ backgroundColor: getPreviewColor(value) }}
      />
      <div className="flex-1 min-w-0">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Input
          value={localValue}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="oklch(0.5 0.2 250)"
          className="h-8 text-xs font-mono"
        />
      </div>
    </div>
  );
}