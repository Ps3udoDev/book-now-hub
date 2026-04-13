// src/lib/services/debts.ts
// Servicio para gestión de deudas de especialistas
import { createBrowserSB } from "@/lib/supabase/client";
import type { SpecialistDebt, SpecialistDebtPayment } from "@/types";

export interface DebtWithPayments extends SpecialistDebt {
  payments: SpecialistDebtPayment[];
}

export interface DebtBalance {
  specialist_id: string;
  currency_code: string;
  active_debts: number;
  total_original: number;
  total_remaining: number;
  total_paid: number;
}

class DebtsService {
  private supabase = createBrowserSB();

  /** Obtiene todas las deudas de un especialista */
  async getBySpecialist(
    tenantId: string,
    specialistId: string,
  ): Promise<SpecialistDebt[]> {
    const { data, error } = await this.supabase
      .from("specialist_debts")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("specialist_id", specialistId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Error al obtener deudas: ${error.message}`);
    return data ?? [];
  }

  /** Obtiene solo las deudas pendientes (remaining_amount > 0) */
  async getOutstandingDebts(
    tenantId: string,
    specialistId: string,
  ): Promise<SpecialistDebt[]> {
    const { data, error } = await this.supabase
      .from("specialist_debts")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("specialist_id", specialistId)
      .gt("remaining_amount", 0)
      .is("settled_at", null)
      .order("created_at", { ascending: true });

    if (error)
      throw new Error(`Error al obtener deudas pendientes: ${error.message}`);
    return data ?? [];
  }

  /** Obtiene el balance de deudas de todos los especialistas de un tenant */
  async getBalanceByTenant(tenantId: string): Promise<DebtBalance[]> {
    const { data, error } = await this.supabase
      .from("v_specialist_debt_balance")
      .select("*")
      .eq("tenant_id", tenantId);

    if (error) throw new Error(`Error al obtener balances: ${error.message}`);
    return (data as unknown as DebtBalance[]) ?? [];
  }

  /** Registra un pago parcial o total contra una deuda via API */
  async registerPayment(
    debtId: string,
    amount: number,
    notes?: string,
  ): Promise<void> {
    const res = await fetch("/api/debts/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ debt_id: debtId, amount, notes }),
    });
    const json = await res.json();
    if (!res.ok)
      throw new Error(json.error || "Error al registrar pago de deuda");
  }

  /** Pago masivo de deudas al liquidar comisiones */
  async bulkPayDebts(
    specialistId: string,
    tenantId: string,
    maxAmount: number,
  ): Promise<{ totalDeducted: number }> {
    const res = await fetch("/api/debts/bulk-pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        specialist_id: specialistId,
        tenant_id: tenantId,
        max_amount: maxAmount,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error al liquidar deudas");
    return { totalDeducted: json.total_deducted };
  }
}

export const debtsService = new DebtsService();
