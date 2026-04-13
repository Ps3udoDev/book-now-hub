import { createBrowserSB } from "@/lib/supabase/client";
import type { InventoryMovementType, ProductStockSummary } from "@/lib/services/products";

export interface InventoryMovement {
  id: string;
  product_id: string;
  branch_id: string;
  movement_type: InventoryMovementType;
  quantity: number;
  reason: string | null;
  specialist_id: string | null;
  reference_id: string | null;
  created_by: string | null;
  created_at?: string | null;
}

export interface CreateInventoryMovementData {
  product_id: string;
  branch_id: string;
  movement_type: InventoryMovementType;
  quantity: number;
  reason?: string | null;
  specialist_id?: string | null;
  reference_id?: string | null;
  created_by?: string | null;
}

export interface InventoryMovementFilters {
  productId?: string;
  branchId?: string;
  movementType?: InventoryMovementType;
  specialistId?: string;
  dateFrom?: string;
  dateTo?: string;
}

class InventoryService {
  private supabase = createBrowserSB();

  private get db() {
    return this.supabase as any;
  }

  async getStockSummary(
    tenantId: string,
    branchId?: string,
  ): Promise<ProductStockSummary[]> {
    let query = this.db
      .from("v_product_stock_summary")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("product_name", { ascending: true });

    if (branchId) {
      query = query.eq("branch_id", branchId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getMovements(filters: InventoryMovementFilters = {}): Promise<InventoryMovement[]> {
    let query = this.db
      .from("inventory_movements")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters.productId) {
      query = query.eq("product_id", filters.productId);
    }

    if (filters.branchId) {
      query = query.eq("branch_id", filters.branchId);
    }

    if (filters.movementType) {
      query = query.eq("movement_type", filters.movementType);
    }

    if (filters.specialistId) {
      query = query.eq("specialist_id", filters.specialistId);
    }

    if (filters.dateFrom) {
      query = query.gte("created_at", filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte("created_at", filters.dateTo);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async createMovement(data: CreateInventoryMovementData): Promise<InventoryMovement> {
    const { data: movement, error } = await this.db
      .from("inventory_movements")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return movement;
  }

  async registerEntry(
    data: Omit<CreateInventoryMovementData, "movement_type">,
  ): Promise<InventoryMovement> {
    return this.createMovement({
      ...data,
      movement_type: "entry",
    });
  }

  async registerAdjustment(
    data: Omit<CreateInventoryMovementData, "movement_type">,
  ): Promise<InventoryMovement> {
    return this.createMovement({
      ...data,
      movement_type: "adjustment",
    });
  }

  async registerSpecialistWithdrawal(
    data: Omit<CreateInventoryMovementData, "movement_type">,
  ): Promise<InventoryMovement> {
    return this.createMovement({
      ...data,
      movement_type: "specialist_withdrawal",
    });
  }
}

export const inventoryService = new InventoryService();
