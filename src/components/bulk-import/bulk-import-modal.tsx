// src/components/bulk-import/bulk-import-modal.tsx
"use client";

import { useState } from "react";
import { Loader2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { XlsxTemplateConfig, ParsedRow } from "@/templates/xlsx";
import { servicesService } from "@/lib/services/services";
import { specialistsService } from "@/lib/services/specialists";
import { customersService } from "@/lib/services/customers";
import type { CreateServiceData } from "@/lib/services/services";
import type { CreateSpecialistData } from "@/lib/services/specialists";
import type { CreateCustomerData } from "@/lib/services/customers";

interface BulkImportModalProps {
  open: boolean;
  onClose: () => void;
  entity: "services" | "specialists" | "customers";
  tenantId: string;
  parsedRows: ParsedRow[];
  setParsedRows: (rows: ParsedRow[]) => void;
  templateConfig: XlsxTemplateConfig;
  onImportComplete: () => void;
}

const entityLabels = {
  services: "servicios",
  specialists: "especialistas",
  customers: "clientes",
};

export function BulkImportModal({
  open,
  onClose,
  entity,
  tenantId,
  parsedRows,
  setParsedRows,
  templateConfig,
  onImportComplete,
}: BulkImportModalProps) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(
    () => new Set(parsedRows.map((_, i) => i))
  );
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
  } | null>(null);

  // Reiniciar selección cuando cambian los rows
  const validRows = parsedRows.filter(
    (row) => row.errors.length === 0 && !row.isDuplicate
  );
  const errorRows = parsedRows.filter((row) => row.errors.length > 0);
  const duplicateRows = parsedRows.filter(
    (row) => row.isDuplicate && row.errors.length === 0
  );

  const selectedValidCount = parsedRows.filter(
    (row, i) =>
      selectedRows.has(i) && row.errors.length === 0 && !row.isDuplicate
  ).length;

  const handleToggleRow = (index: number) => {
    const next = new Set(selectedRows);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedRows(next);
  };

  const handleToggleAll = () => {
    if (selectedRows.size === parsedRows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(parsedRows.map((_, i) => i)));
    }
  };

  const handleCellEdit = (
    rowIndex: number,
    key: string,
    value: string
  ) => {
    const updated = [...parsedRows];
    const row = { ...updated[rowIndex] };
    row.data = { ...row.data, [key]: value };

    // Re-validar la fila
    const errors: string[] = [];
    for (const col of templateConfig.columns) {
      const cellValue = row.data[col.key];
      const isEmpty =
        cellValue === "" || cellValue === null || cellValue === undefined;

      if (col.required && isEmpty) {
        errors.push(`"${col.header}" es obligatorio`);
      }

      if (!isEmpty && col.type === "enum" && col.enumValues) {
        const strVal = String(cellValue).trim().toLowerCase();
        if (!col.enumValues.includes(strVal)) {
          errors.push(
            `"${col.header}" debe ser: ${col.enumValues.join(", ")}`
          );
        }
      }

      if (!isEmpty && col.type === "number") {
        if (Number.isNaN(Number(cellValue))) {
          errors.push(`"${col.header}" debe ser un número`);
        }
      }
    }

    // Validar email
    if (row.data.email && typeof row.data.email === "string") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (row.data.email.length > 0 && !emailRegex.test(row.data.email)) {
        errors.push("Email no tiene formato válido");
      }
    }

    row.errors = errors;
    updated[rowIndex] = row;
    setParsedRows(updated);
  };

  const handleImport = async () => {
    setIsImporting(true);
    setImportResult(null);

    const rowsToImport = parsedRows.filter(
      (row, i) =>
        selectedRows.has(i) && row.errors.length === 0 && !row.isDuplicate
    );

    let success = 0;
    let failed = 0;

    // Procesar en lotes de 5 para no saturar
    const batchSize = 5;
    for (let i = 0; i < rowsToImport.length; i += batchSize) {
      const batch = rowsToImport.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map((row) => createEntity(row.data))
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          success++;
        } else {
          failed++;
        }
      }
    }

    setIsImporting(false);
    setImportResult({ success, failed });

    if (failed === 0) {
      toast.success(
        `${success} ${entityLabels[entity]} creados exitosamente`
      );
      onImportComplete();
    } else {
      toast.warning(
        `${success} creados, ${failed} fallaron`
      );
      if (success > 0) {
        onImportComplete();
      }
    }
  };

  const createEntity = async (data: Record<string, unknown>) => {
    switch (entity) {
      case "services": {
        const serviceData: CreateServiceData = {
          tenant_id: tenantId,
          name: String(data.name),
          category: String(data.category) as CreateServiceData["category"],
          duration_minutes: Number(data.duration_minutes),
          base_price: Number(data.base_price),
          description: data.description ? String(data.description) : undefined,
          buffer_minutes: data.buffer_minutes
            ? Number(data.buffer_minutes)
            : undefined,
          currency_code: data.currency_code
            ? String(data.currency_code)
            : undefined,
          requires_specialist:
            data.requires_specialist !== null
              ? Boolean(data.requires_specialist)
              : undefined,
          requires_station:
            data.requires_station !== null
              ? Boolean(data.requires_station)
              : undefined,
          is_featured:
            data.is_featured !== null ? Boolean(data.is_featured) : undefined,
          is_active:
            data.is_active !== null ? Boolean(data.is_active) : undefined,
        };
        return servicesService.createService(serviceData);
      }
      case "specialists": {
        const specialties =
          typeof data.specialties === "string" && data.specialties
            ? data.specialties
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean)
            : undefined;

        const specialistData: CreateSpecialistData = {
          tenant_id: tenantId,
          full_name: String(data.full_name),
          email: String(data.email),
          phone: data.phone ? String(data.phone) : undefined,
          role: data.role
            ? (String(data.role) as CreateSpecialistData["role"])
            : undefined,
          specialties,
          bio: data.bio ? String(data.bio) : undefined,
          commission_type: data.commission_type
            ? (String(
                data.commission_type
              ) as CreateSpecialistData["commission_type"])
            : undefined,
          commission_percentage: data.commission_percentage
            ? Number(data.commission_percentage)
            : undefined,
          commission_fixed: data.commission_fixed
            ? Number(data.commission_fixed)
            : undefined,
          is_active:
            data.is_active !== null ? Boolean(data.is_active) : undefined,
        };
        return specialistsService.createSpecialist(specialistData);
      }
      case "customers": {
        const tags =
          typeof data.tags === "string" && data.tags
            ? data.tags
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean)
            : undefined;

        const customerData: CreateCustomerData = {
          tenant_id: tenantId,
          first_name: String(data.first_name),
          last_name: String(data.last_name),
          email: data.email ? String(data.email) : undefined,
          phone: data.phone ? String(data.phone) : undefined,
          phone_country_code: data.phone_country_code
            ? String(data.phone_country_code)
            : undefined,
          document_type: data.document_type
            ? String(data.document_type)
            : undefined,
          document_number: data.document_number
            ? String(data.document_number)
            : undefined,
          birth_date: data.birth_date ? String(data.birth_date) : undefined,
          gender: data.gender
            ? (String(data.gender) as CreateCustomerData["gender"])
            : undefined,
          address: data.address ? String(data.address) : undefined,
          city: data.city ? String(data.city) : undefined,
          tags,
          notes: data.notes ? String(data.notes) : undefined,
        };
        return customersService.createCustomer(customerData);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Importar {entityLabels[entity]}
          </DialogTitle>
          <DialogDescription>
            Revisa los datos antes de importar. Puedes editar celdas haciendo
            clic en ellas.
          </DialogDescription>
        </DialogHeader>

        {/* Resumen */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            {parsedRows.length} registros
          </Badge>
          {errorRows.length > 0 && (
            <Badge variant="destructive">
              <XCircle className="h-3 w-3 mr-1" />
              {errorRows.length} con errores
            </Badge>
          )}
          {duplicateRows.length > 0 && (
            <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {duplicateRows.length} duplicados
            </Badge>
          )}
          {validRows.length > 0 && (
            <Badge className="bg-green-500/15 text-green-600 border-green-500/30">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {validRows.length} válidos
            </Badge>
          )}
        </div>

        {/* Tabla */}
        <div className="overflow-auto flex-1 border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="p-2 text-left w-10">
                  <Checkbox
                    checked={selectedRows.size === parsedRows.length}
                    onCheckedChange={handleToggleAll}
                  />
                </th>
                <th className="p-2 text-left text-muted-foreground w-10">
                  #
                </th>
                {templateConfig.columns.map((col) => (
                  <th
                    key={col.key}
                    className="p-2 text-left text-muted-foreground whitespace-nowrap"
                  >
                    {col.header}
                    {col.required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </th>
                ))}
                <th className="p-2 text-left text-muted-foreground">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody>
              {parsedRows.map((row, rowIdx) => {
                const hasErrors = row.errors.length > 0;
                const rowClass = hasErrors
                  ? "bg-destructive/5"
                  : row.isDuplicate
                    ? "bg-amber-500/5"
                    : "";

                return (
                  <tr
                    key={row.rowIndex}
                    className={`border-t hover:bg-muted/30 ${rowClass}`}
                  >
                    <td className="p-2">
                      <Checkbox
                        checked={selectedRows.has(rowIdx)}
                        onCheckedChange={() => handleToggleRow(rowIdx)}
                        disabled={hasErrors || row.isDuplicate}
                      />
                    </td>
                    <td className="p-2 text-muted-foreground">
                      {row.rowIndex}
                    </td>
                    {templateConfig.columns.map((col) => {
                      const value = row.data[col.key];
                      const cellError = row.errors.find((e) =>
                        e.includes(col.header)
                      );

                      return (
                        <td
                          key={col.key}
                          className={`p-2 ${cellError ? "ring-1 ring-destructive/50 ring-inset" : ""}`}
                        >
                          <div className="relative group">
                            <input
                              type="text"
                              className="w-full bg-transparent border-0 outline-none focus:ring-1 focus:ring-primary/50 rounded px-1 py-0.5 text-sm"
                              value={
                                value !== null && value !== undefined
                                  ? String(value)
                                  : ""
                              }
                              onChange={(e) =>
                                handleCellEdit(
                                  rowIdx,
                                  col.key,
                                  e.target.value
                                )
                              }
                            />
                            {cellError && (
                              <div className="absolute left-0 top-full z-10 hidden group-hover:block bg-destructive text-destructive-foreground text-xs rounded px-2 py-1 whitespace-nowrap shadow-md">
                                {cellError}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="p-2">
                      {hasErrors ? (
                        <Badge variant="destructive" className="text-xs">
                          Error
                        </Badge>
                      ) : row.isDuplicate ? (
                        <Badge className="text-xs bg-amber-500/15 text-amber-600 border-amber-500/30">
                          Duplicado
                        </Badge>
                      ) : (
                        <Badge className="text-xs bg-green-500/15 text-green-600 border-green-500/30">
                          OK
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Resultado de importación */}
        {importResult && (
          <div className="flex items-center gap-2 text-sm">
            {importResult.success > 0 && (
              <span className="text-green-600">
                {importResult.success} creados
              </span>
            )}
            {importResult.failed > 0 && (
              <span className="text-destructive">
                {importResult.failed} fallaron
              </span>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isImporting}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || selectedValidCount === 0}
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              `Crear ${selectedValidCount} ${entityLabels[entity]}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
