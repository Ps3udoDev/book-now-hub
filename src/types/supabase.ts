export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appointment_services: {
        Row: {
          appointment_id: string
          created_at: string | null
          duration_minutes: number | null
          id: string
          price: number | null
          service_id: string
          service_variant_id: string | null
          specialist_id: string | null
        }
        Insert: {
          appointment_id: string
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          price?: number | null
          service_id: string
          service_variant_id?: string | null
          specialist_id?: string | null
        }
        Update: {
          appointment_id?: string
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          price?: number | null
          service_id?: string
          service_variant_id?: string | null
          specialist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_services_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_services_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "v_daily_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_services_service_variant_id_fkey"
            columns: ["service_variant_id"]
            isOneToOne: false
            referencedRelation: "service_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_services_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_services_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialist_net_balance"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "appointment_services_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "v_specialist_availability"
            referencedColumns: ["specialist_id"]
          },
        ]
      }
      appointments: {
        Row: {
          actual_duration: number | null
          advance_amount: number
          advance_paid_amount: number
          branch_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          currency_code: string | null
          customer_id: string
          customer_notes: string | null
          duration_minutes: number
          ends_at: string | null
          estimated_price: number | null
          id: string
          internal_notes: string | null
          scheduled_at: string
          service_id: string
          service_variant_id: string | null
          source: string | null
          specialist_id: string | null
          status: Database["public"]["Enums"]["appointment_status"] | null
          tenant_id: string
          updated_at: string | null
          workstation_id: string | null
        }
        Insert: {
          actual_duration?: number | null
          advance_amount?: number
          advance_paid_amount?: number
          branch_id: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          currency_code?: string | null
          customer_id: string
          customer_notes?: string | null
          duration_minutes: number
          ends_at?: string | null
          estimated_price?: number | null
          id?: string
          internal_notes?: string | null
          scheduled_at: string
          service_id: string
          service_variant_id?: string | null
          source?: string | null
          specialist_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"] | null
          tenant_id: string
          updated_at?: string | null
          workstation_id?: string | null
        }
        Update: {
          actual_duration?: number | null
          advance_amount?: number
          advance_paid_amount?: number
          branch_id?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          currency_code?: string | null
          customer_id?: string
          customer_notes?: string | null
          duration_minutes?: number
          ends_at?: string | null
          estimated_price?: number | null
          id?: string
          internal_notes?: string | null
          scheduled_at?: string
          service_id?: string
          service_variant_id?: string | null
          source?: string | null
          specialist_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"] | null
          tenant_id?: string
          updated_at?: string | null
          workstation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "specialist_net_balance"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "appointments_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "v_specialist_availability"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_variant_id_fkey"
            columns: ["service_variant_id"]
            isOneToOne: false
            referencedRelation: "service_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialist_net_balance"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "appointments_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "v_specialist_availability"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_workstation_id_fkey"
            columns: ["workstation_id"]
            isOneToOne: false
            referencedRelation: "workstations"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          city: string | null
          code: string | null
          country: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_main: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          operating_hours: Json | null
          phone: string | null
          postal_code: string | null
          state: string | null
          tenant_id: string
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          code?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_main?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          operating_hours?: Json | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          tenant_id: string
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_main?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          operating_hours?: Json | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          tenant_id?: string
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      cafe_order_items: {
        Row: {
          cafe_order_id: string
          created_at: string
          description: string
          id: string
          menu_item_id: string | null
          notes: string | null
          quantity: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          cafe_order_id: string
          created_at?: string
          description: string
          id?: string
          menu_item_id?: string | null
          notes?: string | null
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Update: {
          cafe_order_id?: string
          created_at?: string
          description?: string
          id?: string
          menu_item_id?: string | null
          notes?: string | null
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "cafe_order_items_cafe_order_id_fkey"
            columns: ["cafe_order_id"]
            isOneToOne: false
            referencedRelation: "cafe_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cafe_order_items_cafe_order_id_fkey"
            columns: ["cafe_order_id"]
            isOneToOne: false
            referencedRelation: "v_cafe_orders_today"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cafe_order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      cafe_orders: {
        Row: {
          billed_at: string | null
          branch_id: string
          cancelled_at: string | null
          cash_session_id: string | null
          charge_to_commissions: boolean
          client_id: string | null
          created_at: string
          created_by: string | null
          currency_iso: string
          delivered_at: string | null
          estimated_ready_at: string | null
          id: string
          notes: string | null
          order_id: string | null
          order_number: number
          order_type: Database["public"]["Enums"]["cafe_order_type"]
          placed_by_email: string | null
          placed_by_name: string | null
          preparing_at: string | null
          ready_at: string | null
          source: string
          specialist_consumption_id: string | null
          specialist_id: string | null
          status: Database["public"]["Enums"]["cafe_order_status"]
          tenant_id: string
          total: number
          updated_at: string
          workstation_id: string | null
        }
        Insert: {
          billed_at?: string | null
          branch_id: string
          cancelled_at?: string | null
          cash_session_id?: string | null
          charge_to_commissions?: boolean
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_iso?: string
          delivered_at?: string | null
          estimated_ready_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          order_number?: number
          order_type?: Database["public"]["Enums"]["cafe_order_type"]
          placed_by_email?: string | null
          placed_by_name?: string | null
          preparing_at?: string | null
          ready_at?: string | null
          source?: string
          specialist_consumption_id?: string | null
          specialist_id?: string | null
          status?: Database["public"]["Enums"]["cafe_order_status"]
          tenant_id: string
          total?: number
          updated_at?: string
          workstation_id?: string | null
        }
        Update: {
          billed_at?: string | null
          branch_id?: string
          cancelled_at?: string | null
          cash_session_id?: string | null
          charge_to_commissions?: boolean
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_iso?: string
          delivered_at?: string | null
          estimated_ready_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          order_number?: number
          order_type?: Database["public"]["Enums"]["cafe_order_type"]
          placed_by_email?: string | null
          placed_by_name?: string | null
          preparing_at?: string | null
          ready_at?: string | null
          source?: string
          specialist_consumption_id?: string | null
          specialist_id?: string | null
          status?: Database["public"]["Enums"]["cafe_order_status"]
          tenant_id?: string
          total?: number
          updated_at?: string
          workstation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cafe_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cafe_orders_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_register_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cafe_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cafe_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_customer_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "cafe_orders_currency_iso_fkey"
            columns: ["currency_iso"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "cafe_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cafe_orders_specialist_consumption_id_fkey"
            columns: ["specialist_consumption_id"]
            isOneToOne: false
            referencedRelation: "specialist_consumptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cafe_orders_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cafe_orders_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialist_net_balance"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "cafe_orders_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "v_specialist_availability"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "cafe_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cafe_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "cafe_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cafe_orders_workstation_id_fkey"
            columns: ["workstation_id"]
            isOneToOne: false
            referencedRelation: "workstations"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_register_closures: {
        Row: {
          appointment_count: number | null
          branch_id: string
          cash_register_id: string | null
          closed_at: string | null
          closed_by: string | null
          closing_balance_real: number | null
          created_at: string | null
          difference: number | null
          id: string
          invoice_count: number | null
          notes: string | null
          opened_at: string
          opened_by: string | null
          opening_balance_real: number | null
          physical_balance: number | null
          system_balance: number | null
          tenant_id: string
          total_products: number | null
          total_sales: number | null
          total_services: number | null
          total_tips: number | null
          updated_at: string | null
        }
        Insert: {
          appointment_count?: number | null
          branch_id: string
          cash_register_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closing_balance_real?: number | null
          created_at?: string | null
          difference?: number | null
          id?: string
          invoice_count?: number | null
          notes?: string | null
          opened_at: string
          opened_by?: string | null
          opening_balance_real?: number | null
          physical_balance?: number | null
          system_balance?: number | null
          tenant_id: string
          total_products?: number | null
          total_sales?: number | null
          total_services?: number | null
          total_tips?: number | null
          updated_at?: string | null
        }
        Update: {
          appointment_count?: number | null
          branch_id?: string
          cash_register_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closing_balance_real?: number | null
          created_at?: string | null
          difference?: number | null
          id?: string
          invoice_count?: number | null
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          opening_balance_real?: number | null
          physical_balance?: number | null
          system_balance?: number | null
          tenant_id?: string
          total_products?: number | null
          total_sales?: number | null
          total_services?: number | null
          total_tips?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_register_closures_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_closures_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_closures_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "v_cash_registers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_closures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_closures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "cash_register_closures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_register_movements: {
        Row: {
          amount: number
          appointment_id: string | null
          cash_register_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          invoice_id: string | null
          movement_type: string
          new_balance: number | null
          previous_balance: number | null
          reference: string | null
          session_id: string | null
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          cash_register_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          movement_type: string
          new_balance?: number | null
          previous_balance?: number | null
          reference?: string | null
          session_id?: string | null
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          cash_register_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          movement_type?: string
          new_balance?: number | null
          previous_balance?: number | null
          reference?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_register_movements_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_movements_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "v_daily_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_movements_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_movements_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "v_cash_registers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_movements_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_movements_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cash_register_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_register_sessions: {
        Row: {
          branch_id: string
          cash_register_id: string
          closed_at: string | null
          closed_by: string | null
          closing_amount: number | null
          created_at: string
          difference: number | null
          id: string
          notes: string | null
          opened_at: string
          opened_by: string
          opening_amount: number
          status: string
          tenant_id: string
        }
        Insert: {
          branch_id: string
          cash_register_id: string
          closed_at?: string | null
          closed_by?: string | null
          closing_amount?: number | null
          created_at?: string
          difference?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by: string
          opening_amount?: number
          status?: string
          tenant_id: string
        }
        Update: {
          branch_id?: string
          cash_register_id?: string
          closed_at?: string | null
          closed_by?: string | null
          closing_amount?: number | null
          created_at?: string
          difference?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string
          opening_amount?: number
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_register_sessions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_sessions_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_sessions_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "v_cash_registers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "cash_register_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_register_summaries: {
        Row: {
          area: string
          created_at: string
          currency_code: string
          id: string
          session_id: string
          total_amount: number
          total_card: number
          total_cash: number
          total_gateway: number
          total_mobile_payment: number
          total_transfer: number
          transaction_count: number
        }
        Insert: {
          area: string
          created_at?: string
          currency_code: string
          id?: string
          session_id: string
          total_amount?: number
          total_card?: number
          total_cash?: number
          total_gateway?: number
          total_mobile_payment?: number
          total_transfer?: number
          transaction_count?: number
        }
        Update: {
          area?: string
          created_at?: string
          currency_code?: string
          id?: string
          session_id?: string
          total_amount?: number
          total_card?: number
          total_cash?: number
          total_gateway?: number
          total_mobile_payment?: number
          total_transfer?: number
          transaction_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "cash_register_summaries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cash_register_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          branch_id: string
          created_at: string | null
          currency_iso: string
          current_balance: number | null
          id: string
          is_active: boolean | null
          is_virtual: boolean | null
          name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          currency_iso: string
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          is_virtual?: boolean | null
          name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          currency_iso?: string
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          is_virtual?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_registers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_registers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "cash_registers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_transfers: {
        Row: {
          amount: number
          amount_received: number
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          exchange_rate: number | null
          from_register_id: string
          id: string
          reason: string | null
          tenant_id: string
          to_register_id: string
        }
        Insert: {
          amount: number
          amount_received: number
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          exchange_rate?: number | null
          from_register_id: string
          id?: string
          reason?: string | null
          tenant_id: string
          to_register_id: string
        }
        Update: {
          amount?: number
          amount_received?: number
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          exchange_rate?: number | null
          from_register_id?: string
          id?: string
          reason?: string | null
          tenant_id?: string
          to_register_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_transfers_from_register_id_fkey"
            columns: ["from_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transfers_from_register_id_fkey"
            columns: ["from_register_id"]
            isOneToOne: false
            referencedRelation: "v_cash_registers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transfers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transfers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "cash_transfers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transfers_to_register_id_fkey"
            columns: ["to_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transfers_to_register_id_fkey"
            columns: ["to_register_id"]
            isOneToOne: false
            referencedRelation: "v_cash_registers_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          commission_type: Database["public"]["Enums"]["commission_type"]
          created_at: string
          currency_code: string | null
          id: string
          is_active: boolean
          item_type: Database["public"]["Enums"]["order_item_type"] | null
          notes: string | null
          scope: Database["public"]["Enums"]["commission_scope"]
          service_id: string | null
          specialist_id: string
          tenant_id: string
          updated_at: string
          value: number
        }
        Insert: {
          commission_type?: Database["public"]["Enums"]["commission_type"]
          created_at?: string
          currency_code?: string | null
          id?: string
          is_active?: boolean
          item_type?: Database["public"]["Enums"]["order_item_type"] | null
          notes?: string | null
          scope?: Database["public"]["Enums"]["commission_scope"]
          service_id?: string | null
          specialist_id: string
          tenant_id: string
          updated_at?: string
          value: number
        }
        Update: {
          commission_type?: Database["public"]["Enums"]["commission_type"]
          created_at?: string
          currency_code?: string | null
          id?: string
          is_active?: boolean
          item_type?: Database["public"]["Enums"]["order_item_type"] | null
          notes?: string | null
          scope?: Database["public"]["Enums"]["commission_scope"]
          service_id?: string | null
          specialist_id?: string
          tenant_id?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "commission_rules_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "commission_rules_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_rules_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_rules_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialist_net_balance"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "commission_rules_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "v_specialist_availability"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "commission_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "commission_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          base_amount: number
          commission_amount: number
          commission_rate: number | null
          commission_type: Database["public"]["Enums"]["commission_type"]
          created_at: string
          currency_code: string
          id: string
          invoice_id: string | null
          notes: string | null
          order_id: string
          order_item_id: string
          paid_at: string | null
          paid_by: string | null
          rule_id: string | null
          specialist_id: string
          status: Database["public"]["Enums"]["commission_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          base_amount: number
          commission_amount: number
          commission_rate?: number | null
          commission_type: Database["public"]["Enums"]["commission_type"]
          created_at?: string
          currency_code: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          order_id: string
          order_item_id: string
          paid_at?: string | null
          paid_by?: string | null
          rule_id?: string | null
          specialist_id: string
          status?: Database["public"]["Enums"]["commission_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          base_amount?: number
          commission_amount?: number
          commission_rate?: number | null
          commission_type?: Database["public"]["Enums"]["commission_type"]
          created_at?: string
          currency_code?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          order_id?: string
          order_item_id?: string
          paid_at?: string | null
          paid_by?: string | null
          rule_id?: string | null
          specialist_id?: string
          status?: Database["public"]["Enums"]["commission_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "commissions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "commission_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialist_net_balance"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "commissions_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "v_specialist_availability"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "commissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "commissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          created_at: string
          decimal_places: number
          is_active: boolean
          is_base_currency: boolean
          name: string
          symbol: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          decimal_places?: number
          is_active?: boolean
          is_base_currency?: boolean
          name: string
          symbol: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          decimal_places?: number
          is_active?: boolean
          is_base_currency?: boolean
          name?: string
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_favorites: {
        Row: {
          created_at: string | null
          customer_id: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["favorite_entity_type"]
          id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["favorite_entity_type"]
          id?: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["favorite_entity_type"]
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_favorites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_favorites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_favorites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_favorites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "customer_favorites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          accepts_marketing: boolean | null
          address: string | null
          avatar_url: string | null
          birth_date: string | null
          city: string | null
          created_at: string | null
          document_number: string | null
          document_type: string | null
          email: string | null
          first_name: string
          full_name: string
          gender: string | null
          how_found_us: string | null
          id: string
          is_active: boolean | null
          last_name: string
          last_visit_at: string | null
          loyalty_points: number | null
          notes: string | null
          notify_email: boolean
          notify_sms: boolean
          notify_whatsapp: boolean
          phone: string | null
          phone_country_code: string | null
          phone_secondary: string | null
          preferred_branch_id: string | null
          preferred_currency: string | null
          preferred_language: string | null
          preferred_specialist_id: string | null
          tags: string[] | null
          tenant_id: string
          total_spent: number | null
          total_visits: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          accepts_marketing?: boolean | null
          address?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string | null
          document_number?: string | null
          document_type?: string | null
          email?: string | null
          first_name?: string
          full_name: string
          gender?: string | null
          how_found_us?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string
          last_visit_at?: string | null
          loyalty_points?: number | null
          notes?: string | null
          notify_email?: boolean
          notify_sms?: boolean
          notify_whatsapp?: boolean
          phone?: string | null
          phone_country_code?: string | null
          phone_secondary?: string | null
          preferred_branch_id?: string | null
          preferred_currency?: string | null
          preferred_language?: string | null
          preferred_specialist_id?: string | null
          tags?: string[] | null
          tenant_id: string
          total_spent?: number | null
          total_visits?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          accepts_marketing?: boolean | null
          address?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string | null
          document_number?: string | null
          document_type?: string | null
          email?: string | null
          first_name?: string
          full_name?: string
          gender?: string | null
          how_found_us?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string
          last_visit_at?: string | null
          loyalty_points?: number | null
          notes?: string | null
          notify_email?: boolean
          notify_sms?: boolean
          notify_whatsapp?: boolean
          phone?: string | null
          phone_country_code?: string | null
          phone_secondary?: string | null
          preferred_branch_id?: string | null
          preferred_currency?: string | null
          preferred_language?: string | null
          preferred_specialist_id?: string | null
          tags?: string[] | null
          tenant_id?: string
          total_spent?: number | null
          total_visits?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_preferred_branch_id_fkey"
            columns: ["preferred_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_preferred_currency_fkey"
            columns: ["preferred_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "customers_preferred_specialist_id_fkey"
            columns: ["preferred_specialist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_preferred_specialist_id_fkey"
            columns: ["preferred_specialist_id"]
            isOneToOne: false
            referencedRelation: "specialist_net_balance"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "customers_preferred_specialist_id_fkey"
            columns: ["preferred_specialist_id"]
            isOneToOne: false
            referencedRelation: "v_specialist_availability"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rate_logs: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_currency: string
          id: string
          new_rate: number
          old_rate: number | null
          tenant_id: string
          to_currency: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_currency: string
          id?: string
          new_rate: number
          old_rate?: number | null
          tenant_id: string
          to_currency: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_currency?: string
          id?: string
          new_rate?: number
          old_rate?: number | null
          tenant_id?: string
          to_currency?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rate_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_rate_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "specialist_net_balance"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "exchange_rate_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "v_specialist_availability"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "exchange_rate_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_rate_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "exchange_rate_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          created_at: string | null
          created_by: string | null
          from_currency: string
          id: string
          official_rate: boolean | null
          rate: number
          tenant_id: string
          to_currency: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          from_currency: string
          id?: string
          official_rate?: boolean | null
          rate: number
          tenant_id: string
          to_currency: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          from_currency?: string
          id?: string
          official_rate?: boolean | null
          rate?: number
          tenant_id?: string
          to_currency?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_rates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "exchange_rates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      global_users: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          role: Database["public"]["Enums"]["global_role"]
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["global_role"]
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["global_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          branch_id: string
          created_at: string | null
          created_by: string | null
          id: string
          movement_type: Database["public"]["Enums"]["inventory_movement_type"]
          product_id: string
          quantity: number
          reason: string | null
          reference_id: string | null
          specialist_id: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          movement_type: Database["public"]["Enums"]["inventory_movement_type"]
          product_id: string
          quantity: number
          reason?: string | null
          reference_id?: string | null
          specialist_id?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          movement_type?: Database["public"]["Enums"]["inventory_movement_type"]
          product_id?: string
          quantity?: number
          reason?: string | null
          reference_id?: string | null
          specialist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_products_public"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_stock_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_movements_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialist_net_balance"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "inventory_movements_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "v_specialist_availability"
            referencedColumns: ["specialist_id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          created_at: string | null
          description: string
          discount_percent: number | null
          id: string
          invoice_id: string
          line_type: string | null
          quantity: number | null
          service_id: string | null
          specialist_id: string | null
          tax_percent: number | null
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          description: string
          discount_percent?: number | null
          id?: string
          invoice_id: string
          line_type?: string | null
          quantity?: number | null
          service_id?: string | null
          specialist_id?: string | null
          tax_percent?: number | null
          total: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          description?: string
          discount_percent?: number | null
          id?: string
          invoice_id?: string
          line_type?: string | null
          quantity?: number | null
          service_id?: string | null
          specialist_id?: string | null
          tax_percent?: number | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialist_net_balance"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "invoice_lines_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "v_specialist_availability"
            referencedColumns: ["specialist_id"]
          },
        ]
      }
      invoice_payments: {
        Row: {
          amount: number
          amount_in_base_currency: number | null
          cash_register_id: string
          created_at: string | null
          currency_iso: string
          exchange_rate: number | null
          id: string
          invoice_id: string
          payment_method: string | null
          reference_number: string | null
          session_id: string | null
        }
        Insert: {
          amount: number
          amount_in_base_currency?: number | null
          cash_register_id: string
          created_at?: string | null
          currency_iso: string
          exchange_rate?: number | null
          id?: string
          invoice_id: string
          payment_method?: string | null
          reference_number?: string | null
          session_id?: string | null
        }
        Update: {
          amount?: number
          amount_in_base_currency?: number | null
          cash_register_id?: string
          created_at?: string | null
          currency_iso?: string
          exchange_rate?: number | null
          id?: string
          invoice_id?: string
          payment_method?: string | null
          reference_number?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_payments_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_payments_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "v_cash_registers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_payments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cash_register_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_local: number | null
          appointment_id: string | null
          branch_id: string
          created_at: string | null
          created_by: string | null
          currency_iso: string | null
          customer_address: string | null
          customer_document: string | null
          customer_id: string | null
          customer_name: string | null
          discount_amount: number | null
          document_type: string
          exchange_rate_snapshot: number | null
          id: string
          invoice_number: string
          notes: string | null
          order_id: string | null
          paid_at: string | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          subtotal: number
          tax_amount: number | null
          tenant_id: string
          total: number
          type: Database["public"]["Enums"]["invoice_type"]
          updated_at: string | null
        }
        Insert: {
          amount_local?: number | null
          appointment_id?: string | null
          branch_id: string
          created_at?: string | null
          created_by?: string | null
          currency_iso?: string | null
          customer_address?: string | null
          customer_document?: string | null
          customer_id?: string | null
          customer_name?: string | null
          discount_amount?: number | null
          document_type?: string
          exchange_rate_snapshot?: number | null
          id?: string
          invoice_number: string
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal?: number
          tax_amount?: number | null
          tenant_id: string
          total?: number
          type?: Database["public"]["Enums"]["invoice_type"]
          updated_at?: string | null
        }
        Update: {
          amount_local?: number | null
          appointment_id?: string | null
          branch_id?: string
          created_at?: string | null
          created_by?: string | null
          currency_iso?: string | null
          customer_address?: string | null
          customer_document?: string | null
          customer_id?: string | null
          customer_name?: string | null
          discount_amount?: number | null
          document_type?: string
          exchange_rate_snapshot?: number | null
          id?: string
          invoice_number?: string
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal?: number
          tax_amount?: number | null
          tenant_id?: string
          total?: number
          type?: Database["public"]["Enums"]["invoice_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "v_daily_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "specialist_net_balance"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_specialist_availability"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          branch_id: string | null
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "menu_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_images: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          menu_item_id: string
          sort_order: number
          storage_path: string
          thumbnail_path: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          menu_item_id: string
          sort_order?: number
          storage_path: string
          thumbnail_path?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          menu_item_id?: string
          sort_order?: number
          storage_path?: string
          thumbnail_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_images_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          branch_id: string
          category_id: string | null
          created_at: string
          currency_iso: string
          description: string | null
          id: string
          is_active: boolean
          is_available: boolean
          name: string
          preparation_time_minutes: number
          price: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          category_id?: string | null
          created_at?: string
          currency_iso?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_available?: boolean
          name: string
          preparation_time_minutes?: number
          price?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          category_id?: string | null
          created_at?: string
          currency_iso?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_available?: boolean
          name?: string
          preparation_time_minutes?: number
          price?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_currency_iso_fkey"
            columns: ["currency_iso"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "menu_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "menu_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          category: string | null
          config_schema: Json | null
          created_at: string | null
          default_config: Json | null
          description: string | null
          icon: string | null
          id: string
          is_core: boolean | null
          name: string
          slug: string
          sort_order: number | null
          status: Database["public"]["Enums"]["module_status"] | null
          updated_at: string | null
          version: string | null
        }
        Insert: {
          category?: string | null
          config_schema?: Json | null
          created_at?: string | null
          default_config?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          is_core?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
          status?: Database["public"]["Enums"]["module_status"] | null
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          category?: string | null
          config_schema?: Json | null
          created_at?: string | null
          default_config?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          is_core?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
          status?: Database["public"]["Enums"]["module_status"] | null
          updated_at?: string | null
          version?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          channel: string | null
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          message: string
          notification_type: string
          read_at: string | null
          recipient_id: string
          recipient_type: string
          reference_id: string | null
          reference_type: string | null
          sent_at: string | null
          status: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          channel?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message: string
          notification_type: string
          read_at?: string | null
          recipient_id: string
          recipient_type: string
          reference_id?: string | null
          reference_type?: string | null
          sent_at?: string | null
          status?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          channel?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message?: string
          notification_type?: string
          read_at?: string | null
          recipient_id?: string
          recipient_type?: string
          reference_id?: string | null
          reference_type?: string | null
          sent_at?: string | null
          status?: string | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          buyer_type: string
          created_at: string
          currency_code: string
          description: string
          id: string
          item_id: string | null
          notes: string | null
          order_id: string
          quantity: number
          subtotal: number
          type: Database["public"]["Enums"]["order_item_type"]
          unit_price: number
        }
        Insert: {
          buyer_type?: string
          created_at?: string
          currency_code?: string
          description: string
          id?: string
          item_id?: string | null
          notes?: string | null
          order_id: string
          quantity?: number
          subtotal?: number
          type?: Database["public"]["Enums"]["order_item_type"]
          unit_price?: number
        }
        Update: {
          buyer_type?: string
          created_at?: string
          currency_code?: string
          description?: string
          id?: string
          item_id?: string | null
          notes?: string | null
          order_id?: string
          quantity?: number
          subtotal?: number
          type?: Database["public"]["Enums"]["order_item_type"]
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          appointment_id: string | null
          branch_id: string
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string
          currency_code: string
          customer_id: string | null
          id: string
          notes: string | null
          paid_at: string | null
          sent_at: string | null
          specialist_id: string
          status: Database["public"]["Enums"]["order_status"]
          tenant_id: string
          total: number
        }
        Insert: {
          appointment_id?: string | null
          branch_id: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          currency_code?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          sent_at?: string | null
          specialist_id: string
          status?: Database["public"]["Enums"]["order_status"]
          tenant_id: string
          total?: number
        }
        Update: {
          appointment_id?: string | null
          branch_id?: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          currency_code?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          sent_at?: string | null
          specialist_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          tenant_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "v_daily_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialist_net_balance"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "orders_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "v_specialist_availability"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods_config: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          payment_method: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          payment_method: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          payment_method?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_config_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_methods_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_methods_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "payment_methods_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          name: string
          sort_order: number | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
          sort_order?: number | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "product_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          product_id: string
          sort_order: number | null
          storage_path: string
          thumbnail_path: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          product_id: string
          sort_order?: number | null
          storage_path: string
          thumbnail_path?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          product_id?: string
          sort_order?: number | null
          storage_path?: string
          thumbnail_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_products_public"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_stock_summary"
            referencedColumns: ["product_id"]
          },
        ]
      }
      products: {
        Row: {
          branch_id: string
          brand: string | null
          category: string | null
          created_at: string | null
          currency_iso: string
          description: string | null
          id: string
          is_active: boolean
          min_stock_alert: number
          name: string
          price: number
          sku: string | null
          stock_quantity: number
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          brand?: string | null
          category?: string | null
          created_at?: string | null
          currency_iso?: string
          description?: string | null
          id?: string
          is_active?: boolean
          min_stock_alert?: number
          name: string
          price?: number
          sku?: string | null
          stock_quantity?: number
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          brand?: string | null
          category?: string | null
          created_at?: string | null
          currency_iso?: string
          description?: string | null
          id?: string
          is_active?: boolean
          min_stock_alert?: number
          name?: string
          price?: number
          sku?: string | null
          stock_quantity?: number
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          branch_id: string | null
          commission_fixed: number | null
          commission_percentage: number | null
          commission_type: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          is_specialist: boolean | null
          phone: string | null
          rating: number | null
          role: Database["public"]["Enums"]["tenant_role"]
          specialties: string[] | null
          tenant_id: string
          total_ratings: number | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          branch_id?: string | null
          commission_fixed?: number | null
          commission_percentage?: number | null
          commission_type?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean | null
          is_specialist?: boolean | null
          phone?: string | null
          rating?: number | null
          role?: Database["public"]["Enums"]["tenant_role"]
          specialties?: string[] | null
          tenant_id: string
          total_ratings?: number | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          branch_id?: string | null
          commission_fixed?: number | null
          commission_percentage?: number | null
          commission_type?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          is_specialist?: boolean | null
          phone?: string | null
          rating?: number | null
          role?: Database["public"]["Enums"]["tenant_role"]
          specialties?: string[] | null
          tenant_id?: string
          total_ratings?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_exceptions: {
        Row: {
          branch_id: string | null
          created_at: string | null
          end_time: string | null
          exception_date: string
          exception_type: string
          id: string
          is_day_off: boolean | null
          reason: string | null
          specialist_id: string | null
          start_time: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          end_time?: string | null
          exception_date: string
          exception_type: string
          id?: string
          is_day_off?: boolean | null
          reason?: string | null
          specialist_id?: string | null
          start_time?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          end_time?: string | null
          exception_date?: string
          exception_type?: string
          id?: string
          is_day_off?: boolean | null
          reason?: string | null
          specialist_id?: string | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_exceptions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_exceptions_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_exceptions_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialist_net_balance"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "schedule_exceptions_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "v_specialist_availability"
            referencedColumns: ["specialist_id"]
          },
        ]
      }
      service_variants: {
        Row: {
          created_at: string | null
          description: string | null
          duration_modifier: number | null
          id: string
          is_active: boolean | null
          name: string
          price_modifier: number | null
          service_id: string
          sort_order: number | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_modifier?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          price_modifier?: number | null
          service_id: string
          sort_order?: number | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_modifier?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_modifier?: number | null
          service_id?: string
          sort_order?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_variants_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_variants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_variants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "service_variants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          base_price: number
          buffer_minutes: number | null
          category: Database["public"]["Enums"]["service_category"] | null
          created_at: string | null
          currency_code: string | null
          description: string | null
          duration_minutes: number
          gallery_urls: string[] | null
          has_variants: boolean | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          name: string
          requires_specialist: boolean | null
          requires_station: boolean | null
          slug: string
          sort_order: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          base_price?: number
          buffer_minutes?: number | null
          category?: Database["public"]["Enums"]["service_category"] | null
          created_at?: string | null
          currency_code?: string | null
          description?: string | null
          duration_minutes?: number
          gallery_urls?: string[] | null
          has_variants?: boolean | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name: string
          requires_specialist?: boolean | null
          requires_station?: boolean | null
          slug: string
          sort_order?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          buffer_minutes?: number | null
          category?: Database["public"]["Enums"]["service_category"] | null
          created_at?: string | null
          currency_code?: string | null
          description?: string | null
          duration_minutes?: number
          gallery_urls?: string[] | null
          has_variants?: boolean | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name?: string
          requires_specialist?: boolean | null
          requires_station?: boolean | null
          slug?: string
          sort_order?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      specialist_consumptions: {
        Row: {
          created_at: string
          currency_code: string
          date: string
          deduct_from_commission: boolean
          description: string
          id: string
          notes: string | null
          quantity: number
          registered_by: string
          service_id: string | null
          specialist_id: string
          tenant_id: string
          total_cost: number
          unit_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency_code?: string
          date?: string
          deduct_from_commission?: boolean
          description: string
          id?: string
          notes?: string | null
          quantity?: number
          registered_by: string
          service_id?: string | null
          specialist_id: string
          tenant_id: string
          total_cost?: number
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency_code?: string
          date?: string
          deduct_from_commission?: boolean
          description?: string
          id?: string
          notes?: string | null
          quantity?: number
          registered_by?: string
          service_id?: string | null
          specialist_id?: string
          tenant_id?: string
          total_cost?: number
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "specialist_consumptions_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "specialist_consumptions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_consumptions_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_consumptions_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialist_net_balance"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "specialist_consumptions_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "v_specialist_availability"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "specialist_consumptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_consumptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "specialist_consumptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      specialist_debt_payments: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          debt_id: string
          id: string
          notes: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          debt_id: string
          id?: string
          notes?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          debt_id?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "specialist_debt_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_debt_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "specialist_net_balance"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "specialist_debt_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_specialist_availability"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "specialist_debt_payments_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "specialist_debts"
            referencedColumns: ["id"]
          },
        ]
      }
      specialist_debts: {
        Row: {
          created_at: string | null
          created_by: string | null
          currency_code: string
          description: string
          id: string
          original_amount: number
          remaining_amount: number
          settled_at: string | null
          source_order_item_id: string | null
          source_type: string
          specialist_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          currency_code?: string
          description: string
          id?: string
          original_amount: number
          remaining_amount: number
          settled_at?: string | null
          source_order_item_id?: string | null
          source_type?: string
          specialist_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          currency_code?: string
          description?: string
          id?: string
          original_amount?: number
          remaining_amount?: number
          settled_at?: string | null
          source_order_item_id?: string | null
          source_type?: string
          specialist_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "specialist_debts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_debts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "specialist_net_balance"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "specialist_debts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_specialist_availability"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "specialist_debts_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "specialist_debts_source_order_item_id_fkey"
            columns: ["source_order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_debts_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_debts_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialist_net_balance"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "specialist_debts_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "v_specialist_availability"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "specialist_debts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_debts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "specialist_debts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      specialist_schedules: {
        Row: {
          branch_id: string
          break_end: string | null
          break_start: string | null
          created_at: string | null
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          end_time: string
          id: string
          is_active: boolean | null
          specialist_id: string
          start_time: string
          tenant_id: string
        }
        Insert: {
          branch_id: string
          break_end?: string | null
          break_start?: string | null
          created_at?: string | null
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          end_time: string
          id?: string
          is_active?: boolean | null
          specialist_id: string
          start_time: string
          tenant_id: string
        }
        Update: {
          branch_id?: string
          break_end?: string | null
          break_start?: string | null
          created_at?: string | null
          day_of_week?: Database["public"]["Enums"]["day_of_week"]
          end_time?: string
          id?: string
          is_active?: boolean | null
          specialist_id?: string
          start_time?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "specialist_schedules_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_schedules_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_schedules_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialist_net_balance"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "specialist_schedules_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "v_specialist_availability"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "specialist_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "specialist_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      specialist_services: {
        Row: {
          created_at: string | null
          custom_duration: number | null
          custom_price: number | null
          id: string
          is_active: boolean | null
          service_id: string
          skill_level: number | null
          specialist_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          custom_duration?: number | null
          custom_price?: number | null
          id?: string
          is_active?: boolean | null
          service_id: string
          skill_level?: number | null
          specialist_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          custom_duration?: number | null
          custom_price?: number | null
          id?: string
          is_active?: boolean | null
          service_id?: string
          skill_level?: number | null
          specialist_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "specialist_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_services_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_services_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialist_net_balance"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "specialist_services_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "v_specialist_availability"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "specialist_services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "specialist_services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          components_config: Json
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          layout_config: Json
          name: string
          preview_image_url: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          components_config?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          layout_config?: Json
          name: string
          preview_image_url?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          components_config?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          layout_config?: Json
          name?: string
          preview_image_url?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tenant_client_app_settings: {
        Row: {
          brand_name: string | null
          created_at: string
          custom_sections: Json
          custom_tokens: Json
          google_login_enabled: boolean
          hero_image_url: string | null
          id: string
          logo_url: string | null
          show_google_login_preview: boolean
          template_slug: string
          tenant_id: string
          theme_mode: string
          updated_at: string
          welcome_subtitle: string | null
          welcome_title: string | null
        }
        Insert: {
          brand_name?: string | null
          created_at?: string
          custom_sections?: Json
          custom_tokens?: Json
          google_login_enabled?: boolean
          hero_image_url?: string | null
          id?: string
          logo_url?: string | null
          show_google_login_preview?: boolean
          template_slug?: string
          tenant_id: string
          theme_mode?: string
          updated_at?: string
          welcome_subtitle?: string | null
          welcome_title?: string | null
        }
        Update: {
          brand_name?: string | null
          created_at?: string
          custom_sections?: Json
          custom_tokens?: Json
          google_login_enabled?: boolean
          hero_image_url?: string | null
          id?: string
          logo_url?: string | null
          show_google_login_preview?: boolean
          template_slug?: string
          tenant_id?: string
          theme_mode?: string
          updated_at?: string
          welcome_subtitle?: string | null
          welcome_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_client_app_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_client_app_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_client_app_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_ecommerce_settings: {
        Row: {
          accent_color: string | null
          announcement_bar: string | null
          background_color: string | null
          brand_name: string | null
          button_radius: string | null
          created_at: string
          custom_sections: Json
          custom_tokens: Json
          hero_image_url: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          is_enabled: boolean
          is_public: boolean
          logo_url: string | null
          primary_color: string | null
          product_sort: string
          public_path: string
          secondary_color: string | null
          seo_description: string | null
          seo_title: string | null
          show_branch_badge: boolean
          show_categories: boolean
          show_prices: boolean
          show_search: boolean
          show_whatsapp_button: boolean
          surface_color: string | null
          template_slug: string
          tenant_id: string
          text_color: string | null
          updated_at: string
          whatsapp_message_template: string
          whatsapp_number: string | null
        }
        Insert: {
          accent_color?: string | null
          announcement_bar?: string | null
          background_color?: string | null
          brand_name?: string | null
          button_radius?: string | null
          created_at?: string
          custom_sections?: Json
          custom_tokens?: Json
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          is_enabled?: boolean
          is_public?: boolean
          logo_url?: string | null
          primary_color?: string | null
          product_sort?: string
          public_path?: string
          secondary_color?: string | null
          seo_description?: string | null
          seo_title?: string | null
          show_branch_badge?: boolean
          show_categories?: boolean
          show_prices?: boolean
          show_search?: boolean
          show_whatsapp_button?: boolean
          surface_color?: string | null
          template_slug?: string
          tenant_id: string
          text_color?: string | null
          updated_at?: string
          whatsapp_message_template?: string
          whatsapp_number?: string | null
        }
        Update: {
          accent_color?: string | null
          announcement_bar?: string | null
          background_color?: string | null
          brand_name?: string | null
          button_radius?: string | null
          created_at?: string
          custom_sections?: Json
          custom_tokens?: Json
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          is_enabled?: boolean
          is_public?: boolean
          logo_url?: string | null
          primary_color?: string | null
          product_sort?: string
          public_path?: string
          secondary_color?: string | null
          seo_description?: string | null
          seo_title?: string | null
          show_branch_badge?: boolean
          show_categories?: boolean
          show_prices?: boolean
          show_search?: boolean
          show_whatsapp_button?: boolean
          surface_color?: string | null
          template_slug?: string
          tenant_id?: string
          text_color?: string | null
          updated_at?: string
          whatsapp_message_template?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_ecommerce_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_ecommerce_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_ecommerce_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_modules: {
        Row: {
          config: Json | null
          created_at: string | null
          enabled_at: string | null
          enabled_by: string | null
          id: string
          is_enabled: boolean | null
          limits: Json | null
          module_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          enabled_at?: string | null
          enabled_by?: string | null
          id?: string
          is_enabled?: boolean | null
          limits?: Json | null
          module_id: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          enabled_at?: string | null
          enabled_by?: string | null
          id?: string
          is_enabled?: boolean | null
          limits?: Json | null
          module_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_modules_enabled_by_fkey"
            columns: ["enabled_by"]
            isOneToOne: false
            referencedRelation: "global_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_modules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_modules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_modules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_users: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          last_login_at: string | null
          permissions: Json | null
          phone: string | null
          position: string | null
          role: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          permissions?: Json | null
          phone?: string | null
          position?: string | null
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          permissions?: Json | null
          phone?: string | null
          position?: string | null
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          client_app_enabled: boolean
          country_code: string | null
          created_at: string | null
          created_by: string | null
          currency_code: string | null
          custom_domain: string | null
          custom_layout: Json | null
          custom_theme: Json | null
          favicon_url: string | null
          id: string
          legal_name: string | null
          locale: string | null
          logo_url: string | null
          max_storage_mb: number | null
          max_users: number | null
          name: string
          slug: string
          status: Database["public"]["Enums"]["tenant_status"] | null
          subscription_plan: string | null
          template_id: string | null
          theme_id: string | null
          timezone: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          client_app_enabled?: boolean
          country_code?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          custom_domain?: string | null
          custom_layout?: Json | null
          custom_theme?: Json | null
          favicon_url?: string | null
          id?: string
          legal_name?: string | null
          locale?: string | null
          logo_url?: string | null
          max_storage_mb?: number | null
          max_users?: number | null
          name: string
          slug: string
          status?: Database["public"]["Enums"]["tenant_status"] | null
          subscription_plan?: string | null
          template_id?: string | null
          theme_id?: string | null
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          client_app_enabled?: boolean
          country_code?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          custom_domain?: string | null
          custom_layout?: Json | null
          custom_theme?: Json | null
          favicon_url?: string | null
          id?: string
          legal_name?: string | null
          locale?: string | null
          logo_url?: string | null
          max_storage_mb?: number | null
          max_users?: number | null
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["tenant_status"] | null
          subscription_plan?: string | null
          template_id?: string | null
          theme_id?: string | null
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "global_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      themes: {
        Row: {
          created_at: string | null
          css_variables: Json
          description: string | null
          fonts: Json | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          preview_color: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          css_variables?: Json
          description?: string | null
          fonts?: Json | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          preview_color?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          css_variables?: Json
          description?: string | null
          fonts?: Json | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          preview_color?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      workstations: {
        Row: {
          branch_id: string
          cafeteria_qr_enabled: boolean
          cafeteria_qr_last_generated_at: string | null
          cafeteria_qr_slug: string | null
          cafeteria_qr_updated_by: string | null
          code: string | null
          compatible_services: string[] | null
          created_at: string | null
          floor: number | null
          id: string
          is_active: boolean | null
          name: string
          position_x: number | null
          position_y: number | null
          station_type: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          cafeteria_qr_enabled?: boolean
          cafeteria_qr_last_generated_at?: string | null
          cafeteria_qr_slug?: string | null
          cafeteria_qr_updated_by?: string | null
          code?: string | null
          compatible_services?: string[] | null
          created_at?: string | null
          floor?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          position_x?: number | null
          position_y?: number | null
          station_type?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          cafeteria_qr_enabled?: boolean
          cafeteria_qr_last_generated_at?: string | null
          cafeteria_qr_slug?: string | null
          cafeteria_qr_updated_by?: string | null
          code?: string | null
          compatible_services?: string[] | null
          created_at?: string | null
          floor?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          position_x?: number | null
          position_y?: number | null
          station_type?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workstations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workstations_cafeteria_qr_updated_by_fkey"
            columns: ["cafeteria_qr_updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workstations_cafeteria_qr_updated_by_fkey"
            columns: ["cafeteria_qr_updated_by"]
            isOneToOne: false
            referencedRelation: "specialist_net_balance"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "workstations_cafeteria_qr_updated_by_fkey"
            columns: ["cafeteria_qr_updated_by"]
            isOneToOne: false
            referencedRelation: "v_specialist_availability"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "workstations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workstations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "workstations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      commissions_summary: {
        Row: {
          commission_count: number | null
          currency_code: string | null
          period_month: string | null
          specialist_id: string | null
          specialist_name: string | null
          status: Database["public"]["Enums"]["commission_status"] | null
          tenant_id: string | null
          total_base_amount: number | null
          total_commission_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "commissions_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialist_net_balance"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "commissions_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "v_specialist_availability"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "commissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "commissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      specialist_net_balance: {
        Row: {
          currency_code: string | null
          gross_commissions: number | null
          net_payable: number | null
          pending_commissions_count: number | null
          specialist_id: string | null
          specialist_name: string | null
          tenant_id: string | null
          total_deductions: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      v_cafe_orders_today: {
        Row: {
          branch_id: string | null
          branch_name: string | null
          cancelled_at: string | null
          client_id: string | null
          client_name: string | null
          created_at: string | null
          currency_iso: string | null
          delivered_at: string | null
          elapsed_minutes: number | null
          estimated_ready_at: string | null
          id: string | null
          items_count: number | null
          notes: string | null
          order_number: number | null
          order_type: Database["public"]["Enums"]["cafe_order_type"] | null
          placed_by_email: string | null
          placed_by_name: string | null
          preparing_at: string | null
          ready_at: string | null
          source: string | null
          specialist_id: string | null
          specialist_name: string | null
          status: Database["public"]["Enums"]["cafe_order_status"] | null
          tenant_id: string | null
          total: number | null
          workstation_id: string | null
          workstation_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cafe_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cafe_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cafe_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_customer_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "cafe_orders_currency_iso_fkey"
            columns: ["currency_iso"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "cafe_orders_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cafe_orders_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialist_net_balance"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "cafe_orders_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "v_specialist_availability"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "cafe_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cafe_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "cafe_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cafe_orders_workstation_id_fkey"
            columns: ["workstation_id"]
            isOneToOne: false
            referencedRelation: "workstations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_cash_registers_summary: {
        Row: {
          branch_id: string | null
          branch_name: string | null
          currency_iso: string | null
          current_balance: number | null
          id: string | null
          is_active: boolean | null
          is_virtual: boolean | null
          last_closed_at: string | null
          last_closing_balance: number | null
          register_name: string | null
          tenant_id: string | null
          today_expense: number | null
          today_income: number | null
          today_net: number | null
          today_opening: number | null
          today_transactions: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_registers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_registers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "cash_registers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      v_customer_dashboard: {
        Row: {
          avatar_url: string | null
          customer_id: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          last_5_appointments: Json | null
          last_name: string | null
          last_visit_at: string | null
          loyalty_points: number | null
          next_appointment: Json | null
          paid_orders_count: number | null
          past_appointments_count: number | null
          phone: string | null
          preferred_branch_id: string | null
          preferred_currency: string | null
          preferred_language: string | null
          preferred_specialist_id: string | null
          tenant_id: string | null
          top_services: Json | null
          total_spent: number | null
          total_visits: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_preferred_branch_id_fkey"
            columns: ["preferred_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_preferred_currency_fkey"
            columns: ["preferred_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "customers_preferred_specialist_id_fkey"
            columns: ["preferred_specialist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_preferred_specialist_id_fkey"
            columns: ["preferred_specialist_id"]
            isOneToOne: false
            referencedRelation: "specialist_net_balance"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "customers_preferred_specialist_id_fkey"
            columns: ["preferred_specialist_id"]
            isOneToOne: false
            referencedRelation: "v_specialist_availability"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      v_daily_appointments: {
        Row: {
          branch_id: string | null
          branch_name: string | null
          customer_id: string | null
          customer_name: string | null
          customer_notes: string | null
          customer_phone: string | null
          duration_minutes: number | null
          ends_at: string | null
          estimated_price: number | null
          id: string | null
          scheduled_at: string | null
          service_id: string | null
          service_name: string | null
          source: string | null
          specialist_id: string | null
          specialist_name: string | null
          status: Database["public"]["Enums"]["appointment_status"] | null
          tenant_id: string | null
          workstation_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialist_net_balance"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "appointments_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "v_specialist_availability"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      v_ecommerce_categories_public: {
        Row: {
          category: string | null
          tenant_id: string | null
          tenant_slug: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      v_ecommerce_products_public: {
        Row: {
          branch_id: string | null
          branch_name: string | null
          brand: string | null
          category: string | null
          currency_iso: string | null
          description: string | null
          images: Json | null
          name: string | null
          price: number | null
          product_id: string | null
          sku: string | null
          tenant_id: string | null
          tenant_slug: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      v_ecommerce_storefront_public: {
        Row: {
          accent_color: string | null
          announcement_bar: string | null
          background_color: string | null
          button_radius: string | null
          custom_sections: Json | null
          custom_tokens: Json | null
          hero_image_url: string | null
          hero_subtitle: string | null
          hero_title: string | null
          logo_url: string | null
          primary_color: string | null
          product_sort: string | null
          public_path: string | null
          secondary_color: string | null
          seo_description: string | null
          seo_title: string | null
          show_branch_badge: boolean | null
          show_categories: boolean | null
          show_prices: boolean | null
          show_search: boolean | null
          show_whatsapp_button: boolean | null
          store_name: string | null
          surface_color: string | null
          template_slug: string | null
          tenant_id: string | null
          tenant_name: string | null
          tenant_slug: string | null
          text_color: string | null
          whatsapp_message_template: string | null
          whatsapp_number: string | null
        }
        Relationships: []
      }
      v_low_stock_alerts: {
        Row: {
          branch_id: string | null
          calculated_stock: number | null
          category: string | null
          is_low_stock: boolean | null
          min_stock_alert: number | null
          product_id: string | null
          product_name: string | null
          sku: string | null
          stock_quantity: number | null
          tenant_id: string | null
          total_adjustments: number | null
          total_entries: number | null
          total_exits: number | null
          total_specialist_withdrawals: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      v_product_stock_summary: {
        Row: {
          branch_id: string | null
          calculated_stock: number | null
          category: string | null
          is_low_stock: boolean | null
          min_stock_alert: number | null
          product_id: string | null
          product_name: string | null
          sku: string | null
          stock_quantity: number | null
          tenant_id: string | null
          total_adjustments: number | null
          total_entries: number | null
          total_exits: number | null
          total_specialist_withdrawals: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      v_specialist_availability: {
        Row: {
          branch_id: string | null
          break_end: string | null
          break_start: string | null
          day_of_week: Database["public"]["Enums"]["day_of_week"] | null
          end_time: string | null
          full_name: string | null
          rating: number | null
          service_ids: string[] | null
          service_names: string[] | null
          specialist_id: string | null
          start_time: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      v_specialist_debt_balance: {
        Row: {
          active_debts: number | null
          currency_code: string | null
          specialist_id: string | null
          tenant_id: string | null
          total_original: number | null
          total_paid: number | null
          total_remaining: number | null
        }
        Relationships: [
          {
            foreignKeyName: "specialist_debts_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "specialist_debts_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_debts_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialist_net_balance"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "specialist_debts_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "v_specialist_availability"
            referencedColumns: ["specialist_id"]
          },
          {
            foreignKeyName: "specialist_debts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_debts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_ecommerce_storefront_public"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "specialist_debts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      v_tenants_public: {
        Row: {
          client_app_enabled: boolean | null
          country_code: string | null
          currency_code: string | null
          custom_layout: Json | null
          custom_theme: Json | null
          favicon_url: string | null
          id: string | null
          locale: string | null
          logo_url: string | null
          name: string | null
          slug: string | null
          status: Database["public"]["Enums"]["tenant_status"] | null
          theme_id: string | null
          timezone: string | null
        }
        Insert: {
          client_app_enabled?: boolean | null
          country_code?: string | null
          currency_code?: string | null
          custom_layout?: Json | null
          custom_theme?: Json | null
          favicon_url?: string | null
          id?: string | null
          locale?: string | null
          logo_url?: string | null
          name?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["tenant_status"] | null
          theme_id?: string | null
          timezone?: string | null
        }
        Update: {
          client_app_enabled?: boolean | null
          country_code?: string | null
          currency_code?: string | null
          custom_layout?: Json | null
          custom_theme?: Json | null
          favicon_url?: string | null
          id?: string | null
          locale?: string | null
          logo_url?: string | null
          name?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["tenant_status"] | null
          theme_id?: string | null
          timezone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_inventory_stock: {
        Args: { p_branch_id: string; p_product_id: string }
        Returns: number
      }
      check_specialist_availability: {
        Args: {
          p_duration_minutes: number
          p_scheduled_at: string
          p_specialist_id: string
        }
        Returns: boolean
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      find_or_create_cafeteria_customer: {
        Args: {
          p_branch_id: string
          p_email: string
          p_full_name: string
          p_tenant_id: string
        }
        Returns: {
          customer_id: string
          was_created: boolean
        }[]
      }
      generate_commissions_for_order: {
        Args: { p_invoice_id?: string; p_order_id: string }
        Returns: number
      }
      get_available_slots_for_service: {
        Args: {
          p_branch_id: string
          p_date: string
          p_service_id: string
          p_slot_interval_minutes?: number
          p_specialist_id?: string
          p_tenant_id: string
        }
        Returns: {
          slot_end: string
          slot_start: string
          specialist_avatar_url: string
          specialist_id: string
          specialist_name: string
          specialist_rating: number
          specialist_total_ratings: number
        }[]
      }
      get_current_tenant_id: { Args: never; Returns: string }
      get_exchange_rate: {
        Args: {
          p_date?: string
          p_from_currency: string
          p_tenant_id: string
          p_to_currency: string
        }
        Returns: number
      }
      get_next_available_slot: {
        Args: {
          p_branch_id: string
          p_service_id: string
          p_specialist_id?: string
          p_start_from?: string
          p_tenant_id: string
        }
        Returns: {
          slot_time: string
          specialist_id: string
          specialist_name: string
        }[]
      }
      get_or_create_customer_for_user: {
        Args: {
          p_email: string
          p_full_name?: string
          p_phone?: string
          p_tenant_id: string
          p_user_id: string
        }
        Returns: string
      }
      get_public_cafeteria_qr_context: {
        Args: { p_qr_slug: string; p_tenant_slug: string }
        Returns: {
          branch_id: string
          branch_name: string
          qr_enabled: boolean
          specialist_id: string
          specialist_name: string
          station_active: boolean
          tenant_id: string
          tenant_name: string
          tenant_slug: string
          workstation_code: string
          workstation_id: string
          workstation_name: string
        }[]
      }
      get_public_client_app_settings: {
        Args: { p_tenant_slug: string }
        Returns: {
          brand_name: string
          client_app_enabled: boolean
          custom_sections: Json
          custom_tokens: Json
          google_login_enabled: boolean
          hero_image_url: string
          logo_url: string
          show_google_login_preview: boolean
          template_slug: string
          tenant_id: string
          tenant_name: string
          tenant_slug: string
          theme_mode: string
          welcome_subtitle: string
          welcome_title: string
        }[]
      }
      get_public_ecommerce_products: {
        Args: { p_category?: string; p_search?: string; p_tenant_slug: string }
        Returns: {
          branch_id: string
          branch_name: string
          brand: string
          category: string
          currency_iso: string
          description: string
          images: Json
          name: string
          price: number
          product_id: string
          sku: string
          tenant_id: string
          tenant_slug: string
        }[]
      }
      get_public_ecommerce_storefront: {
        Args: { p_tenant_slug: string }
        Returns: {
          accent_color: string
          announcement_bar: string
          background_color: string
          button_radius: string
          custom_sections: Json
          custom_tokens: Json
          hero_image_url: string
          hero_subtitle: string
          hero_title: string
          logo_url: string
          primary_color: string
          product_sort: string
          public_path: string
          secondary_color: string
          seo_description: string
          seo_title: string
          show_branch_badge: boolean
          show_categories: boolean
          show_prices: boolean
          show_search: boolean
          show_whatsapp_button: boolean
          store_name: string
          surface_color: string
          template_slug: string
          tenant_id: string
          tenant_name: string
          tenant_slug: string
          text_color: string
          whatsapp_message_template: string
          whatsapp_number: string
        }[]
      }
      get_service_specialists: {
        Args: { p_branch_id: string; p_service_id: string; p_tenant_id: string }
        Returns: {
          avatar_url: string
          bio: string
          custom_duration: number
          custom_price: number
          full_name: string
          rating: number
          specialist_id: string
          total_ratings: number
        }[]
      }
      get_user_tenant_role: {
        Args: never
        Returns: Database["public"]["Enums"]["tenant_role"]
      }
      is_global_admin: { Args: never; Returns: boolean }
      is_tenant_ecommerce_public: {
        Args: { check_tenant_id: string }
        Returns: boolean
      }
      is_tenant_owner_or_admin: { Args: never; Returns: boolean }
      link_customer_to_user: {
        Args: { p_customer_id: string; p_user_id: string }
        Returns: boolean
      }
      resolve_commission_rule: {
        Args: {
          p_item_id: string
          p_item_type: Database["public"]["Enums"]["order_item_type"]
          p_specialist_id: string
        }
        Returns: {
          commission_type: Database["public"]["Enums"]["commission_type"]
          created_at: string
          currency_code: string | null
          id: string
          is_active: boolean
          item_type: Database["public"]["Enums"]["order_item_type"] | null
          notes: string | null
          scope: Database["public"]["Enums"]["commission_scope"]
          service_id: string | null
          specialist_id: string
          tenant_id: string
          updated_at: string
          value: number
        }
        SetofOptions: {
          from: "*"
          to: "commission_rules"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      user_belongs_to_tenant: {
        Args: { check_tenant_id: string }
        Returns: boolean
      }
      user_tenant_id: { Args: never; Returns: string }
    }
    Enums: {
      appointment_status:
        | "pending"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
      cafe_order_status:
        | "pending"
        | "preparing"
        | "ready"
        | "delivered"
        | "cancelled"
      cafe_order_type: "client" | "specialist" | "walkin"
      commission_scope: "all" | "item_type" | "service"
      commission_status: "pending" | "approved" | "paid" | "cancelled"
      commission_type: "percentage" | "fixed"
      day_of_week:
        | "monday"
        | "tuesday"
        | "wednesday"
        | "thursday"
        | "friday"
        | "saturday"
        | "sunday"
      favorite_entity_type: "service" | "product" | "specialist"
      global_role: "super_admin" | "admin" | "support"
      inventory_movement_type:
        | "entry"
        | "exit"
        | "adjustment"
        | "specialist_withdrawal"
      invoice_status:
        | "draft"
        | "pending"
        | "partial"
        | "paid"
        | "cancelled"
        | "refunded"
      invoice_type: "advance" | "full" | "partial"
      module_status: "active" | "beta" | "deprecated" | "coming_soon"
      order_item_type: "service" | "product" | "cafeteria"
      order_status: "draft" | "sent" | "paid" | "cancelled"
      resource_type: "human" | "physical"
      service_category:
        | "hair"
        | "nails"
        | "skin"
        | "makeup"
        | "spa"
        | "barber"
        | "other"
      tenant_role: "owner" | "admin" | "manager" | "employee"
      tenant_status: "active" | "suspended" | "trial" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      appointment_status: [
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
      ],
      cafe_order_status: [
        "pending",
        "preparing",
        "ready",
        "delivered",
        "cancelled",
      ],
      cafe_order_type: ["client", "specialist", "walkin"],
      commission_scope: ["all", "item_type", "service"],
      commission_status: ["pending", "approved", "paid", "cancelled"],
      commission_type: ["percentage", "fixed"],
      day_of_week: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
      favorite_entity_type: ["service", "product", "specialist"],
      global_role: ["super_admin", "admin", "support"],
      inventory_movement_type: [
        "entry",
        "exit",
        "adjustment",
        "specialist_withdrawal",
      ],
      invoice_status: [
        "draft",
        "pending",
        "partial",
        "paid",
        "cancelled",
        "refunded",
      ],
      invoice_type: ["advance", "full", "partial"],
      module_status: ["active", "beta", "deprecated", "coming_soon"],
      order_item_type: ["service", "product", "cafeteria"],
      order_status: ["draft", "sent", "paid", "cancelled"],
      resource_type: ["human", "physical"],
      service_category: [
        "hair",
        "nails",
        "skin",
        "makeup",
        "spa",
        "barber",
        "other",
      ],
      tenant_role: ["owner", "admin", "manager", "employee"],
      tenant_status: ["active", "suspended", "trial", "cancelled"],
    },
  },
} as const
