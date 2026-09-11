import { maskPhone } from "@/lib/mcp/formatters";
import type { McpRequestContext } from "@/lib/mcp/types";
import { supabaseAdmin } from "@/lib/supabase/admin";

export interface SearchCustomersInput {
  query: string;
  limit?: number;
}

export interface SanitizedCustomer {
  id: string;
  first_name: string;
  last_name: string;
  phone_masked: string | null;
  created_at: string;
}

/**
 * Busca clientes de forma acotada (mínimo 3 caracteres), enmascarando teléfono
 * y omitiendo notas internas, direcciones y documentos fiscales.
 */
export async function searchCustomersCapability(
  ctx: McpRequestContext,
  input: SearchCustomersInput,
): Promise<SanitizedCustomer[]> {
  const query = (input.query || "").trim();
  if (query.length < 3) {
    throw new Error("El término de búsqueda debe tener al menos 3 caracteres.");
  }

  const limit = Math.min(Math.max(input.limit || 20, 1), 100);

  const { data, error } = await supabaseAdmin
    .from("customers")
    .select("id, first_name, last_name, phone, created_at")
    .eq("tenant_id", ctx.tenantId)
    .or(
      `first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%`,
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Error al buscar clientes: ${error.message}`);
  }

  return (data || []).map((c) => ({
    id: c.id,
    first_name: c.first_name,
    last_name: c.last_name,
    phone_masked: maskPhone(c.phone),
    created_at: c.created_at || "",
  }));
}
