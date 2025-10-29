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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      advisor_assignments: {
        Row: {
          advisor_id: string
          assigned_at: string
          department_id: string | null
          id: string
          student_id: string
        }
        Insert: {
          advisor_id: string
          assigned_at?: string
          department_id?: string | null
          id?: string
          student_id: string
        }
        Update: {
          advisor_id?: string
          assigned_at?: string
          department_id?: string | null
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisor_assignments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          course_code: string
          course_number: string
          created_at: string
          department_id: string | null
          description: string | null
          id: string
          title: string
          units: number
        }
        Insert: {
          course_code: string
          course_number: string
          created_at?: string
          department_id?: string | null
          description?: string | null
          id?: string
          title: string
          units: number
        }
        Update: {
          course_code?: string
          course_number?: string
          created_at?: string
          department_id?: string | null
          description?: string | null
          id?: string
          title?: string
          units?: number
        }
        Relationships: [
          {
            foreignKeyName: "courses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read: boolean | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read?: boolean | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read?: boolean | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      plan_courses: {
        Row: {
          course_id: string
          created_at: string
          id: string
          plan_id: string
          position: number
          term: string
          term_order: number
          year: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          plan_id: string
          position?: number
          term: string
          term_order: number
          year: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          plan_id?: string
          position?: number
          term?: string
          term_order?: number
          year?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_courses_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "student_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      prerequisites: {
        Row: {
          course_id: string
          created_at: string
          id: string
          is_corequisite: boolean | null
          prerequisite_course_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          is_corequisite?: boolean | null
          prerequisite_course_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          is_corequisite?: boolean | null
          prerequisite_course_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prerequisites_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prerequisites_prerequisite_course_id_fkey"
            columns: ["prerequisite_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          catalog_year: string | null
          created_at: string
          department: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          major: string | null
          student_id: string | null
          updated_at: string
          year_in_school: string | null
        }
        Insert: {
          catalog_year?: string | null
          created_at?: string
          department?: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          major?: string | null
          student_id?: string | null
          updated_at?: string
          year_in_school?: string | null
        }
        Update: {
          catalog_year?: string | null
          created_at?: string
          department?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          major?: string | null
          student_id?: string | null
          updated_at?: string
          year_in_school?: string | null
        }
        Relationships: []
      }
      student_plans: {
        Row: {
          advisor_notes: string | null
          created_at: string
          id: string
          name: string
          reviewed_at: string | null
          status: Database["public"]["Enums"]["plan_status"]
          student_id: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          advisor_notes?: string | null
          created_at?: string
          id?: string
          name?: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["plan_status"]
          student_id: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          advisor_notes?: string | null
          created_at?: string
          id?: string
          name?: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["plan_status"]
          student_id?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      transcript_courses: {
        Row: {
          course_code: string
          course_number: string
          created_at: string
          grade: Database["public"]["Enums"]["course_grade"] | null
          id: string
          term: string | null
          title: string | null
          transcript_id: string
          units: number
          year: string | null
        }
        Insert: {
          course_code: string
          course_number: string
          created_at?: string
          grade?: Database["public"]["Enums"]["course_grade"] | null
          id?: string
          term?: string | null
          title?: string | null
          transcript_id: string
          units: number
          year?: string | null
        }
        Update: {
          course_code?: string
          course_number?: string
          created_at?: string
          grade?: Database["public"]["Enums"]["course_grade"] | null
          id?: string
          term?: string | null
          title?: string | null
          transcript_id?: string
          units?: number
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transcript_courses_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: false
            referencedRelation: "transcripts"
            referencedColumns: ["id"]
          },
        ]
      }
      transcripts: {
        Row: {
          embeddings_data: Json | null
          file_url: string
          id: string
          parsed_data: Json | null
          uploaded_at: string
          user_id: string
        }
        Insert: {
          embeddings_data?: Json | null
          file_url: string
          id?: string
          parsed_data?: Json | null
          uploaded_at?: string
          user_id: string
        }
        Update: {
          embeddings_data?: Json | null
          file_url?: string
          id?: string
          parsed_data?: Json | null
          uploaded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_active_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "student" | "advisor" | "admin"
      course_grade:
        | "A+"
        | "A"
        | "A-"
        | "B+"
        | "B"
        | "B-"
        | "C+"
        | "C"
        | "C-"
        | "D+"
        | "D"
        | "D-"
        | "F"
        | "P"
        | "NP"
        | "W"
        | "IP"
      plan_status: "draft" | "submitted" | "approved" | "declined"
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
      app_role: ["student", "advisor", "admin"],
      course_grade: [
        "A+",
        "A",
        "A-",
        "B+",
        "B",
        "B-",
        "C+",
        "C",
        "C-",
        "D+",
        "D",
        "D-",
        "F",
        "P",
        "NP",
        "W",
        "IP",
      ],
      plan_status: ["draft", "submitted", "approved", "declined"],
    },
  },
} as const
