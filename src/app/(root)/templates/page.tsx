// src/app/(root)/templates/page.tsx
"use client";

import { useState } from "react";
import { Palette, Pencil, Check, RotateCcw } from "lucide-react";

import { templates } from "@/templates";
import { useTemplateStore } from "@/lib/stores/template-store";
import { TemplatePreview } from "@/components/shared/template-preview";
import { ColorEditor } from "@/components/shared/color-editor";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export default function TemplatesPage() {
  const [editorOpen, setEditorOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    templateId: string;
  }>({ open: false, templateId: "" });

  const {
    activeTemplate,
    selectTemplate,
    hasUnsavedChanges,
    resetToOriginal,
    applyPreview,
  } = useTemplateStore();

  const handleSelectTemplate = (templateId: string) => {
    if (hasUnsavedChanges) {
      setConfirmDialog({ open: true, templateId });
    } else {
      selectTemplate(templateId);
    }
  };

  const handleConfirmChange = () => {
    selectTemplate(confirmDialog.templateId);
    setConfirmDialog({ open: false, templateId: "" });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground">
            Selecciona y personaliza los temas visuales de la plataforma.
          </p>
        </div>
        <div className="flex gap-2">
          {hasUnsavedChanges && (
            <Button variant="outline" onClick={resetToOriginal}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Descartar cambios
            </Button>
          )}
          <Button onClick={() => setEditorOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar colores
          </Button>
        </div>
      </div>

      {/* Active Template Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Palette className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Template Activo</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {activeTemplate.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <Badge variant="secondary">Cambios sin guardar</Badge>
              )}
              <Button variant="outline" size="sm" onClick={applyPreview}>
                Aplicar Preview
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {activeTemplate.description}
          </p>
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Versión:</span>{" "}
              <span className="font-medium">{activeTemplate.version}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Autor:</span>{" "}
              <span className="font-medium">{activeTemplate.author}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Border Radius:</span>{" "}
              <span className="font-medium">
                {activeTemplate.layout.borderRadius}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Templates Disponibles</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplatePreview
              key={template.id}
              template={template}
              isSelected={activeTemplate.id === template.id}
              onClick={() => handleSelectTemplate(template.id)}
            />
          ))}
        </div>
      </div>

      {/* Color Palette Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Paleta de Colores Actual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Light Mode */}
            <div>
              <h4 className="text-sm font-medium mb-3">Modo Claro</h4>
              <div className="flex flex-wrap gap-2">
                <ColorSwatch
                  label="Background"
                  color={activeTemplate.theme.light.background}
                />
                <ColorSwatch
                  label="Primary"
                  color={activeTemplate.theme.light.primary}
                />
                <ColorSwatch
                  label="Secondary"
                  color={activeTemplate.theme.light.secondary}
                />
                <ColorSwatch
                  label="Accent"
                  color={activeTemplate.theme.light.accent}
                />
                <ColorSwatch
                  label="Muted"
                  color={activeTemplate.theme.light.muted}
                />
                <ColorSwatch
                  label="Destructive"
                  color={activeTemplate.theme.light.destructive}
                />
                <ColorSwatch
                  label="Border"
                  color={activeTemplate.theme.light.border}
                />
                <ColorSwatch
                  label="Sidebar"
                  color={activeTemplate.theme.light.sidebar}
                />
              </div>
            </div>

            {/* Dark Mode */}
            <div>
              <h4 className="text-sm font-medium mb-3">Modo Oscuro</h4>
              <div className="flex flex-wrap gap-2">
                <ColorSwatch
                  label="Background"
                  color={activeTemplate.theme.dark.background}
                />
                <ColorSwatch
                  label="Primary"
                  color={activeTemplate.theme.dark.primary}
                />
                <ColorSwatch
                  label="Secondary"
                  color={activeTemplate.theme.dark.secondary}
                />
                <ColorSwatch
                  label="Accent"
                  color={activeTemplate.theme.dark.accent}
                />
                <ColorSwatch
                  label="Muted"
                  color={activeTemplate.theme.dark.muted}
                />
                <ColorSwatch
                  label="Destructive"
                  color={activeTemplate.theme.dark.destructive}
                />
                <ColorSwatch
                  label="Border"
                  color={activeTemplate.theme.dark.border}
                />
                <ColorSwatch
                  label="Sidebar"
                  color={activeTemplate.theme.dark.sidebar}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Color Editor Sheet */}
      <ColorEditor open={editorOpen} onOpenChange={setEditorOpen} />

      {/* Confirm Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog({ ...confirmDialog, open })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descartar cambios?</AlertDialogTitle>
            <AlertDialogDescription>
              Tienes cambios sin guardar en el template actual. Si cambias de
              template, perderás estos cambios.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmChange}>
              Descartar y cambiar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ColorSwatch({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card">
      <div
        className="w-6 h-6 rounded-md border shadow-sm"
        style={{ backgroundColor: color }}
      />
      <div>
        <p className="text-xs font-medium">{label}</p>
        <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">
          {color}
        </p>
      </div>
    </div>
  );
}