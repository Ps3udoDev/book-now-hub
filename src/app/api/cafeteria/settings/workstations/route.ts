import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";

type AppointmentCandidate = {
  workstation_id: string | null;
  specialist_id: string | null;
  scheduled_at: string;
  status: "pending" | "confirmed" | "in_progress";
  specialist: { full_name: string | null } | null;
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSB();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenant_id");
    const branchId = searchParams.get("branch_id");

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenant_id es requerido" },
        { status: 400 },
      );
    }

    const { data: tenantUser } = await supabaseAdmin
      .from("tenant_users")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("auth_user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!tenantUser) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    let query = supabaseAdmin
      .from("workstations")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("name");

    if (branchId) {
      query = query.eq("branch_id", branchId);
    }

    const { data: workstations, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const workstationIds = (workstations || []).map((workstation) => workstation.id);
    if (workstationIds.length === 0) {
      return NextResponse.json({ workstations: [] });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const { data: appointments } = await supabaseAdmin
      .from("appointments")
      .select(
        "workstation_id, specialist_id, scheduled_at, status, specialist:profiles!appointments_specialist_id_fkey(full_name)",
      )
      .in("workstation_id", workstationIds)
      .in("status", ["pending", "confirmed", "in_progress"])
      .gte("scheduled_at", startOfDay.toISOString())
      .lt("scheduled_at", endOfDay.toISOString());

    const bestByWorkstation = new Map<string, AppointmentCandidate>();
    const now = Date.now();

    for (const appointment of (appointments || []) as AppointmentCandidate[]) {
      if (!appointment.workstation_id) {
        continue;
      }

      const current = bestByWorkstation.get(appointment.workstation_id);
      const priority =
        appointment.status === "in_progress"
          ? 0
          : Math.abs(new Date(appointment.scheduled_at).getTime() - now);
      const currentPriority =
        current?.status === "in_progress"
          ? 0
          : current
            ? Math.abs(new Date(current.scheduled_at).getTime() - now)
            : Number.POSITIVE_INFINITY;

      if (!current || priority < currentPriority) {
        bestByWorkstation.set(appointment.workstation_id, appointment);
      }
    }

    const enriched = (workstations || []).map((workstation) => {
      const current = bestByWorkstation.get(workstation.id);
      return {
        ...workstation,
        current_specialist_id: current?.specialist_id || null,
        current_specialist_name: current?.specialist?.full_name || null,
      };
    });

    return NextResponse.json({ workstations: enriched });
  } catch (error) {
    console.error("Error in GET /api/cafeteria/settings/workstations", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
