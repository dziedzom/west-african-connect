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
          key_requirements: Json | null
          match_score: number
          missing_qualifications: Json | null
          rfp_id: string
          risk_flags: Json | null
          updated_at: string
          user_id: string
          winning_strategy_summary: string | null
        }
        Insert: {
          created_at?: string
          gap_analysis?: string | null
          id?: string
          key_requirements?: Json | null
          match_score?: number
          missing_qualifications?: Json | null
          rfp_id: string
          risk_flags?: Json | null
          updated_at?: string
          user_id: string
          winning_strategy_summary?: string | null
        }
        Update: {
          created_at?: string
          gap_analysis?: string | null
          id?: string
          key_requirements?: Json | null
          match_score?: number
          missing_qualifications?: Json | null
          rfp_id?: string
          risk_flags?: Json | null
          updated_at?: string
          user_id?: string
          winning_strategy_summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "scraped_rfps"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_analyses: {
        Row: {
          analysis_data: Json
          created_at: string
          engagement_id: string | null
          id: string
          rfp_id: string | null
          source_text: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_data: Json
          created_at?: string
          engagement_id?: string | null
          id?: string
          rfp_id?: string | null
          source_text?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_data?: Json
          created_at?: string
          engagement_id?: string | null
          id?: string
          rfp_id?: string | null
          source_text?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bid_analyses_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_analyses_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "scraped_rfps"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_drafts: {
        Row: {
          company_intake: Json | null
          created_at: string | null
          engagement_id: string | null
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
          engagement_id?: string | null
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
          engagement_id?: string | null
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
            foreignKeyName: "bid_drafts_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
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
          engagement_id: string | null
          grade: string | null
          id: string
          overall_score: number | null
          review_data: Json | null
          rfp_id: string | null
          rfp_title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          engagement_id?: string | null
          grade?: string | null
          id?: string
          overall_score?: number | null
          review_data?: Json | null
          rfp_id?: string | null
          rfp_title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          engagement_id?: string | null
          grade?: string | null
          id?: string
          overall_score?: number | null
          review_data?: Json | null
          rfp_id?: string | null
          rfp_title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bid_reviews_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_reviews_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "scraped_rfps"
            referencedColumns: ["id"]
          },
        ]
      }
      company_verification_documents: {
        Row: {
          doc_type: Database["public"]["Enums"]["verification_doc_type"]
          file_name: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_at: string
          user_id: string
          verification_id: string
        }
        Insert: {
          doc_type: Database["public"]["Enums"]["verification_doc_type"]
          file_name: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_at?: string
          user_id: string
          verification_id: string
        }
        Update: {
          doc_type?: Database["public"]["Enums"]["verification_doc_type"]
          file_name?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_at?: string
          user_id?: string
          verification_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_verification_documents_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "company_verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      company_verifications: {
        Row: {
          created_at: string
          id: string
          legal_name: string | null
          registration_country: string | null
          registration_number: string | null
          rejection_reason: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["verification_status"]
          submitted_at: string | null
          updated_at: string
          user_id: string
          verified_until: string | null
          year_founded: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          legal_name?: string | null
          registration_country?: string | null
          registration_number?: string | null
          rejection_reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id: string
          verified_until?: string | null
          year_founded?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          legal_name?: string | null
          registration_country?: string | null
          registration_number?: string | null
          rejection_reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          verified_until?: string | null
          year_founded?: number | null
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
      engagement_activities: {
        Row: {
          activity_date: string
          activity_type: string
          created_at: string
          created_by: string | null
          engagement_id: string
          id: string
          is_internal: boolean
          note: string | null
        }
        Insert: {
          activity_date?: string
          activity_type?: string
          created_at?: string
          created_by?: string | null
          engagement_id: string
          id?: string
          is_internal?: boolean
          note?: string | null
        }
        Update: {
          activity_date?: string
          activity_type?: string
          created_at?: string
          created_by?: string | null
          engagement_id?: string
          id?: string
          is_internal?: boolean
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "engagement_activities_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_commissions: {
        Row: {
          agreed_at: string | null
          commission_rate: number
          created_at: string
          currency: string
          engagement_id: string
          expected_commission: number | null
          id: string
          invoiced_at: string | null
          needs_fx_review: boolean | null
          notes: string | null
          paid_at: string | null
          project_value: number | null
          status: string
          updated_at: string
        }
        Insert: {
          agreed_at?: string | null
          commission_rate?: number
          created_at?: string
          currency?: string
          engagement_id: string
          expected_commission?: number | null
          id?: string
          invoiced_at?: string | null
          needs_fx_review?: boolean | null
          notes?: string | null
          paid_at?: string | null
          project_value?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          agreed_at?: string | null
          commission_rate?: number
          created_at?: string
          currency?: string
          engagement_id?: string
          expected_commission?: number | null
          id?: string
          invoiced_at?: string | null
          needs_fx_review?: boolean | null
          notes?: string | null
          paid_at?: string | null
          project_value?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_commissions_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: true
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_documents: {
        Row: {
          created_at: string
          doc_type: string | null
          due_date: string | null
          engagement_id: string
          external_location: string | null
          id: string
          name: string
          notes: string | null
          provided_by: string
          status: string
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          doc_type?: string | null
          due_date?: string | null
          engagement_id: string
          external_location?: string | null
          id?: string
          name: string
          notes?: string | null
          provided_by?: string
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          doc_type?: string | null
          due_date?: string | null
          engagement_id?: string
          external_location?: string | null
          id?: string
          name?: string
          notes?: string | null
          provided_by?: string
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_documents_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_partnerships: {
        Row: {
          created_at: string
          engagement_id: string | null
          id: string
          lead_label: string | null
          lead_prospect_id: string | null
          lead_status: string
          lead_user_id: string | null
          partner_label: string | null
          partner_prospect_id: string | null
          partner_status: string
          partner_user_id: string | null
          rationale: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          engagement_id?: string | null
          id?: string
          lead_label?: string | null
          lead_prospect_id?: string | null
          lead_status?: string
          lead_user_id?: string | null
          partner_label?: string | null
          partner_prospect_id?: string | null
          partner_status?: string
          partner_user_id?: string | null
          rationale?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          engagement_id?: string | null
          id?: string
          lead_label?: string | null
          lead_prospect_id?: string | null
          lead_status?: string
          lead_user_id?: string | null
          partner_label?: string | null
          partner_prospect_id?: string | null
          partner_status?: string
          partner_user_id?: string | null
          rationale?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_partnerships_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_partnerships_lead_prospect_id_fkey"
            columns: ["lead_prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_partnerships_partner_prospect_id_fkey"
            columns: ["partner_prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      engagements: {
        Row: {
          client_user_id: string | null
          created_at: string
          created_by: string | null
          id: string
          internal_notes: string | null
          manual_buyer: string | null
          manual_deadline: string | null
          manual_source_url: string | null
          manual_title: string | null
          prospect_id: string | null
          rfp_id: string | null
          stage: string
          stage_changed_at: string
          updated_at: string
        }
        Insert: {
          client_user_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          internal_notes?: string | null
          manual_buyer?: string | null
          manual_deadline?: string | null
          manual_source_url?: string | null
          manual_title?: string | null
          prospect_id?: string | null
          rfp_id?: string | null
          stage?: string
          stage_changed_at?: string
          updated_at?: string
        }
        Update: {
          client_user_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          internal_notes?: string | null
          manual_buyer?: string | null
          manual_deadline?: string | null
          manual_source_url?: string | null
          manual_title?: string | null
          prospect_id?: string | null
          rfp_id?: string | null
          stage?: string
          stage_changed_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagements_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "scraped_rfps"
            referencedColumns: ["id"]
          },
        ]
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
      opportunity_tracker: {
        Row: {
          contract_currency: string | null
          contract_value: number | null
          created_at: string
          id: string
          insight_id: string | null
          last_nudge_at: string | null
          nudge_count: number
          outcome_note: string | null
          outcome_reported_at: string | null
          outcome_source: string | null
          predicted_match_at: string | null
          predicted_match_score: number | null
          predicted_review_grade: string | null
          predicted_review_score: number | null
          predicted_win_confidence: string | null
          predicted_win_probability: number | null
          prediction_snapshot_at: string | null
          review_id: string | null
          rfp_id: string
          snooze_until: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contract_currency?: string | null
          contract_value?: number | null
          created_at?: string
          id?: string
          insight_id?: string | null
          last_nudge_at?: string | null
          nudge_count?: number
          outcome_note?: string | null
          outcome_reported_at?: string | null
          outcome_source?: string | null
          predicted_match_at?: string | null
          predicted_match_score?: number | null
          predicted_review_grade?: string | null
          predicted_review_score?: number | null
          predicted_win_confidence?: string | null
          predicted_win_probability?: number | null
          prediction_snapshot_at?: string | null
          review_id?: string | null
          rfp_id: string
          snooze_until?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contract_currency?: string | null
          contract_value?: number | null
          created_at?: string
          id?: string
          insight_id?: string | null
          last_nudge_at?: string | null
          nudge_count?: number
          outcome_note?: string | null
          outcome_reported_at?: string | null
          outcome_source?: string | null
          predicted_match_at?: string | null
          predicted_match_score?: number | null
          predicted_review_grade?: string | null
          predicted_review_score?: number | null
          predicted_win_confidence?: string | null
          predicted_win_probability?: number | null
          prediction_snapshot_at?: string | null
          review_id?: string | null
          rfp_id?: string
          snooze_until?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_tracker_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "scraped_rfps"
            referencedColumns: ["id"]
          },
        ]
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
          insights_generated: number
          location: string | null
          proposals_drafted: number
          rfps_analysed: number | null
          subscription_amount: number | null
          subscription_end: string | null
          subscription_plan: string | null
          subscription_start: string | null
          subscription_tier: string
          updated_at: string
          usage_period_start: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
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
          insights_generated?: number
          location?: string | null
          proposals_drafted?: number
          rfps_analysed?: number | null
          subscription_amount?: number | null
          subscription_end?: string | null
          subscription_plan?: string | null
          subscription_start?: string | null
          subscription_tier?: string
          updated_at?: string
          usage_period_start?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
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
          insights_generated?: number
          location?: string | null
          proposals_drafted?: number
          rfps_analysed?: number | null
          subscription_amount?: number | null
          subscription_end?: string | null
          subscription_plan?: string | null
          subscription_start?: string | null
          subscription_tier?: string
          updated_at?: string
          usage_period_start?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
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
            referencedRelation: "scraped_rfps"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          capabilities: string | null
          company_name: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          converted_at: string | null
          converted_user_id: string | null
          created_at: string
          created_by: string | null
          id: string
          lead_source: string | null
          location: string | null
          notes: string | null
          sector: string | null
          status: string
          updated_at: string
        }
        Insert: {
          capabilities?: string | null
          company_name: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          converted_at?: string | null
          converted_user_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_source?: string | null
          location?: string | null
          notes?: string | null
          sector?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          capabilities?: string | null
          company_name?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          converted_at?: string | null
          converted_user_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_source?: string | null
          location?: string | null
          notes?: string | null
          sector?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
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
      rfps_deprecated_20260914: {
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
      scrape_alert_log: {
        Row: {
          alert_key: string
          alert_type: string
          created_at: string
          detail: string | null
          email_error: string | null
          email_status: string
          email_to: string | null
          id: string
          severity: string
          subject: string
        }
        Insert: {
          alert_key: string
          alert_type: string
          created_at?: string
          detail?: string | null
          email_error?: string | null
          email_status?: string
          email_to?: string | null
          id?: string
          severity?: string
          subject: string
        }
        Update: {
          alert_key?: string
          alert_type?: string
          created_at?: string
          detail?: string | null
          email_error?: string | null
          email_status?: string
          email_to?: string | null
          id?: string
          severity?: string
          subject?: string
        }
        Relationships: []
      }
      scrape_run_log: {
        Row: {
          auth_failure: boolean
          batch: number | null
          batch_size: number | null
          created_at: string
          duration_ms: number | null
          error_summary: string | null
          http_status: number | null
          id: string
          invoked_by: string
          ok: boolean
          portals_failed: number | null
          portals_processed: number | null
          response_body: Json | null
          rows_saved: number | null
        }
        Insert: {
          auth_failure?: boolean
          batch?: number | null
          batch_size?: number | null
          created_at?: string
          duration_ms?: number | null
          error_summary?: string | null
          http_status?: number | null
          id?: string
          invoked_by?: string
          ok?: boolean
          portals_failed?: number | null
          portals_processed?: number | null
          response_body?: Json | null
          rows_saved?: number | null
        }
        Update: {
          auth_failure?: boolean
          batch?: number | null
          batch_size?: number | null
          created_at?: string
          duration_ms?: number | null
          error_summary?: string | null
          http_status?: number | null
          id?: string
          invoked_by?: string
          ok?: boolean
          portals_failed?: number | null
          portals_processed?: number | null
          response_body?: Json | null
          rows_saved?: number | null
        }
        Relationships: []
      }
      scrape_sources: {
        Row: {
          auto_disabled_until: string | null
          category: Database["public"]["Enums"]["scrape_source_category"]
          consecutive_failures: number
          created_at: string
          detail_link_pattern: string | null
          detail_max_per_run: number
          domain: string
          enabled: boolean
          follow_detail_pages: boolean
          id: string
          last_error: string | null
          last_run_at: string | null
          last_success_at: string | null
          name: string
          notes: string | null
          priority: number
          successful_runs: number
          total_runs: number
          updated_at: string
          url: string
        }
        Insert: {
          auto_disabled_until?: string | null
          category?: Database["public"]["Enums"]["scrape_source_category"]
          consecutive_failures?: number
          created_at?: string
          detail_link_pattern?: string | null
          detail_max_per_run?: number
          domain: string
          enabled?: boolean
          follow_detail_pages?: boolean
          id?: string
          last_error?: string | null
          last_run_at?: string | null
          last_success_at?: string | null
          name: string
          notes?: string | null
          priority?: number
          successful_runs?: number
          total_runs?: number
          updated_at?: string
          url: string
        }
        Update: {
          auto_disabled_until?: string | null
          category?: Database["public"]["Enums"]["scrape_source_category"]
          consecutive_failures?: number
          created_at?: string
          detail_link_pattern?: string | null
          detail_max_per_run?: number
          domain?: string
          enabled?: boolean
          follow_detail_pages?: boolean
          id?: string
          last_error?: string | null
          last_run_at?: string | null
          last_success_at?: string | null
          name?: string
          notes?: string | null
          priority?: number
          successful_runs?: number
          total_runs?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      scraped_rfps: {
        Row: {
          additional_source_urls: string[]
          africa_relevant: boolean
          budget: string | null
          category: string | null
          content_hash: string | null
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          location: string | null
          needs_review: boolean
          organization: string | null
          portal: string
          scraped_at: string
          source_category:
            | Database["public"]["Enums"]["scrape_source_category"]
            | null
          source_domain: string | null
          source_priority: number | null
          source_url: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          additional_source_urls?: string[]
          africa_relevant?: boolean
          budget?: string | null
          category?: string | null
          content_hash?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          location?: string | null
          needs_review?: boolean
          organization?: string | null
          portal: string
          scraped_at?: string
          source_category?:
            | Database["public"]["Enums"]["scrape_source_category"]
            | null
          source_domain?: string | null
          source_priority?: number | null
          source_url: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          additional_source_urls?: string[]
          africa_relevant?: boolean
          budget?: string | null
          category?: string | null
          content_hash?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          location?: string | null
          needs_review?: boolean
          organization?: string | null
          portal?: string
          scraped_at?: string
          source_category?:
            | Database["public"]["Enums"]["scrape_source_category"]
            | null
          source_domain?: string | null
          source_priority?: number | null
          source_url?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      submission_checklists: {
        Row: {
          checked_items: Json
          checklist_data: Json
          country: string | null
          created_at: string
          deadline: string | null
          documents: string | null
          engagement_id: string | null
          id: string
          rfp_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          checked_items?: Json
          checklist_data: Json
          country?: string | null
          created_at?: string
          deadline?: string | null
          documents?: string | null
          engagement_id?: string | null
          id?: string
          rfp_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          checked_items?: Json
          checklist_data?: Json
          country?: string | null
          created_at?: string
          deadline?: string | null
          documents?: string | null
          engagement_id?: string | null
          id?: string
          rfp_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_checklists_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_checklists_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "scraped_rfps"
            referencedColumns: ["id"]
          },
        ]
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
          needs_fx_review: boolean
          notes: string | null
          rfp_id: string | null
          rfp_title: string
          success_fee: number | null
          tracker_id: string | null
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
          needs_fx_review?: boolean
          notes?: string | null
          rfp_id?: string | null
          rfp_title: string
          success_fee?: number | null
          tracker_id?: string | null
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
          needs_fx_review?: boolean
          notes?: string | null
          rfp_id?: string | null
          rfp_title?: string
          success_fee?: number | null
          tracker_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "won_contracts_tracker_id_fkey"
            columns: ["tracker_id"]
            isOneToOne: false
            referencedRelation: "opportunity_tracker"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_profiles_view: {
        Row: {
          about: string | null
          bids_generated: number | null
          bids_reviewed: number | null
          checklists_created: number | null
          company_name: string | null
          created_at: string | null
          email: string | null
          expertise: string | null
          id: string | null
          location: string | null
          rfps_analysed: number | null
          subscription_plan: string | null
          subscription_tier: string | null
          updated_at: string | null
          user_id: string | null
          website: string | null
        }
        Insert: {
          about?: string | null
          bids_generated?: number | null
          bids_reviewed?: number | null
          checklists_created?: number | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          expertise?: string | null
          id?: string | null
          location?: string | null
          rfps_analysed?: number | null
          subscription_plan?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
        }
        Update: {
          about?: string | null
          bids_generated?: number | null
          bids_reviewed?: number | null
          checklists_created?: number | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          expertise?: string | null
          id?: string | null
          location?: string | null
          rfps_analysed?: number | null
          subscription_plan?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_engagement_client: {
        Args: { _engagement_id: string }
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
      scrape_source_category:
        | "multilateral"
        | "bilateral_donor"
        | "african_government"
        | "regional_body"
        | "aggregator"
        | "other"
      verification_doc_type:
        | "certificate_of_incorporation"
        | "tax_clearance"
        | "business_licence"
        | "vat_or_tin"
        | "bank_letter"
        | "other"
      verification_status:
        | "unverified"
        | "pending"
        | "verified"
        | "rejected"
        | "expired"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
      partnership_category: [
        "marketing_advertising",
        "communication",
        "production",
        "web_digital",
      ],
      proposal_status: ["draft", "submitted", "under_review", "won", "lost"],
      scrape_source_category: [
        "multilateral",
        "bilateral_donor",
        "african_government",
        "regional_body",
        "aggregator",
        "other",
      ],
      verification_doc_type: [
        "certificate_of_incorporation",
        "tax_clearance",
        "business_licence",
        "vat_or_tin",
        "bank_letter",
        "other",
      ],
      verification_status: [
        "unverified",
        "pending",
        "verified",
        "rejected",
        "expired",
      ],
    },
  },
} as const
