export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      client_brands: {
        Row: {
          id: string
          user_id: string
          name: string
          logo: string
          industry: string
          color: string
          ads_library_url: string | null
          created_at: string
          last_updated: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          logo?: string
          industry: string
          color?: string
          ads_library_url?: string | null
          created_at?: string
          last_updated?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          logo?: string
          industry?: string
          color?: string
          ads_library_url?: string | null
          created_at?: string
          last_updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_brands_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      competitors: {
        Row: {
          id: string
          brand_id: string
          user_id: string | null
          name: string
          logo: string
          url: string | null
          total_ads: number
          avg_ads_per_week: number
          last_synced_at: string | null
          created_at: string
          track: string | null
          track_classified_at: string | null
          new_ads_30d: number | null
          total_ads_launched_30d: number | null
          survived_14d: number | null
          survival_rate: number | null
        }
        Insert: {
          id?: string
          brand_id: string
          user_id?: string | null
          name: string
          logo?: string
          url?: string | null
          total_ads?: number
          avg_ads_per_week?: number
          last_synced_at?: string | null
          created_at?: string
          track?: string | null
          track_classified_at?: string | null
          new_ads_30d?: number | null
          total_ads_launched_30d?: number | null
          survived_14d?: number | null
          survival_rate?: number | null
        }
        Update: {
          id?: string
          brand_id?: string
          user_id?: string | null
          name?: string
          logo?: string
          url?: string | null
          total_ads?: number
          avg_ads_per_week?: number
          last_synced_at?: string | null
          created_at?: string
          track?: string | null
          track_classified_at?: string | null
          new_ads_30d?: number | null
          total_ads_launched_30d?: number | null
          survived_14d?: number | null
          survival_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "competitors_brand_id_fkey"
            columns: ["brand_id"]
            referencedRelation: "client_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitors_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      ads: {
        Row: {
          id: string
          user_id: string
          client_brand_id: string
          competitor_id: string
          competitor_name: string
          competitor_logo: string
          format: string
          days_active: number
          variation_count: number
          launch_date: string
          hook_text: string | null
          headline: string | null
          primary_text: string | null
          cta: string | null
          hook_type: string | null
          emotional_angle: string | null
          narrative_structure: string | null
          opening_strategy: string | null
          visual_elements: Json
          passes_filter: boolean
          is_video: boolean
          video_duration: number | null
          creative_elements: string[]
          in_swipe_file: boolean
          scoring: Json | null
          thumbnail_url: string | null
          video_url: string | null
          is_active: boolean
          is_client_ad: boolean
          last_seen_at: string
          created_at: string
          updated_at: string
          image_hash: string | null
          tagging_status: string | null
          tagging_retry_count: number | null
          tagging_last_error: string | null
          tagging_attempted_at: string | null
          video_tagging_status: string | null
          video_tagging_retry_count: number | null
          video_tagging_last_error: string | null
          video_tagging_attempted_at: string | null
          transcript: string | null
          transcript_word_count: number | null
          competitor_track: string | null
          signal_strength: number | null
        }
        Insert: {
          id: string
          user_id: string
          client_brand_id: string
          competitor_id: string
          competitor_name: string
          competitor_logo?: string
          format: string
          days_active?: number
          variation_count?: number
          launch_date: string
          hook_text?: string | null
          headline?: string | null
          primary_text?: string | null
          cta?: string | null
          hook_type?: string | null
          emotional_angle?: string | null
          narrative_structure?: string | null
          opening_strategy?: string | null
          visual_elements?: Json
          passes_filter?: boolean
          is_video?: boolean
          video_duration?: number | null
          creative_elements?: string[]
          in_swipe_file?: boolean
          scoring?: Json | null
          thumbnail_url?: string | null
          video_url?: string | null
          is_active?: boolean
          is_client_ad?: boolean
          last_seen_at?: string
          created_at?: string
          updated_at?: string
          image_hash?: string | null
          tagging_status?: string | null
          tagging_retry_count?: number | null
          tagging_last_error?: string | null
          tagging_attempted_at?: string | null
          video_tagging_status?: string | null
          video_tagging_retry_count?: number | null
          video_tagging_last_error?: string | null
          video_tagging_attempted_at?: string | null
          transcript?: string | null
          transcript_word_count?: number | null
          competitor_track?: string | null
          signal_strength?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          client_brand_id?: string
          competitor_id?: string
          competitor_name?: string
          competitor_logo?: string
          format?: string
          days_active?: number
          variation_count?: number
          launch_date?: string
          hook_text?: string | null
          headline?: string | null
          primary_text?: string | null
          cta?: string | null
          hook_type?: string | null
          emotional_angle?: string | null
          narrative_structure?: string | null
          opening_strategy?: string | null
          visual_elements?: Json
          passes_filter?: boolean
          is_video?: boolean
          video_duration?: number | null
          creative_elements?: string[]
          in_swipe_file?: boolean
          scoring?: Json | null
          thumbnail_url?: string | null
          video_url?: string | null
          is_active?: boolean
          is_client_ad?: boolean
          last_seen_at?: string
          created_at?: string
          updated_at?: string
          image_hash?: string | null
          tagging_status?: string | null
          tagging_retry_count?: number | null
          tagging_last_error?: string | null
          tagging_attempted_at?: string | null
          video_tagging_status?: string | null
          video_tagging_retry_count?: number | null
          video_tagging_last_error?: string | null
          video_tagging_attempted_at?: string | null
          transcript?: string | null
          transcript_word_count?: number | null
          competitor_track?: string | null
          signal_strength?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ads_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_client_brand_id_fkey"
            columns: ["client_brand_id"]
            referencedRelation: "client_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_competitor_id_fkey"
            columns: ["competitor_id"]
            referencedRelation: "competitors"
            referencedColumns: ["id"]
          }
        ]
      }
      ad_analyses: {
        Row: {
          id: string
          ad_id: string
          user_id: string
          analysis: Json
          analyzed_at: string
        }
        Insert: {
          id?: string
          ad_id: string
          user_id: string
          analysis: Json
          analyzed_at?: string
        }
        Update: {
          id?: string
          ad_id?: string
          user_id?: string
          analysis?: Json
          analyzed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_analyses_ad_id_fkey"
            columns: ["ad_id"]
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_analyses_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      hook_analyses: {
        Row: {
          id: string
          brand_id: string
          user_id: string
          analysis: Json
          analyzed_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          user_id: string
          analysis: Json
          analyzed_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          user_id?: string
          analysis?: Json
          analyzed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hook_analyses_brand_id_fkey"
            columns: ["brand_id"]
            referencedRelation: "client_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hook_analyses_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      trend_analyses: {
        Row: {
          id: string
          brand_id: string
          user_id: string
          trends: Json
          summary: Json | null
          ads_count: number | null
          analyzed_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          user_id: string
          trends: Json
          summary?: Json | null
          ads_count?: number | null
          analyzed_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          user_id?: string
          trends?: Json
          summary?: Json | null
          ads_count?: number | null
          analyzed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trend_analyses_brand_id_fkey"
            columns: ["brand_id"]
            referencedRelation: "client_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trend_analyses_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      meta_connections: {
        Row: {
          id: string
          user_id: string
          client_brand_id: string
          access_token: string
          token_expires_at: string | null
          ad_account_id: string | null
          ad_account_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          client_brand_id: string
          access_token: string
          token_expires_at?: string | null
          ad_account_id?: string | null
          ad_account_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          client_brand_id?: string
          access_token?: string
          token_expires_at?: string | null
          ad_account_id?: string | null
          ad_account_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_connections_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_connections_client_brand_id_fkey"
            columns: ["client_brand_id"]
            referencedRelation: "client_brands"
            referencedColumns: ["id"]
          }
        ]
      }
      client_ads: {
        Row: {
          id: string
          user_id: string
          client_brand_id: string
          meta_ad_id: string
          name: string | null
          status: string | null
          effective_status: string | null
          thumbnail_url: string | null
          image_url: string | null
          body: string | null
          title: string | null
          impressions: number
          clicks: number
          spend: number
          ctr: number
          cpc: number
          cpm: number
          conversions: number
          revenue: number
          roas: number
          cpa: number
          emotional_angle: string | null
          narrative_structure: string | null
          synced_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          client_brand_id: string
          meta_ad_id: string
          name?: string | null
          status?: string | null
          effective_status?: string | null
          thumbnail_url?: string | null
          image_url?: string | null
          body?: string | null
          title?: string | null
          impressions?: number
          clicks?: number
          spend?: number
          ctr?: number
          cpc?: number
          cpm?: number
          conversions?: number
          revenue?: number
          roas?: number
          cpa?: number
          emotional_angle?: string | null
          narrative_structure?: string | null
          synced_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          client_brand_id?: string
          meta_ad_id?: string
          name?: string | null
          status?: string | null
          effective_status?: string | null
          thumbnail_url?: string | null
          image_url?: string | null
          body?: string | null
          title?: string | null
          impressions?: number
          clicks?: number
          spend?: number
          ctr?: number
          cpc?: number
          cpm?: number
          conversions?: number
          revenue?: number
          roas?: number
          cpa?: number
          emotional_angle?: string | null
          narrative_structure?: string | null
          synced_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_ads_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_ads_client_brand_id_fkey"
            columns: ["client_brand_id"]
            referencedRelation: "client_brands"
            referencedColumns: ["id"]
          }
        ]
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          status: string
          brand_quantity: number
          competitor_quantity: number
          current_period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: string
          brand_quantity?: number
          competitor_quantity?: number
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: string
          brand_quantity?: number
          competitor_quantity?: number
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      creative_tags: {
        Row: {
          id: string
          ad_id: string
          format_type: string | null
          hook_type_visual: string | null
          human_presence: string | null
          text_overlay_density: string | null
          text_overlay_position: string | null
          color_temperature: string | null
          background_style: string | null
          product_visibility: string | null
          cta_visual_style: string | null
          visual_composition: string | null
          brand_element_presence: string | null
          emotion_energy_level: string | null
          model_version: string
          source: string
          source_ad_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          ad_id: string
          format_type?: string | null
          hook_type_visual?: string | null
          human_presence?: string | null
          text_overlay_density?: string | null
          text_overlay_position?: string | null
          color_temperature?: string | null
          background_style?: string | null
          product_visibility?: string | null
          cta_visual_style?: string | null
          visual_composition?: string | null
          brand_element_presence?: string | null
          emotion_energy_level?: string | null
          model_version: string
          source: string
          source_ad_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          ad_id?: string
          format_type?: string | null
          hook_type_visual?: string | null
          human_presence?: string | null
          text_overlay_density?: string | null
          text_overlay_position?: string | null
          color_temperature?: string | null
          background_style?: string | null
          product_visibility?: string | null
          cta_visual_style?: string | null
          visual_composition?: string | null
          brand_element_presence?: string | null
          emotion_energy_level?: string | null
          model_version?: string
          source?: string
          source_ad_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creative_tags_ad_id_fkey"
            columns: ["ad_id"]
            referencedRelation: "ads"
            referencedColumns: ["id"]
          }
        ]
      }
      tagging_cost_log: {
        Row: {
          id: string
          ad_id: string | null
          model: string
          input_tokens: number
          output_tokens: number
          estimated_cost_usd: number
          duration_ms: number
          success: boolean
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          ad_id?: string | null
          model: string
          input_tokens: number
          output_tokens: number
          estimated_cost_usd: number
          duration_ms: number
          success: boolean
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          ad_id?: string | null
          model?: string
          input_tokens?: number
          output_tokens?: number
          estimated_cost_usd?: number
          duration_ms?: number
          success?: boolean
          error_message?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tagging_cost_log_ad_id_fkey"
            columns: ["ad_id"]
            referencedRelation: "ads"
            referencedColumns: ["id"]
          }
        ]
      }
      video_tags: {
        Row: {
          id: string
          ad_id: string
          hook_format_type: string | null
          hook_hook_type_visual: string | null
          hook_human_presence: string | null
          hook_text_overlay_density: string | null
          hook_text_overlay_position: string | null
          hook_color_temperature: string | null
          hook_background_style: string | null
          hook_product_visibility: string | null
          hook_cta_visual_style: string | null
          hook_visual_composition: string | null
          hook_brand_element_presence: string | null
          hook_emotion_energy_level: string | null
          script_structure: string | null
          verbal_hook_type: string | null
          pacing: string | null
          audio_style: string | null
          video_duration_bucket: string | null
          narrative_arc: string | null
          opening_frame: string | null
          visual_shifts: Json
          keyframe_count: number
          model_version: string
          transcription_model: string | null
          transcription_duration_ms: number | null
          created_at: string
        }
        Insert: {
          id?: string
          ad_id: string
          hook_format_type?: string | null
          hook_hook_type_visual?: string | null
          hook_human_presence?: string | null
          hook_text_overlay_density?: string | null
          hook_text_overlay_position?: string | null
          hook_color_temperature?: string | null
          hook_background_style?: string | null
          hook_product_visibility?: string | null
          hook_cta_visual_style?: string | null
          hook_visual_composition?: string | null
          hook_brand_element_presence?: string | null
          hook_emotion_energy_level?: string | null
          script_structure?: string | null
          verbal_hook_type?: string | null
          pacing?: string | null
          audio_style?: string | null
          video_duration_bucket?: string | null
          narrative_arc?: string | null
          opening_frame?: string | null
          visual_shifts?: Json
          keyframe_count?: number
          model_version: string
          transcription_model?: string | null
          transcription_duration_ms?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          ad_id?: string
          hook_format_type?: string | null
          hook_hook_type_visual?: string | null
          hook_human_presence?: string | null
          hook_text_overlay_density?: string | null
          hook_text_overlay_position?: string | null
          hook_color_temperature?: string | null
          hook_background_style?: string | null
          hook_product_visibility?: string | null
          hook_cta_visual_style?: string | null
          hook_visual_composition?: string | null
          hook_brand_element_presence?: string | null
          hook_emotion_energy_level?: string | null
          script_structure?: string | null
          verbal_hook_type?: string | null
          pacing?: string | null
          audio_style?: string | null
          video_duration_bucket?: string | null
          narrative_arc?: string | null
          opening_frame?: string | null
          visual_shifts?: Json
          keyframe_count?: number
          model_version?: string
          transcription_model?: string | null
          transcription_duration_ms?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_tags_ad_id_fkey"
            columns: ["ad_id"]
            referencedRelation: "ads"
            referencedColumns: ["id"]
          }
        ]
      }
      video_tagging_cost_log: {
        Row: {
          id: string
          ad_id: string | null
          model: string
          input_tokens: number
          output_tokens: number
          estimated_cost_usd: number
          duration_ms: number
          success: boolean
          error_message: string | null
          stage: string | null
          audio_seconds: number
          created_at: string
        }
        Insert: {
          id?: string
          ad_id?: string | null
          model: string
          input_tokens: number
          output_tokens: number
          estimated_cost_usd: number
          duration_ms: number
          success: boolean
          error_message?: string | null
          stage?: string | null
          audio_seconds?: number
          created_at?: string
        }
        Update: {
          id?: string
          ad_id?: string | null
          model?: string
          input_tokens?: number
          output_tokens?: number
          estimated_cost_usd?: number
          duration_ms?: number
          success?: boolean
          error_message?: string | null
          stage?: string | null
          audio_seconds?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_tagging_cost_log_ad_id_fkey"
            columns: ["ad_id"]
            referencedRelation: "ads"
            referencedColumns: ["id"]
          }
        ]
      }
      convergence_snapshots: {
        Row: {
          id: string
          brand_id: string
          snapshot_date: string
          dimension: string
          value: string
          convergence_ratio: number
          adjusted_score: number
          classification: string
          cross_track: boolean
          confidence: number
          competitors_increasing: number
          total_competitors: number
          track_a_increasing: number
          track_b_increasing: number
          competitor_details: Json
          is_new_alert: boolean
          created_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          snapshot_date: string
          dimension: string
          value: string
          convergence_ratio: number
          adjusted_score: number
          classification: string
          cross_track?: boolean
          confidence: number
          competitors_increasing: number
          total_competitors: number
          track_a_increasing?: number
          track_b_increasing?: number
          competitor_details?: Json
          is_new_alert?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          snapshot_date?: string
          dimension?: string
          value?: string
          convergence_ratio?: number
          adjusted_score?: number
          classification?: string
          cross_track?: boolean
          confidence?: number
          competitors_increasing?: number
          total_competitors?: number
          track_a_increasing?: number
          track_b_increasing?: number
          competitor_details?: Json
          is_new_alert?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "convergence_snapshots_brand_id_fkey"
            columns: ["brand_id"]
            referencedRelation: "client_brands"
            referencedColumns: ["id"]
          }
        ]
      }
      track_change_log: {
        Row: {
          id: string
          competitor_id: string
          previous_track: string | null
          new_track: string
          new_ads_30d: number
          survival_rate: number | null
          changed_at: string
        }
        Insert: {
          id?: string
          competitor_id: string
          previous_track?: string | null
          new_track: string
          new_ads_30d: number
          survival_rate?: number | null
          changed_at?: string
        }
        Update: {
          id?: string
          competitor_id?: string
          previous_track?: string | null
          new_track?: string
          new_ads_30d?: number
          survival_rate?: number | null
          changed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_change_log_competitor_id_fkey"
            columns: ["competitor_id"]
            referencedRelation: "competitors"
            referencedColumns: ["id"]
          }
        ]
      }
      velocity_snapshots: {
        Row: {
          id: string
          brand_id: string
          snapshot_date: string
          period_start: string
          period_end: string
          track_filter: string
          dimension: string
          value: string
          weighted_prevalence: number
          ad_count: number
          total_signal_strength: number
          created_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          snapshot_date: string
          period_start: string
          period_end: string
          track_filter: string
          dimension: string
          value: string
          weighted_prevalence: number
          ad_count: number
          total_signal_strength: number
          created_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          snapshot_date?: string
          period_start?: string
          period_end?: string
          track_filter?: string
          dimension?: string
          value?: string
          weighted_prevalence?: number
          ad_count?: number
          total_signal_strength?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "velocity_snapshots_brand_id_fkey"
            columns: ["brand_id"]
            referencedRelation: "client_brands"
            referencedColumns: ["id"]
          }
        ]
      }
      playbooks: {
        Row: {
          id: string
          brand_id: string
          user_id: string
          title: string
          generated_at: string
          my_patterns_included: boolean
          competitor_trends_count: number
          competitor_ads_count: number
          content: Json
          share_token: string
          is_public: boolean
          share_expires_at: string | null
          status: string
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          user_id: string
          title: string
          generated_at?: string
          my_patterns_included?: boolean
          competitor_trends_count?: number
          competitor_ads_count?: number
          content: Json
          share_token?: string
          is_public?: boolean
          share_expires_at?: string | null
          status?: string
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          user_id?: string
          title?: string
          generated_at?: string
          my_patterns_included?: boolean
          competitor_trends_count?: number
          competitor_ads_count?: number
          content?: Json
          share_token?: string
          is_public?: boolean
          share_expires_at?: string | null
          status?: string
          error_message?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbooks_brand_id_fkey"
            columns: ["brand_id"]
            referencedRelation: "client_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbooks_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
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

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
