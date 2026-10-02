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
      attendance_logs: {
        Row: {
          id: string
          reason: string | null
          reg_number: string | null
          scanned_at: string
          session: Database["public"]["Enums"]["meal_session"]
          session_date: string
          staff_id: string | null
          status: Database["public"]["Enums"]["scan_status"]
          student_id: string | null
        }
        Insert: {
          id?: string
          reason?: string | null
          reg_number?: string | null
          scanned_at?: string
          session: Database["public"]["Enums"]["meal_session"]
          session_date?: string
          staff_id?: string | null
          status: Database["public"]["Enums"]["scan_status"]
          student_id?: string | null
        }
        Update: {
          id?: string
          reason?: string | null
          reg_number?: string | null
          scanned_at?: string
          session?: Database["public"]["Enums"]["meal_session"]
          session_date?: string
          staff_id?: string | null
          status?: Database["public"]["Enums"]["scan_status"]
          student_id?: string | null
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          menu_date: string
          name: string
          session: Database["public"]["Enums"]["meal_session"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          menu_date: string
          name: string
          session: Database["public"]["Enums"]["meal_session"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          menu_date?: string
          name?: string
          session?: Database["public"]["Enums"]["meal_session"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          dorm: string | null
          full_name: string
          id: string
          reg_number: string
        }
        Insert: {
          created_at?: string
          dorm?: string | null
          full_name?: string
          id: string
          reg_number: string
        }
        Update: {
          created_at?: string
          dorm?: string | null
          full_name?: string
          id?: string
          reg_number?: string
        }
        Relationships: []
      }
      qr_tokens: {
        Row: {
          expires_at: string
          id: string
          issued_at: string
          student_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          expires_at: string
          id?: string
          issued_at?: string
          student_id: string
          token: string
          used_at?: string | null
        }
        Update: {
          expires_at?: string
          id?: string
          issued_at?: string
          student_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      session_schedule: {
        Row: {
          end_time: string
          label: string
          session: Database["public"]["Enums"]["meal_session"]
          start_time: string
        }
        Insert: {
          end_time: string
          label: string
          session: Database["public"]["Enums"]["meal_session"]
          start_time: string
        }
        Update: {
          end_time?: string
          label?: string
          session?: Database["public"]["Enums"]["meal_session"]
          start_time?: string
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
      app_role: "student" | "staff" | "admin"
      meal_session: "sarapan" | "makan_siang" | "makan_malam"
      scan_status: "accepted" | "rejected" | "manual" | "assisted"
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
      app_role: ["student", "staff", "admin"],
      meal_session: ["sarapan", "makan_siang", "makan_malam"],
      scan_status: ["accepted", "rejected", "manual", "assisted"],
    },
  },
} as const
