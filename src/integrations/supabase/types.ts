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
    PostgrestVersion: "14.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounting_transactions: {
        Row: {
          amount: number
          booking_id: string | null
          category: string
          created_at: string | null
          date: string
          description: string
          id: string
          invoice_id: string | null
          notes: string | null
          payment_method: string | null
          quotation_id: string | null
          reference_number: string | null
          stay_id: string | null
          tags: string[] | null
          tenant_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          booking_id?: string | null
          category?: string
          created_at?: string | null
          date?: string
          description?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_method?: string | null
          quotation_id?: string | null
          reference_number?: string | null
          stay_id?: string | null
          tags?: string[] | null
          tenant_id?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string | null
          category?: string
          created_at?: string | null
          date?: string
          description?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_method?: string | null
          quotation_id?: string | null
          reference_number?: string | null
          stay_id?: string | null
          tags?: string[] | null
          tenant_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      add_ons: {
        Row: {
          active: boolean
          category: string
          created_at: string
          description: string
          id: string
          image_url: string
          name: string
          price: number
          stay_id: string
          tenant_id: string
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string
          name: string
          price?: number
          stay_id: string
          tenant_id?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string
          name?: string
          price?: number
          stay_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "add_ons_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "stays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "add_ons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_search_logs: {
        Row: {
          created_at: string
          filters: Json
          id: string
          query: string
          results_count: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          query: string
          results_count?: number
          tenant_id?: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          query?: string
          results_count?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_search_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_settings: {
        Row: {
          ai_model: string
          ai_personality: string
          attraction_radius: number
          auto_review_summary: boolean
          blacklisted_words: string[]
          cache_duration: number
          cache_enabled: boolean
          data_sources: Json
          feature_chat_assistant: boolean
          feature_query_suggestions: boolean
          feature_recommendations: boolean
          feature_review_summaries: boolean
          feature_stay_highlights: boolean
          id: string
          recommendation_logic: Json
          response_length: string
          search_enabled: boolean
          system_prompt: string
          updated_at: string
        }
        Insert: {
          ai_model?: string
          ai_personality?: string
          attraction_radius?: number
          auto_review_summary?: boolean
          blacklisted_words?: string[]
          cache_duration?: number
          cache_enabled?: boolean
          data_sources?: Json
          feature_chat_assistant?: boolean
          feature_query_suggestions?: boolean
          feature_recommendations?: boolean
          feature_review_summaries?: boolean
          feature_stay_highlights?: boolean
          id?: string
          recommendation_logic?: Json
          response_length?: string
          search_enabled?: boolean
          system_prompt?: string
          updated_at?: string
        }
        Update: {
          ai_model?: string
          ai_personality?: string
          attraction_radius?: number
          auto_review_summary?: boolean
          blacklisted_words?: string[]
          cache_duration?: number
          cache_enabled?: boolean
          data_sources?: Json
          feature_chat_assistant?: boolean
          feature_query_suggestions?: boolean
          feature_recommendations?: boolean
          feature_review_summaries?: boolean
          feature_stay_highlights?: boolean
          id?: string
          recommendation_logic?: Json
          response_length?: string
          search_enabled?: boolean
          system_prompt?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_synonyms: {
        Row: {
          created_at: string
          id: string
          maps_to: string
          query_term: string
        }
        Insert: {
          created_at?: string
          id?: string
          maps_to: string
          query_term: string
        }
        Update: {
          created_at?: string
          id?: string
          maps_to?: string
          query_term?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          message: string
          published: boolean
          target: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          message?: string
          published?: boolean
          target?: string
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          message?: string
          published?: boolean
          target?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          cta_link: string | null
          cta_text: string | null
          id: string
          image_url: string | null
          is_active: boolean
          sort_order: number
          subtitle: string | null
          tenant_id: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          subtitle?: string | null
          tenant_id?: string
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          subtitle?: string | null
          tenant_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "banners_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_ledger_entries: {
        Row: {
          amount: number
          booking_id: string
          created_at: string | null
          id: string
          label: string
          notes: string | null
          tenant_id: string
          type: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string | null
          id?: string
          label: string
          notes?: string | null
          tenant_id?: string
          type: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string | null
          id?: string
          label?: string
          notes?: string | null
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_ledger_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_timeline: {
        Row: {
          booking_id: string
          changed_by: string | null
          created_at: string
          id: string
          note: string
          status: string
          tenant_id: string
        }
        Insert: {
          booking_id: string
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string
          status: string
          tenant_id?: string
        }
        Update: {
          booking_id?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_timeline_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_timeline_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          addons: Json
          adults: number
          booking_id: string
          checkin: string | null
          checkout: string | null
          children: number
          coupon_code: string | null
          created_at: string
          email: string
          group_booking: boolean
          group_name: string | null
          guest_name: string
          id: string
          pets: number
          phone: string
          phone_country_code: string | null
          rooms: Json
          solo_traveller: boolean
          special_requests: string | null
          status: string
          stay_id: string | null
          tenant_id: string
          total_price: number
        }
        Insert: {
          addons?: Json
          adults?: number
          booking_id: string
          checkin?: string | null
          checkout?: string | null
          children?: number
          coupon_code?: string | null
          created_at?: string
          email?: string
          group_booking?: boolean
          group_name?: string | null
          guest_name: string
          id?: string
          pets?: number
          phone?: string
          phone_country_code?: string | null
          rooms?: Json
          solo_traveller?: boolean
          special_requests?: string | null
          status?: string
          stay_id?: string | null
          tenant_id?: string
          total_price?: number
        }
        Update: {
          addons?: Json
          adults?: number
          booking_id?: string
          checkin?: string | null
          checkout?: string | null
          children?: number
          coupon_code?: string | null
          created_at?: string
          email?: string
          group_booking?: boolean
          group_name?: string | null
          guest_name?: string
          id?: string
          pets?: number
          phone?: string
          phone_country_code?: string | null
          rooms?: Json
          solo_traveller?: boolean
          special_requests?: string | null
          status?: string
          stay_id?: string | null
          tenant_id?: string
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "bookings_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "stays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_pricing: {
        Row: {
          available: number
          cooldown_minutes: number | null
          created_at: string
          date: string
          id: string
          is_blocked: boolean
          min_nights: number
          original_price: number
          price: number
          room_category_id: string | null
          stay_id: string
          tenant_id: string
        }
        Insert: {
          available?: number
          cooldown_minutes?: number | null
          created_at?: string
          date: string
          id?: string
          is_blocked?: boolean
          min_nights?: number
          original_price?: number
          price?: number
          room_category_id?: string | null
          stay_id: string
          tenant_id?: string
        }
        Update: {
          available?: number
          cooldown_minutes?: number | null
          created_at?: string
          date?: string
          id?: string
          is_blocked?: boolean
          min_nights?: number
          original_price?: number
          price?: number
          room_category_id?: string | null
          stay_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_pricing_room_category_id_fkey"
            columns: ["room_category_id"]
            isOneToOne: false
            referencedRelation: "room_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_pricing_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "stays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_pricing_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          applicable_stay_ids: Json | null
          code: string
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          max_discount: number | null
          min_purchase: number
          show_publicly: boolean
          starts_at: string | null
          tenant_id: string
          type: string
          usage_count: number
          usage_limit: number | null
          value: number
        }
        Insert: {
          active?: boolean
          applicable_stay_ids?: Json | null
          code: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          max_discount?: number | null
          min_purchase?: number
          show_publicly?: boolean
          starts_at?: string | null
          tenant_id?: string
          type?: string
          usage_count?: number
          usage_limit?: number | null
          value?: number
        }
        Update: {
          active?: boolean
          applicable_stay_ids?: Json | null
          code?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          max_discount?: number | null
          min_purchase?: number
          show_publicly?: boolean
          starts_at?: string | null
          tenant_id?: string
          type?: string
          usage_count?: number
          usage_limit?: number | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      features: {
        Row: {
          description: string
          feature_key: string
          feature_name: string
          id: string
          status: string
        }
        Insert: {
          description?: string
          feature_key: string
          feature_name: string
          id?: string
          status?: string
        }
        Update: {
          description?: string
          feature_key?: string
          feature_name?: string
          id?: string
          status?: string
        }
        Relationships: []
      }
      guest_wishlist: {
        Row: {
          created_at: string
          id: string
          session_id: string
          stay_id: string
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          stay_id: string
          tenant_id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          stay_id?: string
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_wishlist_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "stays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_wishlist_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_automation_config: {
        Row: {
          enabled: boolean
          settings: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          settings?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          settings?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_automation_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_automation_keyword_rules: {
        Row: {
          action: string
          case_sensitive: boolean
          channel: string
          conditions: Json | null
          created_at: string
          enabled: boolean
          id: string
          match: string
          match_type: string
          priority: number
          template_text: string | null
          tenant_id: string
          updated_at: string
          url: string | null
        }
        Insert: {
          action?: string
          case_sensitive?: boolean
          channel?: string
          conditions?: Json | null
          created_at?: string
          enabled?: boolean
          id?: string
          match: string
          match_type?: string
          priority?: number
          template_text?: string | null
          tenant_id: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          action?: string
          case_sensitive?: boolean
          channel?: string
          conditions?: Json | null
          created_at?: string
          enabled?: boolean
          id?: string
          match?: string
          match_type?: string
          priority?: number
          template_text?: string | null
          tenant_id?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_automation_keyword_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_automation_media_targets: {
        Row: {
          caption: string | null
          created_at: string
          enabled: boolean
          id: string
          ig_media_id: string
          media_product_type: string | null
          permalink: string | null
          tenant_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          ig_media_id: string
          media_product_type?: string | null
          permalink?: string | null
          tenant_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          ig_media_id?: string
          media_product_type?: string | null
          permalink?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_automation_media_targets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_automation_schedules: {
        Row: {
          campaigns: Json | null
          created_at: string
          enabled: boolean
          id: string
          quiet_hours: Json | null
          tenant_id: string
          timezone: string
          updated_at: string
          weekly_rules: Json
        }
        Insert: {
          campaigns?: Json | null
          created_at?: string
          enabled?: boolean
          id?: string
          quiet_hours?: Json | null
          tenant_id: string
          timezone?: string
          updated_at?: string
          weekly_rules?: Json
        }
        Update: {
          campaigns?: Json | null
          created_at?: string
          enabled?: boolean
          id?: string
          quiet_hours?: Json | null
          tenant_id?: string
          timezone?: string
          updated_at?: string
          weekly_rules?: Json
        }
        Relationships: [
          {
            foreignKeyName: "instagram_automation_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_automation_flows: {
        Row: {
          channel: string
          conditions_meta: Json
          created_at: string
          enabled: boolean
          flow_definition: Json
          id: string
          is_draft: boolean
          name: string
          tenant_id: string
          updated_at: string
          version: number
        }
        Insert: {
          channel?: string
          conditions_meta?: Json
          created_at?: string
          enabled?: boolean
          flow_definition?: Json
          id?: string
          is_draft?: boolean
          name?: string
          tenant_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          channel?: string
          conditions_meta?: Json
          created_at?: string
          enabled?: boolean
          flow_definition?: Json
          id?: string
          is_draft?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "instagram_automation_flows_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_flow_executions: {
        Row: {
          created_at: string
          event_type: string | null
          flow_id: string
          id: string
          meta: Json
          node_id: string
          passed: boolean | null
          result: string | null
          sender_ig_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          event_type?: string | null
          flow_id: string
          id?: string
          meta?: Json
          node_id: string
          passed?: boolean | null
          result?: string | null
          sender_ig_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          event_type?: string | null
          flow_id?: string
          id?: string
          meta?: Json
          node_id?: string
          passed?: boolean | null
          result?: string | null
          sender_ig_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_flow_executions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "instagram_automation_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_flow_executions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_channel_activity: {
        Row: {
          channel: string
          created_at: string
          event_type: string
          follower_check: string | null
          id: string
          latency_ms: number | null
          lead_id: string | null
          meta: Json | null
          sender_ig_id: string | null
          tenant_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          event_type?: string
          follower_check?: string | null
          id?: string
          latency_ms?: number | null
          lead_id?: string | null
          meta?: Json | null
          sender_ig_id?: string | null
          tenant_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          event_type?: string
          follower_check?: string | null
          id?: string
          latency_ms?: number | null
          lead_id?: string | null
          meta?: Json | null
          sender_ig_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_channel_activity_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_channel_activity_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_follower_cache: {
        Row: {
          checked_at: string
          follows: boolean | null
          id: string
          sender_ig_id: string
          tenant_id: string
        }
        Insert: {
          checked_at?: string
          follows?: boolean | null
          id?: string
          sender_ig_id: string
          tenant_id: string
        }
        Update: {
          checked_at?: string
          follows?: boolean | null
          id?: string
          sender_ig_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_follower_cache_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_webhook_events: {
        Row: {
          message_mid: string
          received_at: string
          tenant_id: string
        }
        Insert: {
          message_mid: string
          received_at?: string
          tenant_id: string
        }
        Update: {
          message_mid?: string
          received_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_webhook_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          addons: Json
          addons_total: number
          booking_id: string | null
          checkin: string | null
          checkout: string | null
          coupon_code: string | null
          created_at: string
          discount: number
          email: string
          guest_name: string
          id: string
          invoice_id: string
          payment_notes: string
          payment_status: string
          phone: string
          quotation_id: string | null
          room_total: number
          rooms: Json
          stay_id: string | null
          tenant_id: string
          total_price: number
          updated_at: string
        }
        Insert: {
          addons?: Json
          addons_total?: number
          booking_id?: string | null
          checkin?: string | null
          checkout?: string | null
          coupon_code?: string | null
          created_at?: string
          discount?: number
          email?: string
          guest_name: string
          id?: string
          invoice_id: string
          payment_notes?: string
          payment_status?: string
          phone?: string
          quotation_id?: string | null
          room_total?: number
          rooms?: Json
          stay_id?: string | null
          tenant_id?: string
          total_price?: number
          updated_at?: string
        }
        Update: {
          addons?: Json
          addons_total?: number
          booking_id?: string | null
          checkin?: string | null
          checkout?: string | null
          coupon_code?: string | null
          created_at?: string
          discount?: number
          email?: string
          guest_name?: string
          id?: string
          invoice_id?: string
          payment_notes?: string
          payment_status?: string
          phone?: string
          quotation_id?: string | null
          room_total?: number
          rooms?: Json
          stay_id?: string | null
          tenant_id?: string
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "stays"
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
      leads: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          message: string
          meta: Json
          phone: string
          source: string
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          email?: string
          full_name: string
          id?: string
          message?: string
          meta?: Json
          phone: string
          source?: string
          status?: string
          tenant_id?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          message?: string
          meta?: Json
          phone?: string
          source?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_items: {
        Row: {
          billing_interval: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          is_published: boolean
          manifest: Json
          name: string
          package_storage_path: string | null
          preview_image_url: string | null
          price: number
          pricing_model: string
          slug: string
          sort_order: number
          type: string
          updated_at: string
          version: string
        }
        Insert: {
          billing_interval?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_published?: boolean
          manifest?: Json
          name: string
          package_storage_path?: string | null
          preview_image_url?: string | null
          price?: number
          pricing_model?: string
          slug: string
          sort_order?: number
          type: string
          updated_at?: string
          version?: string
        }
        Update: {
          billing_interval?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_published?: boolean
          manifest?: Json
          name?: string
          package_storage_path?: string | null
          preview_image_url?: string | null
          price?: number
          pricing_model?: string
          slug?: string
          sort_order?: number
          type?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      media: {
        Row: {
          alt_text: string
          category: string
          created_at: string
          id: string
          stay_id: string | null
          tenant_id: string
          url: string
        }
        Insert: {
          alt_text?: string
          category?: string
          created_at?: string
          id?: string
          stay_id?: string | null
          tenant_id?: string
          url: string
        }
        Update: {
          alt_text?: string
          category?: string
          created_at?: string
          id?: string
          stay_id?: string | null
          tenant_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "stays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          name: string
          price: number | null
          sort_order: number | null
          tenant_id: string
        }
        Insert: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name: string
          price?: number | null
          sort_order?: number | null
          tenant_id?: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name?: string
          price?: number | null
          sort_order?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nearby_destinations: {
        Row: {
          created_at: string
          description: string
          distance: string
          id: string
          image: string
          maps_link: string
          name: string
          sort_order: number
          stay_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          distance?: string
          id?: string
          image?: string
          maps_link?: string
          name?: string
          sort_order?: number
          stay_id: string
          tenant_id?: string
        }
        Update: {
          created_at?: string
          description?: string
          distance?: string
          id?: string
          image?: string
          maps_link?: string
          name?: string
          sort_order?: number
          stay_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nearby_destinations_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "stays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nearby_destinations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          read: boolean
          ref_id: string | null
          tenant_id: string
          title: string
          type: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          ref_id?: string | null
          tenant_id?: string
          title: string
          type?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          ref_id?: string | null
          tenant_id?: string
          title?: string
          type?: string
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
      plan_features: {
        Row: {
          enabled: boolean
          feature_key: string
          id: string
          plan_id: string
        }
        Insert: {
          enabled?: boolean
          feature_key: string
          id?: string
          plan_id: string
        }
        Update: {
          enabled?: boolean
          feature_key?: string
          id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          billing_cycle: string
          created_at: string
          feature_flags: Json
          id: string
          max_ai_search: number
          max_bookings_per_month: number
          max_rooms: number
          max_stays: number
          plan_name: string
          price: number
          status: string
          trial_days: number | null
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          feature_flags?: Json
          id?: string
          max_ai_search?: number
          max_bookings_per_month?: number
          max_rooms?: number
          max_stays?: number
          plan_name: string
          price?: number
          status?: string
          trial_days?: number | null
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          feature_flags?: Json
          id?: string
          max_ai_search?: number
          max_bookings_per_month?: number
          max_rooms?: number
          max_stays?: number
          plan_name?: string
          price?: number
          status?: string
          trial_days?: number | null
        }
        Relationships: []
      }
      popup_settings: {
        Row: {
          background_color: string
          coupon_code: string
          created_at: string
          cta_link: string
          cta_text: string
          delay_seconds: number
          enabled: boolean
          id: string
          image_url: string
          message: string
          primary_color: string
          show_once: boolean
          stats_text: string
          subtitle: string
          template_type: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          background_color?: string
          coupon_code?: string
          created_at?: string
          cta_link?: string
          cta_text?: string
          delay_seconds?: number
          enabled?: boolean
          id?: string
          image_url?: string
          message?: string
          primary_color?: string
          show_once?: boolean
          stats_text?: string
          subtitle?: string
          template_type?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Update: {
          background_color?: string
          coupon_code?: string
          created_at?: string
          cta_link?: string
          cta_text?: string
          delay_seconds?: number
          enabled?: boolean
          id?: string
          image_url?: string
          message?: string
          primary_color?: string
          show_once?: boolean
          stats_text?: string
          subtitle?: string
          template_type?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "popup_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      property_features: {
        Row: {
          active: boolean
          created_at: string
          description: string
          icon_name: string
          id: string
          sort_order: number
          tenant_id: string
          title: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string
          icon_name?: string
          id?: string
          sort_order?: number
          tenant_id?: string
          title: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          icon_name?: string
          id?: string
          sort_order?: number
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_features_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          addons: Json
          addons_total: number
          booking_id: string | null
          checkin: string | null
          checkout: string | null
          coupon_code: string | null
          created_at: string
          discount: number
          email: string
          guest_name: string
          id: string
          notes: string
          phone: string
          quote_id: string
          room_total: number
          rooms: Json
          special_requests: string | null
          status: string
          stay_id: string | null
          tenant_id: string
          total_price: number
          updated_at: string
        }
        Insert: {
          addons?: Json
          addons_total?: number
          booking_id?: string | null
          checkin?: string | null
          checkout?: string | null
          coupon_code?: string | null
          created_at?: string
          discount?: number
          email?: string
          guest_name: string
          id?: string
          notes?: string
          phone?: string
          quote_id: string
          room_total?: number
          rooms?: Json
          special_requests?: string | null
          status?: string
          stay_id?: string | null
          tenant_id?: string
          total_price?: number
          updated_at?: string
        }
        Update: {
          addons?: Json
          addons_total?: number
          booking_id?: string | null
          checkin?: string | null
          checkout?: string | null
          coupon_code?: string | null
          created_at?: string
          discount?: number
          email?: string
          guest_name?: string
          id?: string
          notes?: string
          phone?: string
          quote_id?: string
          room_total?: number
          rooms?: Json
          special_requests?: string | null
          status?: string
          stay_id?: string | null
          tenant_id?: string
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "stays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          avatar_url: string | null
          comment: string
          created_at: string
          guest_name: string
          id: string
          photos: string[]
          rating: number
          status: string
          stay_id: string
          tenant_id: string
        }
        Insert: {
          avatar_url?: string | null
          comment?: string
          created_at?: string
          guest_name: string
          id?: string
          photos?: string[]
          rating?: number
          status?: string
          stay_id: string
          tenant_id?: string
        }
        Update: {
          avatar_url?: string | null
          comment?: string
          created_at?: string
          guest_name?: string
          id?: string
          photos?: string[]
          rating?: number
          status?: string
          stay_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "stays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      room_categories: {
        Row: {
          amenities: string[]
          available: number
          id: string
          images: string[]
          max_guests: number
          name: string
          original_price: number
          price: number
          stay_id: string
          tenant_id: string
        }
        Insert: {
          amenities?: string[]
          available?: number
          id?: string
          images?: string[]
          max_guests?: number
          name: string
          original_price?: number
          price?: number
          stay_id: string
          tenant_id?: string
        }
        Update: {
          amenities?: string[]
          available?: number
          id?: string
          images?: string[]
          max_guests?: number
          name?: string
          original_price?: number
          price?: number
          stay_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_categories_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "stays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_meta_platform_config: {
        Row: {
          app_secret_encrypted: string
          graph_api_version: string
          id: string
          instagram_app_id: string
          meta_app_id: string
          oauth_redirect_uri: string
          updated_at: string
          webhook_verify_token: string
        }
        Insert: {
          app_secret_encrypted?: string
          graph_api_version?: string
          id?: string
          instagram_app_id?: string
          meta_app_id?: string
          oauth_redirect_uri?: string
          updated_at?: string
          webhook_verify_token?: string
        }
        Update: {
          app_secret_encrypted?: string
          graph_api_version?: string
          id?: string
          instagram_app_id?: string
          meta_app_id?: string
          oauth_redirect_uri?: string
          updated_at?: string
          webhook_verify_token?: string
        }
        Relationships: []
      }
      saas_platform_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: string
          updated_at?: string
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          address: string
          auto_generate_invoice: boolean
          best_features_enabled: boolean
          best_features_title: string
          booking_enabled: boolean
          clarity_id: string | null
          contact_email: string
          contact_phone: string
          coupon_banner_enabled: boolean
          currency: string
          fb_pixel_id: string | null
          ga_id: string | null
          gcal_calendar_id: string
          gcal_enabled: boolean
          gcal_webhook_url: string
          id: string
          landing_theme_slug: string | null
          maintenance_mode: boolean
          menu_popup_enabled: boolean
          menu_popup_title: string
          meta_description: string
          meta_keywords: string
          meta_title: string
          og_description: string | null
          og_image_url: string | null
          og_title: string | null
          reels_enabled: boolean | null
          reels_section_title: string | null
          site_name: string
          social_facebook: string
          social_instagram: string
          social_youtube: string
          sticky_bottom_nav_enabled: boolean
          sticky_header_enabled: boolean
          sticky_menu_enabled: boolean
          sticky_menu_show_ai: boolean
          sticky_menu_show_explore: boolean
          sticky_menu_show_reels: boolean
          sticky_menu_show_wishlist: boolean
          stories_duration: number | null
          stories_enabled: boolean | null
          stories_section_title: string | null
          tenant_id: string
          theme_tokens: Json
          updated_at: string
          whatsapp_number: string
        }
        Insert: {
          address?: string
          auto_generate_invoice?: boolean
          best_features_enabled?: boolean
          best_features_title?: string
          booking_enabled?: boolean
          clarity_id?: string | null
          contact_email?: string
          contact_phone?: string
          coupon_banner_enabled?: boolean
          currency?: string
          fb_pixel_id?: string | null
          ga_id?: string | null
          gcal_calendar_id?: string
          gcal_enabled?: boolean
          gcal_webhook_url?: string
          id?: string
          landing_theme_slug?: string | null
          maintenance_mode?: boolean
          menu_popup_enabled?: boolean
          menu_popup_title?: string
          meta_description?: string
          meta_keywords?: string
          meta_title?: string
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          reels_enabled?: boolean | null
          reels_section_title?: string | null
          site_name?: string
          social_facebook?: string
          social_instagram?: string
          social_youtube?: string
          sticky_bottom_nav_enabled?: boolean
          sticky_header_enabled?: boolean
          sticky_menu_enabled?: boolean
          sticky_menu_show_ai?: boolean
          sticky_menu_show_explore?: boolean
          sticky_menu_show_reels?: boolean
          sticky_menu_show_wishlist?: boolean
          stories_duration?: number | null
          stories_enabled?: boolean | null
          stories_section_title?: string | null
          tenant_id?: string
          theme_tokens?: Json
          updated_at?: string
          whatsapp_number?: string
        }
        Update: {
          address?: string
          auto_generate_invoice?: boolean
          best_features_enabled?: boolean
          best_features_title?: string
          booking_enabled?: boolean
          clarity_id?: string | null
          contact_email?: string
          contact_phone?: string
          coupon_banner_enabled?: boolean
          currency?: string
          fb_pixel_id?: string | null
          ga_id?: string | null
          gcal_calendar_id?: string
          gcal_enabled?: boolean
          gcal_webhook_url?: string
          id?: string
          landing_theme_slug?: string | null
          maintenance_mode?: boolean
          menu_popup_enabled?: boolean
          menu_popup_title?: string
          meta_description?: string
          meta_keywords?: string
          meta_title?: string
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          reels_enabled?: boolean | null
          reels_section_title?: string | null
          site_name?: string
          social_facebook?: string
          social_instagram?: string
          social_youtube?: string
          sticky_bottom_nav_enabled?: boolean
          sticky_header_enabled?: boolean
          sticky_menu_enabled?: boolean
          sticky_menu_show_ai?: boolean
          sticky_menu_show_explore?: boolean
          sticky_menu_show_reels?: boolean
          sticky_menu_show_wishlist?: boolean
          stories_duration?: number | null
          stories_enabled?: boolean | null
          stories_section_title?: string | null
          tenant_id?: string
          theme_tokens?: Json
          updated_at?: string
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stay_addons: {
        Row: {
          created_at: string | null
          id: string
          name: string
          optional: boolean
          price: number
          sort_order: number
          stay_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          optional?: boolean
          price?: number
          sort_order?: number
          stay_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          optional?: boolean
          price?: number
          sort_order?: number
          stay_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stay_addons_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "stays"
            referencedColumns: ["id"]
          },
        ]
      }
      stay_categories: {
        Row: {
          active: boolean
          created_at: string
          icon: string
          id: string
          label: string
          sort_order: number
          tenant_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          icon?: string
          id?: string
          label: string
          sort_order?: number
          tenant_id?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          icon?: string
          id?: string
          label?: string
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stay_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stay_reels: {
        Row: {
          created_at: string
          id: string
          platform: string
          sort_order: number
          stay_id: string
          tenant_id: string
          thumbnail: string
          title: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform?: string
          sort_order?: number
          stay_id: string
          tenant_id?: string
          thumbnail?: string
          title?: string
          url?: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          sort_order?: number
          stay_id?: string
          tenant_id?: string
          thumbnail?: string
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "stay_reels_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "stays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stay_reels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stays: {
        Row: {
          amenities: string[]
          category: string
          cooldown_minutes: number | null
          created_at: string
          description: string
          id: string
          images: string[]
          location: string
          max_adults: number
          max_children: number
          max_pets: number
          name: string
          og_image_url: string | null
          original_price: number
          price: number
          rating: number
          reviews_count: number
          seo_description: string | null
          seo_keywords: string | null
          seo_title: string | null
          status: string
          stay_id: string
          tenant_id: string
        }
        Insert: {
          amenities?: string[]
          category?: string
          cooldown_minutes?: number | null
          created_at?: string
          description?: string
          id?: string
          images?: string[]
          location?: string
          max_adults?: number
          max_children?: number
          max_pets?: number
          name: string
          og_image_url?: string | null
          original_price?: number
          price?: number
          rating?: number
          reviews_count?: number
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          status?: string
          stay_id: string
          tenant_id?: string
        }
        Update: {
          amenities?: string[]
          category?: string
          cooldown_minutes?: number | null
          created_at?: string
          description?: string
          id?: string
          images?: string[]
          location?: string
          max_adults?: number
          max_children?: number
          max_pets?: number
          name?: string
          og_image_url?: string | null
          original_price?: number
          price?: number
          rating?: number
          reviews_count?: number
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          status?: string
          stay_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stays_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_cycle: string
          created_at: string
          id: string
          last_payment_id: string | null
          payment_gateway: string
          plan_id: string
          razorpay_subscription_id: string | null
          renewal_date: string | null
          scheduled_at: string | null
          scheduled_plan_id: string | null
          start_date: string
          status: string
          tenant_id: string
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          id?: string
          last_payment_id?: string | null
          payment_gateway?: string
          plan_id: string
          razorpay_subscription_id?: string | null
          renewal_date?: string | null
          scheduled_at?: string | null
          scheduled_plan_id?: string | null
          start_date?: string
          status?: string
          tenant_id: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          id?: string
          last_payment_id?: string | null
          payment_gateway?: string
          plan_id?: string
          razorpay_subscription_id?: string | null
          renewal_date?: string | null
          scheduled_at?: string | null
          scheduled_plan_id?: string | null
          start_date?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_scheduled_plan_id_fkey"
            columns: ["scheduled_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_domains: {
        Row: {
          auto_configured: boolean
          created_at: string
          custom_domain: string
          id: string
          registrar: string
          ssl_status: string
          subdomain: string
          tenant_id: string
          verified: boolean
        }
        Insert: {
          auto_configured?: boolean
          created_at?: string
          custom_domain?: string
          id?: string
          registrar?: string
          ssl_status?: string
          subdomain?: string
          tenant_id: string
          verified?: boolean
        }
        Update: {
          auto_configured?: boolean
          created_at?: string
          custom_domain?: string
          id?: string
          registrar?: string
          ssl_status?: string
          subdomain?: string
          tenant_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "tenant_domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_instagram_connections: {
        Row: {
          connected_at: string
          facebook_page_id: string
          id: string
          ig_username: string | null
          instagram_business_account_id: string
          page_access_token_encrypted: string
          tenant_id: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          connected_at?: string
          facebook_page_id: string
          id?: string
          ig_username?: string | null
          instagram_business_account_id: string
          page_access_token_encrypted: string
          tenant_id: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          connected_at?: string
          facebook_page_id?: string
          id?: string
          ig_username?: string | null
          instagram_business_account_id?: string
          page_access_token_encrypted?: string
          tenant_id?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_instagram_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_marketplace_installs: {
        Row: {
          config: Json
          id: string
          installed_at: string
          item_id: string
          razorpay_subscription_id: string | null
          status: string
          tenant_id: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          config?: Json
          id?: string
          installed_at?: string
          item_id: string
          razorpay_subscription_id?: string | null
          status?: string
          tenant_id: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          config?: Json
          id?: string
          installed_at?: string
          item_id?: string
          razorpay_subscription_id?: string | null
          status?: string
          tenant_id?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_marketplace_installs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "marketplace_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_marketplace_installs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_registrar_keys: {
        Row: {
          api_key: string
          api_secret: string
          created_at: string
          id: string
          registrar: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          api_key?: string
          api_secret?: string
          created_at?: string
          id?: string
          registrar?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          api_secret?: string
          created_at?: string
          id?: string
          registrar?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_registrar_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_usage: {
        Row: {
          ai_search_count: number
          bookings_this_month: number
          id: string
          last_reset: string
          rooms_created: number
          stays_created: number
          storage_used: number
          tenant_id: string
        }
        Insert: {
          ai_search_count?: number
          bookings_this_month?: number
          id?: string
          last_reset?: string
          rooms_created?: number
          stays_created?: number
          storage_used?: number
          tenant_id: string
        }
        Update: {
          ai_search_count?: number
          bookings_this_month?: number
          id?: string
          last_reset?: string
          rooms_created?: number
          stays_created?: number
          storage_used?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          domain: string
          email: string
          favicon_url: string | null
          footer_text: string | null
          id: string
          logo_url: string | null
          og_image_url: string | null
          owner_name: string
          phone: string
          phone_country_code: string | null
          plan_id: string | null
          primary_color: string | null
          secondary_color: string | null
          seo_description: string | null
          seo_keywords: string | null
          seo_title: string | null
          status: string
          tenant_name: string
          user_id: string | null
          is_platform: boolean
        }
        Insert: {
          created_at?: string
          domain?: string
          email?: string
          favicon_url?: string | null
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          og_image_url?: string | null
          owner_name?: string
          phone?: string
          phone_country_code?: string | null
          plan_id?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          status?: string
          tenant_name: string
          user_id?: string | null
          is_platform?: boolean
        }
        Update: {
          created_at?: string
          domain?: string
          email?: string
          favicon_url?: string | null
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          og_image_url?: string | null
          owner_name?: string
          phone?: string
          phone_country_code?: string | null
          plan_id?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          status?: string
          tenant_name?: string
          user_id?: string | null
          is_platform?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "tenants_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          marketplace_item_id: string | null
          metadata: Json | null
          payment_gateway: string
          payment_method: string
          status: string
          subscription_id: string | null
          tenant_id: string
          transaction_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          marketplace_item_id?: string | null
          metadata?: Json | null
          payment_gateway?: string
          payment_method?: string
          status?: string
          subscription_id?: string | null
          tenant_id: string
          transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          marketplace_item_id?: string | null
          metadata?: Json | null
          payment_gateway?: string
          payment_method?: string
          status?: string
          subscription_id?: string | null
          tenant_id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_marketplace_item_id_fkey"
            columns: ["marketplace_item_id"]
            isOneToOne: false
            referencedRelation: "marketplace_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_dates: {
        Row: {
          created_at: string
          end_date: string
          id: string
          price: number
          start_date: string
          status: string
          trip_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          price?: number
          start_date: string
          status?: string
          trip_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          price?: number
          start_date?: string
          status?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_dates_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_inclusions: {
        Row: {
          created_at: string
          description: string
          id: string
          sort_order: number
          trip_id: string
          type: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          sort_order?: number
          trip_id: string
          type: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          sort_order?: number
          trip_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_inclusions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_itinerary_days: {
        Row: {
          created_at: string
          day_number: number
          description: string | null
          id: string
          sort_order: number
          title: string
          trip_id: string
        }
        Insert: {
          created_at?: string
          day_number?: number
          description?: string | null
          id?: string
          sort_order?: number
          title?: string
          trip_id: string
        }
        Update: {
          created_at?: string
          day_number?: number
          description?: string | null
          id?: string
          sort_order?: number
          title?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_itinerary_days_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_other_info: {
        Row: {
          created_at: string
          id: string
          items: string[] | null
          section_title: string
          sort_order: number
          trip_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: string[] | null
          section_title?: string
          sort_order?: number
          trip_id: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: string[] | null
          section_title?: string
          sort_order?: number
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_other_info_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_reviews: {
        Row: {
          created_at: string
          id: string
          review_date: string | null
          review_text: string | null
          review_title: string
          reviewer_avatar: string | null
          reviewer_name: string
          sort_order: number
          trip_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          review_date?: string | null
          review_text?: string | null
          review_title?: string
          reviewer_avatar?: string | null
          reviewer_name?: string
          sort_order?: number
          trip_id: string
        }
        Update: {
          created_at?: string
          id?: string
          review_date?: string | null
          review_text?: string | null
          review_title?: string
          reviewer_avatar?: string | null
          reviewer_name?: string
          sort_order?: number
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_reviews_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_videos: {
        Row: {
          created_at: string
          id: string
          sort_order: number
          title: string | null
          trip_id: string
          youtube_url: string
        }
        Insert: {
          created_at?: string
          id?: string
          sort_order?: number
          title?: string | null
          trip_id: string
          youtube_url: string
        }
        Update: {
          created_at?: string
          id?: string
          sort_order?: number
          title?: string | null
          trip_id?: string
          youtube_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_videos_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          cancellation_policy: Json | null
          created_at: string
          cta_heading: string | null
          cta_image_url: string | null
          cta_subheading: string | null
          custom_tabs: Json
          default_adults: number
          description: string | null
          discount_label: string | null
          drop_location: string
          drop_map_url: string | null
          duration_days: number
          duration_nights: number
          id: string
          images: string[] | null
          max_adults: number
          max_children: number
          min_adults: number
          name: string
          original_price: number
          pickup_drop_location: string | null
          pickup_location: string
          pickup_map_url: string | null
          seo_description: string | null
          seo_keywords: string | null
          seo_title: string | null
          slug: string
          starting_price: number
          status: string
          tenant_id: string
        }
        Insert: {
          cancellation_policy?: Json | null
          created_at?: string
          cta_heading?: string | null
          cta_image_url?: string | null
          cta_subheading?: string | null
          custom_tabs?: Json
          default_adults?: number
          description?: string | null
          discount_label?: string | null
          drop_location?: string
          drop_map_url?: string | null
          duration_days?: number
          duration_nights?: number
          id?: string
          images?: string[] | null
          max_adults?: number
          max_children?: number
          min_adults?: number
          name: string
          original_price?: number
          pickup_drop_location?: string | null
          pickup_location?: string
          pickup_map_url?: string | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          slug: string
          starting_price?: number
          status?: string
          tenant_id?: string
        }
        Update: {
          cancellation_policy?: Json | null
          created_at?: string
          cta_heading?: string | null
          cta_image_url?: string | null
          cta_subheading?: string | null
          custom_tabs?: Json
          default_adults?: number
          description?: string | null
          discount_label?: string | null
          drop_location?: string
          drop_map_url?: string | null
          duration_days?: number
          duration_nights?: number
          id?: string
          images?: string[] | null
          max_adults?: number
          max_children?: number
          min_adults?: number
          name?: string
          original_price?: number
          pickup_drop_location?: string | null
          pickup_location?: string
          pickup_map_url?: string | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          slug?: string
          starting_price?: number
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_booking_availability: {
        Args: {
          p_checkin: string
          p_checkout: string
          p_exclude_booking_id?: string
          p_stay_id: string
        }
        Returns: {
          available: boolean
          conflict_reason: string
        }[]
      }
      create_booking_enquiry: {
        Args: {
          p_addons: Json
          p_adults?: number
          p_booking_id: string
          p_checkin: string
          p_checkout: string
          p_children?: number
          p_coupon_code: string
          p_email: string
          p_group_booking?: boolean
          p_group_name?: string
          p_guest_name: string
          p_pets?: number
          p_phone: string
          p_phone_country_code?: string
          p_rooms: Json
          p_solo_traveller?: boolean
          p_special_requests: string
          p_stay_id: string
          p_total_price: number
        }
        Returns: Json
      }
      get_my_tenant_id: { Args: never; Returns: string }
      get_platform_tenant_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_coupon_usage: {
        Args: { coupon_code_input: string }
        Returns: undefined
      }
      is_tenant_admin: { Args: { _tenant_id: string }; Returns: boolean }
      refresh_tenant_usage: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      resolve_stay_uuid: { Args: { _stay_id: string }; Returns: string }
      resolve_stay_uuid_flexible: {
        Args: { _stay_id: string; _stay_name: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "super_admin"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "super_admin"],
    },
  },
} as const
