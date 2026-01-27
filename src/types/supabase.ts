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
          is_video: boolean
          video_duration: number | null
          creative_elements: string[]
          in_swipe_file: boolean
          scoring: Json | null
          thumbnail_url: string | null
          video_url: string | null
          is_active: boolean
          last_seen_at: string
          created_at: string
          updated_at: string
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
          is_video?: boolean
          video_duration?: number | null
          creative_elements?: string[]
          in_swipe_file?: boolean
          scoring?: Json | null
          thumbnail_url?: string | null
          video_url?: string | null
          is_active?: boolean
          last_seen_at?: string
          created_at?: string
          updated_at?: string
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
          is_video?: boolean
          video_duration?: number | null
          creative_elements?: string[]
          in_swipe_file?: boolean
          scoring?: Json | null
          thumbnail_url?: string | null
          video_url?: string | null
          is_active?: boolean
          last_seen_at?: string
          created_at?: string
          updated_at?: string
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
      brand_subscriptions: {
        Row: {
          id: string
          brand_id: string
          user_id: string
          stripe_subscription_id: string
          competitor_limit: number
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          user_id: string
          stripe_subscription_id: string
          competitor_limit?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          user_id?: string
          stripe_subscription_id?: string
          competitor_limit?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_subscriptions_brand_id_fkey"
            columns: ["brand_id"]
            referencedRelation: "client_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_subscriptions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
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
          competitor_limit: number
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
          competitor_limit?: number
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
          competitor_limit?: number
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
