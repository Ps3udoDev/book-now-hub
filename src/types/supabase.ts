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
            referencedRelation: "v_specialist_availability"
            referencedColumns: ["specialist_id"]
          },
        ]
      }
      appointments: {
        Row: {
          actual_duration: number | null
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
      customers: {
        Row: {
          accepts_marketing: boolean | null
          address: string | null
          birth_date: string | null
          city: string | null
          created_at: string | null
          document_number: string | null
          document_type: string | null
          email: string | null
          full_name: string
          gender: string | null
          how_found_us: string | null
          id: string
          is_active: boolean | null
          last_visit_at: string | null
          loyalty_points: number | null
          notes: string | null
          phone: string | null
          phone_secondary: string | null
          preferred_branch_id: string | null
          preferred_specialist_id: string | null
          tags: string[] | null
          tenant_id: string
          total_spent: number | null
          total_visits: number | null
          updated_at: string | null
        }
        Insert: {
          accepts_marketing?: boolean | null
          address?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string | null
          document_number?: string | null
          document_type?: string | null
          email?: string | null
          full_name: string
          gender?: string | null
          how_found_us?: string | null
          id?: string
          is_active?: boolean | null
          last_visit_at?: string | null
          loyalty_points?: number | null
          notes?: string | null
          phone?: string | null
          phone_secondary?: string | null
          preferred_branch_id?: string | null
          preferred_specialist_id?: string | null
          tags?: string[] | null
          tenant_id: string
          total_spent?: number | null
          total_visits?: number | null
          updated_at?: string | null
        }
        Update: {
          accepts_marketing?: boolean | null
          address?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string | null
          document_number?: string | null
          document_type?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          how_found_us?: string | null
          id?: string
          is_active?: boolean | null
          last_visit_at?: string | null
          loyalty_points?: number | null
          notes?: string | null
          phone?: string | null
          phone_secondary?: string | null
          preferred_branch_id?: string | null
          preferred_specialist_id?: string | null
          tags?: string[] | null
          tenant_id?: string
          total_spent?: number | null
          total_visits?: number | null
          updated_at?: string | null
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
        ]
      }
      invoices: {
        Row: {
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
          id: string
          invoice_number: string
          notes: string | null
          paid_at: string | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          subtotal: number
          tax_amount: number | null
          tenant_id: string
          total: number
          updated_at: string | null
        }
        Insert: {
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
          id?: string
          invoice_number: string
          notes?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal?: number
          tax_amount?: number | null
          tenant_id: string
          total?: number
          updated_at?: string | null
        }
        Update: {
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
          id?: string
          invoice_number?: string
          notes?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal?: number
          tax_amount?: number | null
          tenant_id?: string
          total?: number
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
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
        }
        Relationships: [
          {
            foreignKeyName: "service_variants_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
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
            referencedRelation: "v_specialist_availability"
            referencedColumns: ["specialist_id"]
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
            referencedRelation: "v_specialist_availability"
            referencedColumns: ["specialist_id"]
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
        ]
      }
      tenants: {
        Row: {
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
            foreignKeyName: "workstations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
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
        ]
      }
    }
    Functions: {
      check_specialist_availability: {
        Args: {
          p_duration_minutes: number
          p_scheduled_at: string
          p_specialist_id: string
        }
        Returns: boolean
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
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
      is_global_admin: { Args: never; Returns: boolean }
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
      day_of_week:
        | "monday"
        | "tuesday"
        | "wednesday"
        | "thursday"
        | "friday"
        | "saturday"
        | "sunday"
      global_role: "super_admin" | "admin" | "support"
      invoice_status:
        | "draft"
        | "pending"
        | "partial"
        | "paid"
        | "cancelled"
        | "refunded"
      module_status: "active" | "beta" | "deprecated" | "coming_soon"
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
      day_of_week: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
      global_role: ["super_admin", "admin", "support"],
      invoice_status: [
        "draft",
        "pending",
        "partial",
        "paid",
        "cancelled",
        "refunded",
      ],
      module_status: ["active", "beta", "deprecated", "coming_soon"],
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
