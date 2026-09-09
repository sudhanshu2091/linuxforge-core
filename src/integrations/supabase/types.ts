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
      challenge_definitions: {
        Row: {
          created_at: string
          difficulty: number
          id: string
          objective: string
          prerequisites: string[]
          required_skills: string[]
          sequence_order: number
          story_intro: string
          title: string
          updated_at: string
          xp_reward: number
        }
        Insert: {
          created_at?: string
          difficulty?: number
          id: string
          objective: string
          prerequisites?: string[]
          required_skills?: string[]
          sequence_order: number
          story_intro: string
          title: string
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          created_at?: string
          difficulty?: number
          id?: string
          objective?: string
          prerequisites?: string[]
          required_skills?: string[]
          sequence_order?: number
          story_intro?: string
          title?: string
          updated_at?: string
          xp_reward?: number
        }
        Relationships: []
      }
      lab_command_events: {
        Row: {
          blocked_reason: string | null
          challenge_id: string | null
          created_at: string
          cwd_after: string
          cwd_before: string
          duration_ms: number
          exit_code: number
          id: string
          input: string
          lab_instance_id: string
          metadata: Json
          provider: string
          state_change_ref: Json
          stderr: string
          stdout: string
          user_id: string
        }
        Insert: {
          blocked_reason?: string | null
          challenge_id?: string | null
          created_at?: string
          cwd_after?: string
          cwd_before?: string
          duration_ms?: number
          exit_code?: number
          id?: string
          input: string
          lab_instance_id: string
          metadata?: Json
          provider: string
          state_change_ref?: Json
          stderr?: string
          stdout?: string
          user_id: string
        }
        Update: {
          blocked_reason?: string | null
          challenge_id?: string | null
          created_at?: string
          cwd_after?: string
          cwd_before?: string
          duration_ms?: number
          exit_code?: number
          id?: string
          input?: string
          lab_instance_id?: string
          metadata?: Json
          provider?: string
          state_change_ref?: Json
          stderr?: string
          stdout?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_command_events_lab_instance_id_fkey"
            columns: ["lab_instance_id"]
            isOneToOne: false
            referencedRelation: "lab_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_instances: {
        Row: {
          created_at: string
          environment_id: string
          expires_at: string | null
          id: string
          lab_id: string
          last_active_at: string
          metadata: Json
          provider: string
          snapshot_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          environment_id: string
          expires_at?: string | null
          id?: string
          lab_id: string
          last_active_at?: string
          metadata?: Json
          provider?: string
          snapshot_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          environment_id?: string
          expires_at?: string | null
          id?: string
          lab_id?: string
          last_active_at?: string
          metadata?: Json
          provider?: string
          snapshot_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_instances_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "learner_labs"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_world_objects: {
        Row: {
          active: boolean
          created_at: string
          created_by_challenge: string | null
          current_state: Json
          lab_id: string
          last_modified_by_challenge: string | null
          name: string
          object_id: string
          object_type: string
          path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by_challenge?: string | null
          current_state?: Json
          lab_id: string
          last_modified_by_challenge?: string | null
          name: string
          object_id?: string
          object_type: string
          path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by_challenge?: string | null
          current_state?: Json
          lab_id?: string
          last_modified_by_challenge?: string | null
          name?: string
          object_id?: string
          object_type?: string
          path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_world_objects_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "learner_labs"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_challenge_attempts: {
        Row: {
          attempts: number
          best_score: number
          challenge_id: string
          completed_at: string | null
          created_at: string
          evidence: Json
          id: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
          xp_awarded: number
        }
        Insert: {
          attempts?: number
          best_score?: number
          challenge_id: string
          completed_at?: string | null
          created_at?: string
          evidence?: Json
          id?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
          xp_awarded?: number
        }
        Update: {
          attempts?: number
          best_score?: number
          challenge_id?: string
          completed_at?: string | null
          created_at?: string
          evidence?: Json
          id?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
          xp_awarded?: number
        }
        Relationships: []
      }
      learner_challenge_events: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          kind: string
          payload: Json
          user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          user_id?: string
        }
        Relationships: []
      }
      learner_hint_usage: {
        Row: {
          challenge_id: string
          created_at: string
          hint_level: number
          id: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          hint_level: number
          id?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          hint_level?: number
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      learner_labs: {
        Row: {
          active: boolean
          created_at: string
          id: string
          lab_key: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          lab_key?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          lab_key?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      learner_preferences: {
        Row: {
          created_at: string
          id: string
          notify_achievements: boolean
          notify_daily_drill: boolean
          notify_email_digest: boolean
          notify_squad_activity: boolean
          notify_streak_risk: boolean
          preferred_tutor_language: Database["public"]["Enums"]["tutor_language"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notify_achievements?: boolean
          notify_daily_drill?: boolean
          notify_email_digest?: boolean
          notify_squad_activity?: boolean
          notify_streak_risk?: boolean
          preferred_tutor_language?: Database["public"]["Enums"]["tutor_language"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notify_achievements?: boolean
          notify_daily_drill?: boolean
          notify_email_digest?: boolean
          notify_squad_activity?: boolean
          notify_streak_risk?: boolean
          preferred_tutor_language?: Database["public"]["Enums"]["tutor_language"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      learner_profiles: {
        Row: {
          avatar_ref: string | null
          created_at: string
          display_name: string
          email: string
          id: string
          linux_comfort_level: Database["public"]["Enums"]["linux_comfort_level"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_ref?: string | null
          created_at?: string
          display_name: string
          email: string
          id?: string
          linux_comfort_level?: Database["public"]["Enums"]["linux_comfort_level"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_ref?: string | null
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          linux_comfort_level?: Database["public"]["Enums"]["linux_comfort_level"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      learner_progression: {
        Row: {
          challenges_completed: number
          created_at: string
          id: string
          labs_completed: number
          level: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          challenges_completed?: number
          created_at?: string
          id?: string
          labs_completed?: number
          level?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          challenges_completed?: number
          created_at?: string
          id?: string
          labs_completed?: number
          level?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      learner_skill_memory: {
        Row: {
          attempts: number
          confidence: number
          created_at: string
          hint_dependency: number
          id: string
          last_practiced: string | null
          mastery: number
          next_review: string | null
          recent_mistakes: string[]
          recent_score: number | null
          skill_id: string
          successful_attempts: number
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          confidence?: number
          created_at?: string
          hint_dependency?: number
          id?: string
          last_practiced?: string | null
          mastery?: number
          next_review?: string | null
          recent_mistakes?: string[]
          recent_score?: number | null
          skill_id: string
          successful_attempts?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          confidence?: number
          created_at?: string
          hint_dependency?: number
          id?: string
          last_practiced?: string | null
          mastery?: number
          next_review?: string | null
          recent_mistakes?: string[]
          recent_score?: number | null
          skill_id?: string
          successful_attempts?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      learning_narrative_events: {
        Row: {
          challenge_id: string | null
          created_at: string
          event_id: string
          event_type: string
          importance: number
          related_object_ids: string[]
          related_skill_ids: string[]
          summary: string
          user_id: string
        }
        Insert: {
          challenge_id?: string | null
          created_at?: string
          event_id?: string
          event_type: string
          importance?: number
          related_object_ids?: string[]
          related_skill_ids?: string[]
          summary: string
          user_id: string
        }
        Update: {
          challenge_id?: string | null
          created_at?: string
          event_id?: string
          event_type?: string
          importance?: number
          related_object_ids?: string[]
          related_skill_ids?: string[]
          summary?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      linux_comfort_level:
        | "Total beginner"
        | "Some terminal time"
        | "Comfortable, want depth"
      tutor_language: "English" | "Hinglish" | "Mix both"
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
      linux_comfort_level: [
        "Total beginner",
        "Some terminal time",
        "Comfortable, want depth",
      ],
      tutor_language: ["English", "Hinglish", "Mix both"],
    },
  },
} as const
