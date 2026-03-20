// src/lib/services/currencies.ts
import { createBrowserSB } from "@/lib/supabase/client";
import type { Currency, ExchangeRate, ExchangeRateLog } from "@/types";

class CurrenciesService {
  private supabase = createBrowserSB();

  // ===================== CURRENCIES =====================

  async getAllCurrencies(): Promise<Currency[]> {
    const { data, error } = await this.supabase
      .from("currencies")
      .select("*")
      .order("is_base_currency", { ascending: false })
      .order("code");

    if (error) {
      console.error("Error fetching currencies:", error);
      throw new Error(`Error al obtener monedas: ${error.message}`);
    }

    return data || [];
  }

  async getActiveCurrencies(): Promise<Currency[]> {
    const { data, error } = await this.supabase
      .from("currencies")
      .select("*")
      .eq("is_active", true)
      .order("is_base_currency", { ascending: false })
      .order("code");

    if (error) {
      console.error("Error fetching active currencies:", error);
      throw new Error(`Error al obtener monedas activas: ${error.message}`);
    }

    return data || [];
  }

  async getBaseCurrency(): Promise<Currency | null> {
    const { data, error } = await this.supabase
      .from("currencies")
      .select("*")
      .eq("is_base_currency", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Error al obtener moneda base: ${error.message}`);
    }

    return data;
  }

  // ===================== EXCHANGE RATES =====================

  // La tasa vigente es la que tiene valid_until IS NULL (o la más reciente)
  async getExchangeRatesByTenant(tenantId: string): Promise<ExchangeRate[]> {
    const { data, error } = await this.supabase
      .from("exchange_rates")
      .select("*")
      .eq("tenant_id", tenantId)
      .is("valid_until", null)
      .order("from_currency");

    if (error) {
      console.error("Error fetching exchange rates:", error);
      throw new Error(`Error al obtener tasas de cambio: ${error.message}`);
    }

    return data || [];
  }

  async getExchangeRate(
    tenantId: string,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<ExchangeRate | null> {
    const { data, error } = await this.supabase
      .from("exchange_rates")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("from_currency", fromCurrency)
      .eq("to_currency", toCurrency)
      .is("valid_until", null)
      .order("valid_from", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Error al obtener tasa de cambio: ${error.message}`);
    }

    return data;
  }

  async getRateValue(
    tenantId: string,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<number | null> {
    if (fromCurrency === toCurrency) return 1;
    const rate = await this.getExchangeRate(tenantId, fromCurrency, toCurrency);
    return rate?.rate ?? null;
  }

  async getRateLogs(
    tenantId: string,
    fromCurrency: string,
    toCurrency: string,
    limit = 20,
  ): Promise<ExchangeRateLog[]> {
    const { data, error } = await this.supabase
      .from("exchange_rate_logs")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("from_currency", fromCurrency)
      .eq("to_currency", toCurrency)
      .order("changed_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching rate logs:", error);
      throw new Error(`Error al obtener historial de tasas: ${error.message}`);
    }

    return data || [];
  }

  // ===================== HELPERS =====================

  /**
   * Indica si una tasa lleva más de N horas sin actualizarse.
   * Usa valid_from como referencia del momento en que se configuró.
   */
  isRateStale(rate: ExchangeRate, hours = 24): boolean {
    return Date.now() - new Date(rate.valid_from).getTime() > hours * 3_600_000;
  }
}

export const currenciesService = new CurrenciesService();
