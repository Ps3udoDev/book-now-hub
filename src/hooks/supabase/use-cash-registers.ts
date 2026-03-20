// src/hooks/supabase/use-cash-registers.ts
import useSWR from "swr";
import { createBrowserSB } from "@/lib/supabase/client";
import type { Tables } from "@/types";

type CashRegister = Tables["cash_registers"]["Row"];

async function fetchCashRegistersByBranch(
  branchId: string,
): Promise<CashRegister[]> {
  const supabase = createBrowserSB();
  const { data, error } = await supabase
    .from("cash_registers")
    .select("*")
    .eq("branch_id", branchId)
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(`Error al obtener cajas: ${error.message}`);
  return data || [];
}

export function useCashRegistersByBranch(branchId: string | null) {
  const { data, error, isLoading } = useSWR<CashRegister[]>(
    branchId ? `cash_registers:branch:${branchId}` : null,
    () => (branchId ? fetchCashRegistersByBranch(branchId) : []),
    { revalidateOnFocus: false, dedupingInterval: 30000 },
  );

  return {
    cashRegisters: data || [],
    isLoading,
    error: error?.message || null,
  };
}
