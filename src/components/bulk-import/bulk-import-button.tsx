// src/components/bulk-import/bulk-import-button.tsx
"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { generateTemplate } from "@/lib/xlsx/generate-template";
import { parseUpload } from "@/lib/xlsx/parse-upload";
import { templateConfigs } from "@/templates/xlsx";
import type { ParsedRow } from "@/templates/xlsx";
import { BulkImportModal } from "./bulk-import-modal";

interface BulkImportButtonProps {
  entity: "services" | "specialists" | "customers";
  tenantId: string;
  onImportComplete: () => void;
}

export function BulkImportButton({
  entity,
  tenantId,
  onImportComplete,
}: BulkImportButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);

  const config = templateConfigs[entity];

  const handleDownloadTemplate = () => {
    generateTemplate(config);
    toast.success("Plantilla descargada");
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Resetear el input para permitir subir el mismo archivo
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Validar extensión
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls") {
      toast.error("Solo se aceptan archivos .xlsx o .xls");
      return;
    }

    try {
      const rows = await parseUpload(file, config);
      if (rows.length === 0) {
        toast.error("El archivo no contiene datos");
        return;
      }
      setParsedRows(rows);
      setModalOpen(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al leer el archivo";
      toast.error(message);
    }
  };

  const handleImportComplete = () => {
    setModalOpen(false);
    setParsedRows([]);
    onImportComplete();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFileSelect}
      />

      <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
        <Download className="h-4 w-4 mr-2" />
        Plantilla
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-4 w-4 mr-2" />
        Importar
      </Button>

      <BulkImportModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        entity={entity}
        tenantId={tenantId}
        parsedRows={parsedRows}
        setParsedRows={setParsedRows}
        templateConfig={config}
        onImportComplete={handleImportComplete}
      />
    </>
  );
}
