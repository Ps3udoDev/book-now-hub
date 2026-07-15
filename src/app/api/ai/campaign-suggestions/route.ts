// src/app/api/ai/campaign-suggestions/route.ts
// Orquesta: gate tenant + módulo → snapshot → LLM → grounding (conteo real).
import { type NextRequest, NextResponse } from "next/server";
import { suggestCampaigns } from "@/lib/ai/campaign-suggester";
import { buildTenantSnapshot } from "@/lib/ai/context";
import {
  CAMPAIGN_WRITE_ROLES,
  requireTenantAccess,
} from "@/lib/api/tenant-auth";
import {
  previewSegment,
  SegmentValidationError,
  validateRules,
} from "@/lib/segments/engine";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { GroundedProposal } from "@/types";

/**
 * Verifica que el tenant tenga el módulo ai-assistant habilitado.
 * Nota: se resuelve en dos pasos (en vez de un embed `modules!inner(slug)`)
 * para evitar depender de la tipificación inestable de filtros sobre
 * relaciones embebidas en el cliente generado de Supabase.
 */
async function moduleEnabled(tenantId: string): Promise<boolean> {
  const { data: module } = await supabaseAdmin
    .from("modules")
    .select("id")
    .eq("slug", "ai-assistant")
    .maybeSingle();
  if (!module) return false;

  const { data } = await supabaseAdmin
    .from("tenant_modules")
    .select("is_enabled")
    .eq("tenant_id", tenantId)
    .eq("module_id", module.id)
    .maybeSingle();
  return !!data?.is_enabled;
}

export async function POST(request: NextRequest) {
  try {
    const { tenant_id } = await request.json();

    const access = await requireTenantAccess(tenant_id, CAMPAIGN_WRITE_ROLES);
    if (!access.ok)
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );

    if (!(await moduleEnabled(tenant_id)))
      return NextResponse.json(
        { error: "El módulo de IA no está habilitado para este tenant" },
        { status: 403 },
      );

    // 1) Snapshot agregado (sin PII).
    const snapshot = await buildTenantSnapshot(supabaseAdmin, tenant_id);

    // 2) Propuestas del LLM.
    const raw = await suggestCampaigns(snapshot);

    // 3) Grounding: validar reglas + conteo real; descartar inválidas/vacías.
    const grounded: GroundedProposal[] = [];
    for (const p of raw) {
      try {
        validateRules(p.rules);
      } catch (e) {
        if (e instanceof SegmentValidationError) continue;
        throw e;
      }
      const { count, sample } = await previewSegment(
        supabaseAdmin,
        tenant_id,
        p.rules,
      );
      if (count === 0) continue;
      grounded.push({
        ...p,
        realCount: count,
        sample: sample.slice(0, 5).map((c) => ({
          id: c.id,
          full_name: c.full_name,
          phone: c.phone,
        })),
      });
    }

    return NextResponse.json({ proposals: grounded });
  } catch (err) {
    console.error("Error en POST /api/ai/campaign-suggestions:", err);
    return NextResponse.json(
      { error: "No se pudieron generar sugerencias. Reintenta." },
      { status: 502 },
    );
  }
}
