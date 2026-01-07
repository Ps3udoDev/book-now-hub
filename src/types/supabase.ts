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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_tenant_id: { Args: never; Returns: string }
      is_global_admin: { Args: never; Returns: boolean }
      user_belongs_to_tenant: {
        Args: { check_tenant_id: string }
        Returns: boolean
      }
    }
    Enums: {
      global_role: "super_admin" | "admin" | "support"
      module_status: "active" | "beta" | "deprecated" | "coming_soon"
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
      global_role: ["super_admin", "admin", "support"],
      module_status: ["active", "beta", "deprecated", "coming_soon"],
      tenant_role: ["owner", "admin", "manager", "employee"],
      tenant_status: ["active", "suspended", "trial", "cancelled"],
    },
  },
} as const
