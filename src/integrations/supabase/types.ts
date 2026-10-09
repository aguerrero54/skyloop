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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agency_fixed_cost_months: {
        Row: {
          amount: number
          created_at: string
          fixed_cost_id: string
          id: string
          month: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          fixed_cost_id: string
          id?: string
          month: string
          user_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          fixed_cost_id?: string
          id?: string
          month?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_fixed_cost_months_fixed_cost_id_fkey"
            columns: ["fixed_cost_id"]
            isOneToOne: false
            referencedRelation: "agency_fixed_costs"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_fixed_costs: {
        Row: {
          amount: number
          category: string
          created_at: string
          currency: string
          end_month: string | null
          id: string
          name: string
          notes: string | null
          start_month: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          currency?: string
          end_month?: string | null
          id?: string
          name: string
          notes?: string | null
          start_month?: string | null
          user_id?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          currency?: string
          end_month?: string | null
          id?: string
          name?: string
          notes?: string | null
          start_month?: string | null
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          agency: string
          currency: string
          id: number
          logo_url: string | null
          overhead_method: string
          public_url: string | null
          updated_at: string
          usd_rate: number
        }
        Insert: {
          agency?: string
          currency?: string
          id?: number
          logo_url?: string | null
          overhead_method?: string
          public_url?: string | null
          updated_at?: string
          usd_rate?: number
        }
        Update: {
          agency?: string
          currency?: string
          id?: number
          logo_url?: string | null
          overhead_method?: string
          public_url?: string | null
          updated_at?: string
          usd_rate?: number
        }
        Relationships: []
      }
      client_deliverables: {
        Row: {
          client_service_id: string
          delivered_count: number
          id: string
          month: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_service_id: string
          delivered_count?: number
          id?: string
          month: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          client_service_id?: string
          delivered_count?: number
          id?: string
          month?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_deliverables_client_service_id_fkey"
            columns: ["client_service_id"]
            isOneToOne: false
            referencedRelation: "client_services"
            referencedColumns: ["id"]
          },
        ]
      }
      client_service_months: {
        Row: {
          client_service_id: string
          cost: number
          created_at: string
          id: string
          month: string
          monthly_quantity: number
          provider_id: string | null
          user_id: string
        }
        Insert: {
          client_service_id: string
          cost?: number
          created_at?: string
          id?: string
          month: string
          monthly_quantity?: number
          provider_id?: string | null
          user_id?: string
        }
        Update: {
          client_service_id?: string
          cost?: number
          created_at?: string
          id?: string
          month?: string
          monthly_quantity?: number
          provider_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_service_months_client_service_id_fkey"
            columns: ["client_service_id"]
            isOneToOne: false
            referencedRelation: "client_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_service_months_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      client_services: {
        Row: {
          active: boolean
          client_id: string | null
          cost: number
          created_at: string
          end_month: string | null
          id: string
          monthly_quantity: number
          provider_id: string | null
          sale_price: number
          service_id: string | null
          start_month: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          client_id?: string | null
          cost?: number
          created_at?: string
          end_month?: string | null
          id?: string
          monthly_quantity?: number
          provider_id?: string | null
          sale_price?: number
          service_id?: string | null
          start_month?: string | null
          user_id?: string
        }
        Update: {
          active?: boolean
          client_id?: string | null
          cost?: number
          created_at?: string
          end_month?: string | null
          id?: string
          monthly_quantity?: number
          provider_id?: string | null
          sale_price?: number
          service_id?: string | null
          start_month?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_services_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          company: string | null
          contact: string | null
          country: string | null
          created_at: string
          currency: string
          email: string | null
          end_date: string | null
          id: string
          monthly_payment: number
          name: string
          notes: string | null
          phone: string | null
          start_date: string | null
          status: string
          tax_id: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          company?: string | null
          contact?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          end_date?: string | null
          id?: string
          monthly_payment?: number
          name: string
          notes?: string | null
          phone?: string | null
          start_date?: string | null
          status?: string
          tax_id?: string | null
          user_id?: string
        }
        Update: {
          address?: string | null
          company?: string | null
          contact?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          end_date?: string | null
          id?: string
          monthly_payment?: number
          name?: string
          notes?: string | null
          phone?: string | null
          start_date?: string | null
          status?: string
          tax_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      designer_task_comments: {
        Row: {
          author: string
          body: string
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          author?: string
          body: string
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          author?: string
          body?: string
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "designer_task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "designer_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      designer_tasks: {
        Row: {
          amount: number
          client_id: string | null
          client_service_id: string | null
          created_at: string
          currency: string
          delivered_at: string | null
          delivery_note: string | null
          description: string
          details: string | null
          due_date: string | null
          id: string
          invoice_id: string | null
          month: string
          provider_id: string
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          client_id?: string | null
          client_service_id?: string | null
          created_at?: string
          currency?: string
          delivered_at?: string | null
          delivery_note?: string | null
          description: string
          details?: string | null
          due_date?: string | null
          id?: string
          invoice_id?: string | null
          month?: string
          provider_id: string
          status?: string
          user_id?: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          client_service_id?: string | null
          created_at?: string
          currency?: string
          delivered_at?: string | null
          delivery_note?: string | null
          description?: string
          details?: string | null
          due_date?: string | null
          id?: string
          invoice_id?: string | null
          month?: string
          provider_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "designer_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designer_tasks_client_service_id_fkey"
            columns: ["client_service_id"]
            isOneToOne: false
            referencedRelation: "client_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designer_tasks_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designer_tasks_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          client_id: string | null
          concept: string
          created_at: string
          currency: string
          direct_cost: boolean
          due_date: string | null
          expense_date: string
          id: string
          paid_at: string | null
          provider_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          client_id?: string | null
          concept: string
          created_at?: string
          currency?: string
          direct_cost?: boolean
          due_date?: string | null
          expense_date?: string
          id?: string
          paid_at?: string | null
          provider_id?: string | null
          status?: string
          user_id?: string
        }
        Update: {
          amount?: number
          category?: string | null
          client_id?: string | null
          concept?: string
          created_at?: string
          currency?: string
          direct_cost?: boolean
          due_date?: string | null
          expense_date?: string
          id?: string
          paid_at?: string | null
          provider_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      incomes: {
        Row: {
          amount: number
          client_id: string | null
          concept: string
          created_at: string
          currency: string
          due_date: string | null
          id: string
          invoice_date: string
          paid_at: string | null
          service_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          client_id?: string | null
          concept: string
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          invoice_date?: string
          paid_at?: string | null
          service_id?: string | null
          status?: string
          user_id?: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          concept?: string
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          invoice_date?: string
          paid_at?: string | null
          service_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incomes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incomes_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string
          description: string
          id: string
          invoice_id: string
          obligation_id: string | null
          position: number
          quantity: number
          rate: number
          service_id: string | null
          tax: number
          user_id: string
        }
        Insert: {
          amount?: number
          client_id?: string | null
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          obligation_id?: string | null
          position?: number
          quantity?: number
          rate?: number
          service_id?: string | null
          tax?: number
          user_id?: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          obligation_id?: string | null
          position?: number
          quantity?: number
          rate?: number
          service_id?: string | null
          tax?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "provider_obligations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          notes: string | null
          payment_date: string
          payment_method: string
          reference: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          reference?: string | null
          user_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          reference?: string | null
          user_id?: string
        }
        Relationships: [
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
          adjustment: number
          amount_paid: number
          attachments: Json
          balance_due: number
          client_id: string | null
          created_at: string
          currency: string
          discount: number
          discount_type: string
          due_date: string | null
          financial_type: string
          id: string
          invoice_number: string
          invoice_type: string
          issue_date: string
          multi_client: boolean
          notes: string | null
          order_number: string | null
          payment_terms: string
          seller_id: string | null
          shipping: number
          status: string
          subject: string | null
          subtotal: number
          tax: number
          terms: string | null
          total: number
          updated_at: string
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          adjustment?: number
          amount_paid?: number
          attachments?: Json
          balance_due?: number
          client_id?: string | null
          created_at?: string
          currency?: string
          discount?: number
          discount_type?: string
          due_date?: string | null
          financial_type?: string
          id?: string
          invoice_number: string
          invoice_type?: string
          issue_date?: string
          multi_client?: boolean
          notes?: string | null
          order_number?: string | null
          payment_terms?: string
          seller_id?: string | null
          shipping?: number
          status?: string
          subject?: string | null
          subtotal?: number
          tax?: number
          terms?: string | null
          total?: number
          updated_at?: string
          user_id?: string
          vendor_id?: string | null
        }
        Update: {
          adjustment?: number
          amount_paid?: number
          attachments?: Json
          balance_due?: number
          client_id?: string | null
          created_at?: string
          currency?: string
          discount?: number
          discount_type?: string
          due_date?: string | null
          financial_type?: string
          id?: string
          invoice_number?: string
          invoice_type?: string
          issue_date?: string
          multi_client?: boolean
          notes?: string | null
          order_number?: string | null
          payment_terms?: string
          seller_id?: string | null
          shipping?: number
          status?: string
          subject?: string | null
          subtotal?: number
          tax?: number
          terms?: string | null
          total?: number
          updated_at?: string
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_history: {
        Row: {
          created_at: string
          expenses: number
          id: string
          income: number
          month: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expenses?: number
          id?: string
          income?: number
          month: string
          user_id?: string
        }
        Update: {
          created_at?: string
          expenses?: number
          id?: string
          income?: number
          month?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      provider_obligations: {
        Row: {
          amount: number
          amount_paid: number
          created_at: string
          currency: string
          description: string
          due_date: string | null
          id: string
          notes: string | null
          provider_id: string
          service_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          amount_paid?: number
          created_at?: string
          currency?: string
          description: string
          due_date?: string | null
          id?: string
          notes?: string | null
          provider_id: string
          service_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount?: number
          amount_paid?: number
          created_at?: string
          currency?: string
          description?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          provider_id?: string
          service_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_obligations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_obligations_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_task_links: {
        Row: {
          created_at: string
          id: string
          provider_id: string
          revoked: boolean
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          provider_id: string
          revoked?: boolean
          token?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          provider_id?: string
          revoked?: boolean
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_task_links_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          reference_rate: number
          specialty: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          reference_rate?: number
          specialty?: string | null
          status?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          reference_rate?: number
          specialty?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          category: string | null
          created_at: string
          estimated_cost: number
          id: string
          name: string
          status: string
          suggested_price: number
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          estimated_cost?: number
          id?: string
          name: string
          status?: string
          suggested_price?: number
          user_id?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          estimated_cost?: number
          id?: string
          name?: string
          status?: string
          suggested_price?: number
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          background_color: string | null
          dashboard_layout: Json | null
          theme_color: string
          theme_mode: string
          updated_at: string
          user_id: string
        }
        Insert: {
          background_color?: string | null
          dashboard_layout?: Json | null
          theme_color?: string
          theme_mode?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          background_color?: string | null
          dashboard_layout?: Json | null
          theme_color?: string
          theme_mode?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
