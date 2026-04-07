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
      agent_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          result_payload: Json | null
          status: string
          target_url: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          result_payload?: Json | null
          status?: string
          target_url: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          result_payload?: Json | null
          status?: string
          target_url?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_insights: {
        Row: {
          created_at: string
          gap_analysis: string | null
          id: string
          match_score: number
          rfp_id: string
          updated_at: string
          user_id: string
          winning_strategy_summary: string | null
        }
        Insert: {
          created_at?: string
          gap_analysis?: string | null
          id?: string
          match_score?: number
          rfp_id: string
          updated_at?: string
          user_id: string
          winning_strategy_summary?: string | null
        }
        Update: {
          created_at?: string
          gap_analysis?: string | null
          id?: string
          match_score?: number
          rfp_id?: string
          updated_at?: string
          user_id?: string
          winning_strategy_summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "rfps"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_drafts: {
        Row: {
          company_intake: Json | null
          created_at: string | null
          generated_sections: Json | null
          id: string
          rfp_id: string | null
          rfp_title: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_intake?: Json | null
          created_at?: string | null
          generated_sections?: Json | null
          id?: string
          rfp_id?: string | null
          rfp_title?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_intake?: Json | null
          created_at?: string | null
          generated_sections?: Json | null
          id?: string
          rfp_id?: string | null
          rfp_title?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bid_drafts_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "scraped_rfps"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_reviews: {
        Row: {
          created_at: string | null
          grade: string | null
          id: string
          overall_score: number | null
          review_data: Json | null
          rfp_title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          grade?: string | null
          id?: string
          overall_score?: number | null
          review_data?: Json | null
          rfp_title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          grade?: string | null
          id?: string
          overall_score?: number | null
          review_data?: Json | null
          rfp_title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          subject?: string | null
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      partnership_applications: {
        Row: {
          capabilities: string
          company_name: string
          contact_email: string
          created_at: string
          id: string
          portfolio_url: string | null
          proposal: string
          rfp_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          capabilities: string
          company_name: string
          contact_email: string
          created_at?: string
          id?: string
          portfolio_url?: string | null
          proposal: string
          rfp_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          capabilities?: string
          company_name?: string
          contact_email?: string
          created_at?: string
          id?: string
          portfolio_url?: string | null
          proposal?: string
          rfp_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnership_applications_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "partnership_rfps"
            referencedColumns: ["id"]
          },
        ]
      }
      partnership_rfps: {
        Row: {
          budget_range: string | null
          category: Database["public"]["Enums"]["partnership_category"]
          created_at: string
          deadline: string | null
          description: string
          id: string
          location: string | null
          requirements: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          budget_range?: string | null
          category: Database["public"]["Enums"]["partnership_category"]
          created_at?: string
          deadline?: string | null
          description: string
          id?: string
          location?: string | null
          requirements?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          budget_range?: string | null
          category?: Database["public"]["Enums"]["partnership_category"]
          created_at?: string
          deadline?: string | null
          description?: string
          id?: string
          location?: string | null
          requirements?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          about: string | null
          bids_generated: number | null
          bids_reviewed: number | null
          checklists_created: number | null
          company_name: string | null
          created_at: string
          email: string | null
          expertise: string | null
          id: string
          location: string | null
          rfps_analysed: number | null
          subscription_amount: number | null
          subscription_end: string | null
          subscription_plan: string | null
          subscription_start: string | null
          subscription_tier: string
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          about?: string | null
          bids_generated?: number | null
          bids_reviewed?: number | null
          checklists_created?: number | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          expertise?: string | null
          id?: string
          location?: string | null
          rfps_analysed?: number | null
          subscription_amount?: number | null
          subscription_end?: string | null
          subscription_plan?: string | null
          subscription_start?: string | null
          subscription_tier?: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          about?: string | null
          bids_generated?: number | null
          bids_reviewed?: number | null
          checklists_created?: number | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          expertise?: string | null
          id?: string
          location?: string | null
          rfps_analysed?: number | null
          subscription_amount?: number | null
          subscription_end?: string | null
          subscription_plan?: string | null
          subscription_start?: string | null
          subscription_tier?: string
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      proposals: {
        Row: {
          content: string
          created_at: string
          id: string
          rfp_id: string | null
          status: Database["public"]["Enums"]["proposal_status"]
          submitted_at: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          rfp_id?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          submitted_at?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          rfp_id?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          submitted_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "rfps"
            referencedColumns: ["id"]
          },
        ]
      }
      rfp_opportunities: {
        Row: {
          created_at: string
          id: string
          source_url: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_url: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          source_url?: string
          title?: string
        }
        Relationships: []
      }
      rfps: {
        Row: {
          budget: string | null
          category: string
          created_at: string
          deadline: string | null
          description: string
          id: string
          location: string | null
          org: string | null
          status: string
          title: string
          updated_at: string
          value: string | null
        }
        Insert: {
          budget?: string | null
          category: string
          created_at?: string
          deadline?: string | null
          description: string
          id?: string
          location?: string | null
          org?: string | null
          status?: string
          title: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          budget?: string | null
          category?: string
          created_at?: string
          deadline?: string | null
          description?: string
          id?: string
          location?: string | null
          org?: string | null
          status?: string
          title?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      scraped_rfps: {
        Row: {
          budget: string | null
          category: string | null
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          location: string | null
          organization: string | null
          portal: string
          scraped_at: string
          source_url: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          budget?: string | null
          category?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          location?: string | null
          organization?: string | null
          portal: string
          scraped_at?: string
          source_url: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          budget?: string | null
          category?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          location?: string | null
          organization?: string | null
          portal?: string
          scraped_at?: string
          source_url?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_knowledge_base: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      won_contracts: {
        Row: {
          agreement_confirmed: boolean
          contract_value: number
          created_at: string
          currency: string
          fee_paid: boolean
          fee_paid_at: string | null
          id: string
          invoice_sent: boolean
          invoice_sent_at: string | null
          notes: string | null
          rfp_id: string | null
          rfp_title: string
          success_fee: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agreement_confirmed?: boolean
          contract_value: number
          created_at?: string
          currency?: string
          fee_paid?: boolean
          fee_paid_at?: string | null
          id?: string
          invoice_sent?: boolean
          invoice_sent_at?: string | null
          notes?: string | null
          rfp_id?: string | null
          rfp_title: string
          success_fee?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agreement_confirmed?: boolean
          contract_value?: number
          created_at?: string
          currency?: string
          fee_paid?: boolean
          fee_paid_at?: string | null
          id?: string
          invoice_sent?: boolean
          invoice_sent_at?: string | null
          notes?: string | null
          rfp_id?: string | null
          rfp_title?: string
          success_fee?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      partnership_category:
        | "marketing_advertising"
        | "communication"
        | "production"
        | "web_digital"
      proposal_status: "draft" | "submitted" | "under_review" | "won" | "lost"
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
      app_role: ["admin", "moderator", "user"],
      partnership_category: [
        "marketing_advertising",
        "communication",
        "production",
        "web_digital",
      ],
      proposal_status: ["draft", "submitted", "under_review", "won", "lost"],
    },
  },
} as const
