export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      bot_connection_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          platform: string
          updated_at: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          platform: string
          updated_at?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          platform?: string
          updated_at?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      connected_bots: {
        Row: {
          connected_at: string
          created_at: string
          id: string
          is_active: boolean
          last_activity: string | null
          platform: string
          platform_user_id: string
          platform_username: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          connected_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_activity?: string | null
          platform: string
          platform_user_id: string
          platform_username?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          connected_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_activity?: string | null
          platform?: string
          platform_user_id?: string
          platform_username?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      family_members: {
        Row: {
          age: number | null
          created_at: string
          english_preference: number | null
          id: string
          interests: string[] | null
          is_active: boolean
          learning_level: string
          name: string
          name_variants: string[] | null
          role: string
          spanish_preference: number | null
          tone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          created_at?: string
          english_preference?: number | null
          id?: string
          interests?: string[] | null
          is_active?: boolean
          learning_level?: string
          name: string
          name_variants?: string[] | null
          role: string
          spanish_preference?: number | null
          tone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          created_at?: string
          english_preference?: number | null
          id?: string
          interests?: string[] | null
          is_active?: boolean
          learning_level?: string
          name?: string
          name_variants?: string[] | null
          role?: string
          spanish_preference?: number | null
          tone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          updated_at?: string
        }
        Relationships: []
      }
      learning_modules: {
        Row: {
          category: string
          created_at: string
          description: string | null
          difficulty_level: string
          estimated_duration_minutes: number | null
          id: string
          is_active: boolean
          lesson_content: Json
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          difficulty_level?: string
          estimated_duration_minutes?: number | null
          id?: string
          is_active?: boolean
          lesson_content?: Json
          order_index?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          difficulty_level?: string
          estimated_duration_minutes?: number | null
          id?: string
          is_active?: boolean
          lesson_content?: Json
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      learning_sessions: {
        Row: {
          completed_at: string
          content: Json
          created_at: string
          duration_minutes: number | null
          emotional_tone: string | null
          id: string
          progress_data: Json
          session_type: string
          source: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          content?: Json
          created_at?: string
          duration_minutes?: number | null
          emotional_tone?: string | null
          id?: string
          progress_data?: Json
          session_type: string
          source: string
          user_id: string
        }
        Update: {
          completed_at?: string
          content?: Json
          created_at?: string
          duration_minutes?: number | null
          emotional_tone?: string | null
          id?: string
          progress_data?: Json
          session_type?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      learning_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_activity_date: string
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          learning_level: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          learning_level?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          learning_level?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_rewards: {
        Row: {
          created_at: string
          granted_at: string
          id: string
          referral_id: string
          reward_description: string
          reward_type: string
          reward_value: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_at?: string
          id?: string
          referral_id: string
          reward_description: string
          reward_type: string
          reward_value?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          granted_at?: string
          id?: string
          referral_id?: string
          reward_description?: string
          reward_type?: string
          reward_value?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          converted_at: string | null
          created_at: string
          id: string
          referral_code: string
          referred_user_id: string | null
          referrer_user_id: string
          reward_granted: boolean
          updated_at: string
        }
        Insert: {
          converted_at?: string | null
          created_at?: string
          id?: string
          referral_code: string
          referred_user_id?: string | null
          referrer_user_id: string
          reward_granted?: boolean
          updated_at?: string
        }
        Update: {
          converted_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_user_id?: string | null
          referrer_user_id?: string
          reward_granted?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      usage_tracking: {
        Row: {
          created_at: string
          date: string
          feature_type: string
          id: string
          usage_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          feature_type: string
          id?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          feature_type?: string
          id?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_description: string | null
          achievement_title: string
          achievement_type: string
          badge_icon: string | null
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_description?: string | null
          achievement_title: string
          achievement_type: string
          badge_icon?: string | null
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_description?: string | null
          achievement_title?: string
          achievement_type?: string
          badge_icon?: string | null
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_module_progress: {
        Row: {
          completed_at: string | null
          confidence_score: number | null
          created_at: string
          id: string
          is_completed: boolean
          module_id: string
          progress_percentage: number
          time_spent_minutes: number | null
          updated_at: string
          user_id: string
          vocabulary_learned: string[] | null
        }
        Insert: {
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          is_completed?: boolean
          module_id: string
          progress_percentage?: number
          time_spent_minutes?: number | null
          updated_at?: string
          user_id: string
          vocabulary_learned?: string[] | null
        }
        Update: {
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          is_completed?: boolean
          module_id?: string
          progress_percentage?: number
          time_spent_minutes?: number | null
          updated_at?: string
          user_id?: string
          vocabulary_learned?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "user_module_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "learning_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          paypal_subscription_id: string | null
          plan_type: string
          status: string
          subscription_id: string
          trial_end: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          paypal_subscription_id?: string | null
          plan_type?: string
          status?: string
          subscription_id: string
          trial_end?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          paypal_subscription_id?: string | null
          plan_type?: string
          status?: string
          subscription_id?: string
          trial_end?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_connection_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_referral_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_subscription_status: {
        Args: { user_uuid: string }
        Returns: {
          status: string
          plan_type: string
          trial_days_left: number
          is_trial_active: boolean
          is_subscription_active: boolean
        }[]
      }
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
    Enums: {},
  },
} as const
