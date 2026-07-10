// src/templates/xlsx/types.ts

export interface XlsxColumnDef {
  key: string;
  header: string;
  required: boolean;
  type: "string" | "number" | "boolean" | "enum" | "date";
  enumValues?: string[];
  defaultValue?: unknown;
  description?: string;
  width?: number;
}

export interface XlsxTemplateConfig {
  entity: "services" | "specialists" | "customers" | "products";
  sheetName: string;
  columns: XlsxColumnDef[];
}

export interface ParsedRow {
  rowIndex: number;
  data: Record<string, unknown>;
  errors: string[];
  isDuplicate: boolean;
}
