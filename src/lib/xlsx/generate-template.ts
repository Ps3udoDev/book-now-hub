// src/lib/xlsx/generate-template.ts
import * as XLSX from "xlsx";
import type { XlsxTemplateConfig } from "@/templates/xlsx";

// Datos de ejemplo para cada entidad
const exampleData: Record<string, Record<string, unknown>> = {
  services: {
    name: "Corte de cabello",
    category: "hair",
    duration_minutes: 30,
    base_price: 15,
    description: "Corte clásico para caballeros",
    buffer_minutes: 5,
    currency_code: "USD",
    requires_specialist: true,
    requires_station: false,
    is_featured: false,
    is_active: true,
  },
  specialists: {
    full_name: "María García",
    email: "maria@ejemplo.com",
    phone: "04141234567",
    role: "employee",
    specialties: "hair_cutting, hair_coloring",
    bio: "Estilista con 5 años de experiencia",
    commission_type: "percentage",
    commission_percentage: 30,
    commission_fixed: 0,
    is_active: true,
  },
  customers: {
    first_name: "Juan",
    last_name: "Pérez",
    email: "juan@ejemplo.com",
    phone: "04141234567",
    phone_country_code: "+58",
    document_type: "V",
    document_number: "12345678",
    birth_date: "1990-05-15",
    gender: "male",
    address: "Av. Principal, Edificio 1",
    city: "Caracas",
    tags: "VIP, frecuente",
    notes: "Prefiere citas en la mañana",
  },
};

export function generateTemplate(config: XlsxTemplateConfig): void {
  const wb = XLSX.utils.book_new();

  // Fila de encabezados
  const headers = config.columns.map((col) => col.header);

  // Fila de descripciones/notas
  const descriptions = config.columns.map(
    (col) => col.description || ""
  );

  // Fila de ejemplo
  const example = exampleData[config.entity] || {};
  const exampleRow = config.columns.map((col) => {
    const val = example[col.key];
    if (val !== undefined) return val;
    if (col.defaultValue !== undefined) return col.defaultValue;
    return "";
  });

  // Crear los datos de la hoja
  const wsData = [headers, descriptions, exampleRow];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Configurar anchos de columna
  ws["!cols"] = config.columns.map((col) => ({
    wch: col.width || 15,
  }));

  // Estilo: la fila de descripciones es informativa (se puede borrar)
  // SheetJS Community no soporta estilos, pero los datos quedan claros

  XLSX.utils.book_append_sheet(wb, ws, config.sheetName);

  // Generar y descargar
  const fileName = `plantilla_${config.entity}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
