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
  public: {
    Tables: {
      accounting_transactions: {
        Row: {
          id: string
          tenant_id: string | null
          type: "income" | "expense" | "commission"
          category: string
          description: string
          amount: number
          date: string
          booking_id: string | null
          invoice_id: string | null
          quotation_id: string | null
          stay_id: string | null
          payment_method: string | null
          reference_number: string | null
          notes: string | null
          tags: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id?: string | null
          type: "income" | "expense" | "commission"
          category?: string
          description?: string
          amount: number
          date?: string
          booking_id?: string | null
          invoice_id?: string | null
          quotation_id?: string | null
          stay_id?: string | null
          payment_method?: string | null
          reference_number?: string | null
          notes?: string | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string | null
          type?: "income" | "expense" | "commission"
          category?: string
          description?: string
          amount?: number
          date?: string
          booking_id?: string | null
          invoice_id?: string | null
          quotation_id?: string | null
          stay_id?: string | null
          payment_method?: string | null
          reference_number?: string | null
          notes?: string | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      booking_ledger_entries: {
        Row: {
          id: string
          tenant_id: string | null
          booking_id: string
          label: string
          amount: number
          type: "income" | "expense" | "commission"
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id?: string | null
          booking_id: string
          label?: string
          amount?: number
          type?: "income" | "expense" | "commission"
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string | null
          booking_id?: string
          label?: string
          amount?: number
          type?: "income" | "expense" | "commission"
          notes?: string | null
          created_at?: string
        }
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          query: string
          results_count?: number
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          query?: string
          results_count?: number
          tenant_id?: string | null
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
          rooms: Json
          solo_traveller: boolean
          special_requests: string | null
          status: string
          stay_id: string | null
          tenant_id: string | null
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
          rooms?: Json
          solo_traveller?: boolean
          special_requests?: string | null
          status?: string
          stay_id?: string | null
          tenant_id?: string | null
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
          rooms?: Json
          solo_traveller?: boolean
          special_requests?: string | null
          status?: string
          stay_id?: string | null
          tenant_id?: string | null
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
          applicable_stay_ids: string[] | null
          code: string
          created_at: string
          description: string
          expires_at: string | null
          id: string
          max_discount: number | null
          min_purchase: number
          starts_at: string | null
          tenant_id: string | null
          type: string
          usage_count: number
          usage_limit: number | null
          value: number
          show_publicly: boolean
        }
        Insert: {
          active?: boolean
          applicable_stay_ids?: string[] | null
          code: string
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          max_discount?: number | null
          min_purchase?: number
          starts_at?: string | null
          tenant_id?: string | null
          type?: string
          usage_count?: number
          usage_limit?: number | null
          value?: number
          show_publicly?: boolean
        }
        Update: {
          active?: boolean
          applicable_stay_ids?: string[] | null
          code?: string
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          max_discount?: number | null
          min_purchase?: number
          starts_at?: string | null
          tenant_id?: string | null
          type?: string
          usage_count?: number
          usage_limit?: number | null
          value?: number
          show_publicly?: boolean
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
      media: {
        Row: {
          alt_text: string
          category: string
          created_at: string
          id: string
          stay_id: string | null
          tenant_id: string | null
          url: string
        }
        Insert: {
          alt_text?: string
          category?: string
          created_at?: string
          id?: string
          stay_id?: string | null
          tenant_id?: string | null
          url: string
        }
        Update: {
          alt_text?: string
          category?: string
          created_at?: string
          id?: string
          stay_id?: string | null
          tenant_id?: string | null
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
      nearby_destinations: {
        Row: {
          created_at: string
          distance: string
          id: string
          image: string
          name: string
          sort_order: number
          stay_id: string
        }
        Insert: {
          created_at?: string
          distance?: string
          id?: string
          image?: string
          name?: string
          sort_order?: number
          stay_id: string
        }
        Update: {
          created_at?: string
          distance?: string
          id?: string
          image?: string
          name?: string
          sort_order?: number
          stay_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nearby_destinations_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "stays"
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
          tenant_id: string | null
          title: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string
          icon_name?: string
          id?: string
          sort_order?: number
          tenant_id?: string | null
          title: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          icon_name?: string
          id?: string
          sort_order?: number
          tenant_id?: string | null
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
        }
        Relationships: []
      }
      quotations: {
        Row: {
          addons: Json
          addons_total: number
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
          tenant_id: string | null
          total_price: number
          updated_at: string
        }
        Insert: {
          addons?: Json
          addons_total?: number
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
          tenant_id?: string | null
          total_price?: number
          updated_at?: string
        }
        Update: {
          addons?: Json
          addons_total?: number
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
          tenant_id?: string | null
          total_price?: number
          updated_at?: string
        }
        Relationships: [
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
          best_features_enabled: boolean
          best_features_title: string
          booking_enabled: boolean
          clarity_id: string
          contact_email: string
          contact_phone: string
          coupon_banner_enabled: boolean
          currency: string
          fb_pixel_id: string
          ga_id: string
          gcal_calendar_id: string
          gcal_enabled: boolean
          gcal_webhook_url: string
          id: string
          maintenance_mode: boolean
          menu_popup_enabled: boolean
          menu_popup_title: string
          site_name: string
          social_facebook: string
          social_instagram: string
          social_youtube: string
          sticky_menu_enabled: boolean
          sticky_menu_show_ai: boolean
          sticky_menu_show_explore: boolean
          sticky_menu_show_reels: boolean
          sticky_menu_show_wishlist: boolean
          updated_at: string
          whatsapp_number: string
        }
        Insert: {
          address?: string
          best_features_enabled?: boolean
          best_features_title?: string
          booking_enabled?: boolean
          clarity_id?: string
          contact_email?: string
          contact_phone?: string
          coupon_banner_enabled?: boolean
          currency?: string
          fb_pixel_id?: string
          ga_id?: string
          gcal_calendar_id?: string
          gcal_enabled?: boolean
          gcal_webhook_url?: string
          id?: string
          maintenance_mode?: boolean
          menu_popup_enabled?: boolean
          menu_popup_title?: string
          site_name?: string
          social_facebook?: string
          social_instagram?: string
          social_youtube?: string
          sticky_menu_enabled?: boolean
          sticky_menu_show_ai?: boolean
          sticky_menu_show_explore?: boolean
          sticky_menu_show_reels?: boolean
          sticky_menu_show_wishlist?: boolean
          updated_at?: string
          whatsapp_number?: string
        }
        Update: {
          address?: string
          best_features_enabled?: boolean
          best_features_title?: string
          booking_enabled?: boolean
          clarity_id?: string
          contact_email?: string
          contact_phone?: string
          coupon_banner_enabled?: boolean
          currency?: string
          fb_pixel_id?: string
          ga_id?: string
          gcal_calendar_id?: string
          gcal_enabled?: boolean
          gcal_webhook_url?: string
          id?: string
          maintenance_mode?: boolean
          menu_popup_enabled?: boolean
          menu_popup_title?: string
          site_name?: string
          social_facebook?: string
          social_instagram?: string
          social_youtube?: string
          sticky_menu_enabled?: boolean
          sticky_menu_show_ai?: boolean
          sticky_menu_show_explore?: boolean
          sticky_menu_show_reels?: boolean
          sticky_menu_show_wishlist?: boolean
          updated_at?: string
          whatsapp_number?: string
        }
        Relationships: []
      }
      stay_categories: {
        Row: {
          active: boolean
          created_at: string
          icon: string
          id: string
          label: string
          sort_order: number
          tenant_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          icon?: string
          id?: string
          label: string
          sort_order?: number
          tenant_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          icon?: string
          id?: string
          label?: string
          sort_order?: number
          tenant_id?: string | null
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
        ]
      }
      stays: {
        Row: {
          amenities: string[]
          category: string
          cooldown_minutes: number
          created_at: string
          description: string
          id: string
          images: string[]
          location: string
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
          tenant_id: string | null
        }
        Insert: {
          amenities?: string[]
          category?: string
          cooldown_minutes?: number
          created_at?: string
          description?: string
          id?: string
          images?: string[]
          location?: string
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
          tenant_id?: string | null
        }
        Update: {
          amenities?: string[]
          category?: string
          cooldown_minutes?: number
          created_at?: string
          description?: string
          id?: string
          images?: string[]
          location?: string
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
          tenant_id?: string | null
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
          plan_id: string | null
          primary_color: string | null
          secondary_color: string | null
          seo_description: string | null
          seo_keywords: string | null
          seo_title: string | null
          status: string
          tenant_name: string
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
          plan_id?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          status?: string
          tenant_name: string
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
          plan_id?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          status?: string
          tenant_name?: string
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
          payment_gateway?: string
          payment_method?: string
          status?: string
          subscription_id?: string | null
          tenant_id?: string
          transaction_id?: string
        }
        Relationships: [
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "super_admin"],
    },
  },
} as const
