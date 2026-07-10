// src/lib/xlsx/parse-upload.ts
import * as XLSX from "xlsx";
import type { ParsedRow, XlsxTemplateConfig } from "@/templates/xlsx";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const lower = value.toLowerCase().trim();
    if (["true", "si", "sí", "1", "yes"].includes(lower)) return true;
    if (["false", "no", "0"].includes(lower)) return false;
  }
  return null;
}

function formatExcelDate(value: unknown): string | null {
  // Si es un número (serial de Excel), convertir a fecha
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      const y = date.y.toString().padStart(4, "0");
      const m = date.m.toString().padStart(2, "0");
      const d = date.d.toString().padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (DATE_REGEX.test(trimmed)) return trimmed;
    // Intentar parsear otros formatos
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = (parsed.getMonth() + 1).toString().padStart(2, "0");
      const d = parsed.getDate().toString().padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }
  return null;
}

export async function parseUpload(
  file: File,
  config: XlsxTemplateConfig,
): Promise<ParsedRow[]> {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: "array" });

  // Leer la primera hoja
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error("No se encontró ninguna hoja en el archivo");

  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
  });

  if (rawData.length === 0) {
    throw new Error("El archivo está vacío");
  }

  // Mapear encabezados a keys
  const headerToKey: Record<string, string> = {};
  for (const col of config.columns) {
    headerToKey[col.header] = col.key;
    // También aceptar la key directamente como encabezado
    headerToKey[col.key] = col.key;
  }

  // Detectar si la primera fila de datos es la fila de descripciones (la fila guía)
  const firstRow = rawData[0];
  const firstRowValues = Object.values(firstRow).map((v) =>
    String(v).toLowerCase(),
  );
  const isDescriptionRow = firstRowValues.some(
    (v) =>
      v.includes("obligatorio") ||
      v.includes("formato") ||
      v.includes("separad"),
  );

  const dataRows = isDescriptionRow ? rawData.slice(1) : rawData;

  // Parsear cada fila
  const parsed: ParsedRow[] = [];
  const seenNames = new Set<string>();
  const seenEmails = new Set<string>();

  for (let i = 0; i < dataRows.length; i++) {
    const raw = dataRows[i];
    const errors: string[] = [];
    const data: Record<string, unknown> = {};

    // Mapear campos del raw a las keys del config
    for (const col of config.columns) {
      // Buscar el valor por header o por key
      let value = raw[col.header] ?? raw[col.key] ?? "";

      // Limpiar strings vacíos
      if (typeof value === "string" && value.trim() === "") {
        value = "";
      }

      // Validar campos requeridos
      if (
        col.required &&
        (value === "" || value === null || value === undefined)
      ) {
        errors.push(`"${col.header}" es obligatorio`);
        data[col.key] = "";
        continue;
      }

      // Si está vacío y no es requerido, usar default
      if (value === "" || value === null || value === undefined) {
        data[col.key] = col.defaultValue ?? null;
        continue;
      }

      // Validar por tipo
      switch (col.type) {
        case "number": {
          const num = Number(value);
          if (Number.isNaN(num)) {
            errors.push(`"${col.header}" debe ser un número`);
            data[col.key] = value;
          } else {
            data[col.key] = num;
          }
          break;
        }
        case "boolean": {
          const bool = parseBoolean(value);
          if (bool === null) {
            errors.push(`"${col.header}" debe ser true o false`);
            data[col.key] = value;
          } else {
            data[col.key] = bool;
          }
          break;
        }
        case "enum": {
          const strVal = String(value).trim().toLowerCase();
          if (col.enumValues && !col.enumValues.includes(strVal)) {
            errors.push(
              `"${col.header}" debe ser: ${col.enumValues.join(", ")}`,
            );
            data[col.key] = value;
          } else {
            data[col.key] = strVal;
          }
          break;
        }
        case "date": {
          const dateStr = formatExcelDate(value);
          if (!dateStr) {
            errors.push(`"${col.header}" debe tener formato YYYY-MM-DD`);
            data[col.key] = value;
          } else {
            data[col.key] = dateStr;
          }
          break;
        }
        default:
          data[col.key] = String(value).trim();
      }
    }

    // Validar email si existe
    if (data.email && typeof data.email === "string" && data.email.length > 0) {
      if (!EMAIL_REGEX.test(data.email)) {
        errors.push("Email no tiene formato válido");
      }
    }

    // Detectar duplicados dentro del archivo
    let isDuplicate = false;

    if (config.entity === "services") {
      const name = String(data.name || "").toLowerCase();
      if (name && seenNames.has(name)) {
        isDuplicate = true;
      }
      seenNames.add(name);
    }

    if (config.entity === "products") {
      // Dedupe por SKU si existe; si no, por nombre.
      const sku = String(data.sku || "").toLowerCase();
      const name = String(data.name || "").toLowerCase();
      const dedupeKey = sku || name;
      if (dedupeKey && seenNames.has(dedupeKey)) {
        isDuplicate = true;
      }
      if (dedupeKey) seenNames.add(dedupeKey);
    }

    if (config.entity === "specialists" || config.entity === "customers") {
      const email = String(data.email || "").toLowerCase();
      if (email && seenEmails.has(email)) {
        isDuplicate = true;
      }
      if (email) seenEmails.add(email);
    }

    parsed.push({
      rowIndex: i + 1,
      data,
      errors,
      isDuplicate,
    });
  }

  return parsed;
}
