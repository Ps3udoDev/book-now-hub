// src/lib/services/cash-sessions.ts
import { createBrowserSB } from "@/lib/supabase/client";
import type { CashRegisterSession, CashRegisterSummary } from "@/types";

export type { CashRegisterSession, CashRegisterSummary };
export type CashSessionStatus = "open" | "closed";

export interface OpenSessionData {
  branch_id: string;
  cash_register_id: string;
  opening_amount: number;
  notes?: string | null;
}

export interface CloseSessionData {
  closing_amount?: number | null;
  notes?: string | null;
}

export interface SummaryRow {
  area: string;
  currency_code: string;
  total_cash: number;
  total_card: number;
  total_transfer: number;
  total_mobile_payment: number;
  total_gateway: number;
  total_amount: number;
  transaction_count: number;
}

/** Sesión enriquecida para el dashboard/historial */
export interface EnrichedSession extends CashRegisterSession {
  register_name: string;
  register_currency: string;
  branch_name: string;
  opened_by_name: string;
  closed_by_name: string | null;
  /** Suma total cobrado (de filas area='total' de summaries) */
  total_collected: number;
  currencies: string[];
}

/** Sesión con detalle completo para el reporte */
export interface SessionWithDetails extends CashRegisterSession {
  register_name: string;
  register_currency: string;
  branch_name: string;
  opened_by_name: string;
  closed_by_name: string | null;
  summaries: CashRegisterSummary[];
}

class CashSessionsService {
  private supabase = createBrowserSB();

  /** Obtiene la sesión activa (status='open') de una sucursal, o null si no hay. */
  async getActiveSession(
    branchId: string,
  ): Promise<CashRegisterSession | null> {
    const { data, error } = await this.supabase
      .from("cash_register_sessions")
      .select("*")
      .eq("branch_id", branchId)
      .eq("status", "open")
      .maybeSingle();

    if (error) throw new Error(`Error al obtener sesión: ${error.message}`);
    return data;
  }

  /** Obtiene el historial de sesiones cerradas de una sucursal con datos enriquecidos. */
  async getClosedSessions(
    branchId: string,
    filters?: { from?: string; to?: string },
  ): Promise<EnrichedSession[]> {
    let query = this.supabase
      .from("cash_register_sessions")
      .select(
        `*, cash_register:cash_registers!cash_register_sessions_cash_register_id_fkey(name, currency_iso), branch:branches!cash_register_sessions_branch_id_fkey(name)`,
      )
      .eq("branch_id", branchId)
      .eq("status", "closed")
      .order("closed_at", { ascending: false });

    if (filters?.from) query = query.gte("opened_at", filters.from);
    if (filters?.to) query = query.lte("opened_at", `${filters.to}T23:59:59`);

    const { data: sessions, error } = await query;
    if (error) throw new Error(`Error al obtener historial: ${error.message}`);
    if (!sessions || sessions.length === 0) return [];

    // Obtener nombres de operadores
    const userIds = [
      ...new Set(
        sessions.flatMap(
          (s) => [s.opened_by, s.closed_by].filter(Boolean) as string[],
        ),
      ),
    ];

    const { data: profiles } = await this.supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, p.full_name]),
    );

    // Obtener totales de summaries (solo filas area='total')
    const sessionIds = sessions.map((s) => s.id);
    const { data: summaries } = await this.supabase
      .from("cash_register_summaries")
      .select("session_id, currency_code, total_amount")
      .in("session_id", sessionIds)
      .eq("area", "total");

    const summaryMap = new Map<
      string,
      { total: number; currencies: string[] }
    >();
    for (const row of summaries ?? []) {
      const existing = summaryMap.get(row.session_id) ?? {
        total: 0,
        currencies: [],
      };
      existing.total += Number(row.total_amount);
      if (!existing.currencies.includes(row.currency_code)) {
        existing.currencies.push(row.currency_code);
      }
      summaryMap.set(row.session_id, existing);
    }

    return sessions.map((s) => {
      const reg = (
        s as unknown as {
          cash_register: { name: string; currency_iso: string } | null;
        }
      ).cash_register;
      const br = (s as unknown as { branch: { name: string } | null }).branch;
      const agg = summaryMap.get(s.id) ?? { total: 0, currencies: [] };
      return {
        ...s,
        register_name: reg?.name ?? "—",
        register_currency: reg?.currency_iso ?? "—",
        branch_name: br?.name ?? "—",
        opened_by_name: profileMap.get(s.opened_by) ?? s.opened_by,
        closed_by_name: s.closed_by
          ? (profileMap.get(s.closed_by) ?? s.closed_by)
          : null,
        total_collected: agg.total,
        currencies: agg.currencies,
      } as EnrichedSession;
    });
  }

  /** Obtiene una sesión con todo el detalle para el reporte de cierre. */
  async getSessionWithDetails(
    sessionId: string,
  ): Promise<SessionWithDetails | null> {
    const { data: session, error } = await this.supabase
      .from("cash_register_sessions")
      .select(
        `*, cash_register:cash_registers!cash_register_sessions_cash_register_id_fkey(name, currency_iso), branch:branches!cash_register_sessions_branch_id_fkey(name)`,
      )
      .eq("id", sessionId)
      .maybeSingle();

    if (error) throw new Error(`Error al obtener sesión: ${error.message}`);
    if (!session) return null;

    // Summaries guardados al cierre
    const { data: summaries } = await this.supabase
      .from("cash_register_summaries")
      .select("*")
      .eq("session_id", sessionId)
      .order("area");

    // Nombres de operadores
    const userIds = [session.opened_by, session.closed_by].filter(
      Boolean,
    ) as string[];
    const { data: profiles } = await this.supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, p.full_name]),
    );

    const reg = (
      session as unknown as {
        cash_register: { name: string; currency_iso: string } | null;
      }
    ).cash_register;
    const br = (session as unknown as { branch: { name: string } | null })
      .branch;

    return {
      ...session,
      register_name: reg?.name ?? "—",
      register_currency: reg?.currency_iso ?? "—",
      branch_name: br?.name ?? "—",
      opened_by_name: profileMap.get(session.opened_by) ?? session.opened_by,
      closed_by_name: session.closed_by
        ? (profileMap.get(session.closed_by) ?? session.closed_by)
        : null,
      summaries: (summaries as CashRegisterSummary[]) ?? [],
    } as SessionWithDetails;
  }

  /** Abre una nueva sesión de caja. */
  async openSession(data: OpenSessionData): Promise<CashRegisterSession> {
    const res = await fetch("/api/cash-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error al abrir sesión de caja");
    return json.session as CashRegisterSession;
  }

  /** Obtiene el resumen calculado en tiempo real de una sesión. */
  async getSessionSummary(
    sessionId: string,
  ): Promise<{ session: CashRegisterSession; summary: SummaryRow[] }> {
    const res = await fetch(`/api/cash-sessions/${sessionId}/summary`);
    const json = await res.json();
    if (!res.ok)
      throw new Error(json.error || "Error al obtener resumen de sesión");
    return json as { session: CashRegisterSession; summary: SummaryRow[] };
  }

  /** Cierra una sesión de caja y guarda el resumen. */
  async closeSession(
    sessionId: string,
    data: CloseSessionData,
  ): Promise<{ session: CashRegisterSession; summary: SummaryRow[] }> {
    const res = await fetch(`/api/cash-sessions/${sessionId}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok)
      throw new Error(json.error || "Error al cerrar sesión de caja");
    return json as { session: CashRegisterSession; summary: SummaryRow[] };
  }
}

export const cashSessionsService = new CashSessionsService();
