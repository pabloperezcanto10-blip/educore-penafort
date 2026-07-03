export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      academic_years: {
        Row: {
          id: string;
          name: string;
          start_date: string | null;
          end_date: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          start_date?: string | null;
          end_date?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          start_date?: string | null;
          end_date?: string | null;
          active?: boolean;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_user_id: string | null;
          actor_role: string | null;
          action: string;
          module: string;
          entity_type: string;
          entity_id: string | null;
          before_data: Json | null;
          after_data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_user_id?: string | null;
          actor_role?: string | null;
          action: string;
          module: string;
          entity_type: string;
          entity_id?: string | null;
          before_data?: Json | null;
          after_data?: Json | null;
          created_at?: string;
        };
        Update: {
          actor_user_id?: string | null;
          actor_role?: string | null;
          action?: string;
          module?: string;
          entity_type?: string;
          entity_id?: string | null;
          before_data?: Json | null;
          after_data?: Json | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          role: "superadmin" | "director" | "tutor" | "family";
          active: boolean;
          must_change_password: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          role?: "superadmin" | "director" | "tutor" | "family";
          active?: boolean;
          must_change_password?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string | null;
          full_name?: string | null;
          role?: "superadmin" | "director" | "tutor" | "family";
          active?: boolean;
          must_change_password?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      students: {
        Row: {
          id: string;
          name: string;
          last_name: string;
          birth_date: string | null;
          course_id: string;
          tutor_teacher_id: string;
          active: boolean;
          academic_year_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          last_name: string;
          birth_date?: string | null;
          course_id: string;
          tutor_teacher_id: string;
          active?: boolean;
          academic_year_id?: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          last_name?: string;
          birth_date?: string | null;
          course_id?: string;
          tutor_teacher_id?: string;
          active?: boolean;
          academic_year_id?: string;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          name: string;
          academic_year_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          academic_year_id?: string | null;
        };
        Update: {
          name?: string;
          academic_year_id?: string | null;
        };
        Relationships: [];
      };
      subjects: {
        Row: {
          id: string;
          name: string;
        };
        Insert: {
          id?: string;
          name: string;
        };
        Update: {
          name?: string;
        };
        Relationships: [];
      };
      course_subjects: {
        Row: {
          id: string;
          course_id: string;
          subject_id: string;
          academic_year_id: string | null;
          optional: boolean;
          track: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          subject_id: string;
          academic_year_id?: string | null;
          optional?: boolean;
          track?: string | null;
          created_at?: string;
        };
        Update: {
          course_id?: string;
          subject_id?: string;
          academic_year_id?: string | null;
          optional?: boolean;
          track?: string | null;
        };
        Relationships: [];
      };
      teacher_assignments: {
        Row: {
          id: string;
          teacher_id: string;
          subject_id: string | null;
          course_id: string;
          academic_year_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          subject_id: string;
          course_id: string;
          academic_year_id?: string;
          created_at?: string;
        };
        Update: {
          teacher_id?: string;
          subject_id?: string;
          course_id?: string;
          academic_year_id?: string;
        };
        Relationships: [];
      };
      teacher_schedule: {
        Row: {
          id: string;
          teacher_id: string;
          weekday: number;
          start_time: string;
          end_time: string;
          course_name: string;
          subject_name: string | null;
          is_break: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          weekday: number;
          start_time: string;
          end_time: string;
          course_name: string;
          subject_name?: string | null;
          is_break?: boolean;
          created_at?: string;
        };
        Update: {
          teacher_id?: string;
          weekday?: number;
          start_time?: string;
          end_time?: string;
          course_name?: string;
          subject_name?: string | null;
          is_break?: boolean;
        };
        Relationships: [];
      };
      partial_grades: {
        Row: {
          id: string;
          student_id: string;
          teacher_id: string;
          subject_id: string;
          course_id: string;
          academic_year_id: string;
          term: "1" | "2" | "3";
          assessment_type: "parcial" | "trimestral";
          assessment_name: string;
          grade: number;
          assessment_date: string | null;
          comment: string | null;
          recommendation: string | null;
          visible_to_family: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          teacher_id: string;
          subject_id: string;
          course_id: string;
          academic_year_id?: string;
          term: "1" | "2" | "3";
          assessment_type: "parcial" | "trimestral";
          assessment_name: string;
          grade: number;
          assessment_date?: string | null;
          comment?: string | null;
          recommendation?: string | null;
          visible_to_family?: boolean;
          created_at?: string;
        };
        Update: {
          term?: "1" | "2" | "3";
          assessment_type?: "parcial" | "trimestral";
          assessment_name?: string;
          grade?: number;
          assessment_date?: string | null;
          comment?: string | null;
          recommendation?: string | null;
          visible_to_family?: boolean;
          academic_year_id?: string;
        };
        Relationships: [];
      };
      evaluation_criteria: {
        Row: {
          id: string;
          teacher_id: string;
          course_id: string;
          subject_id: string;
          academic_year_id: string;
          term: "1" | "2" | "3";
          name: string;
          weight: number;
          criterion_type:
            | "parcial"
            | "trimestral"
            | "comportamiento"
            | "libreta"
            | "oral"
            | "proyecto"
            | "actitud"
            | "otro";
          visible_to_family: boolean;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          course_id: string;
          subject_id: string;
          academic_year_id?: string;
          term: "1" | "2" | "3";
          name: string;
          weight: number;
          criterion_type:
            | "parcial"
            | "trimestral"
            | "comportamiento"
            | "libreta"
            | "oral"
            | "proyecto"
            | "actitud"
            | "otro";
          visible_to_family?: boolean;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          weight?: number;
          criterion_type?:
            | "parcial"
            | "trimestral"
            | "comportamiento"
            | "libreta"
            | "oral"
            | "proyecto"
            | "actitud"
            | "otro";
          visible_to_family?: boolean;
          active?: boolean;
          academic_year_id?: string;
        };
        Relationships: [];
      };
      quarter_final_grades: {
        Row: {
          id: string;
          student_id: string;
          subject_id: string;
          teacher_id: string;
          course_id: string;
          academic_year_id: string;
          term: "1" | "2" | "3";
          calculated_grade: number;
          final_grade: number;
          teacher_observation: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          subject_id: string;
          teacher_id: string;
          course_id: string;
          academic_year_id?: string;
          term: "1" | "2" | "3";
          calculated_grade: number;
          final_grade: number;
          teacher_observation?: string | null;
          created_at?: string;
        };
        Update: {
          calculated_grade?: number;
          final_grade?: number;
          teacher_observation?: string | null;
          academic_year_id?: string;
        };
        Relationships: [];
      };
      term_subject_grades: {
        Row: {
          id: string;
          student_id: string;
          subject_id: string;
          teacher_id: string;
          course_id: string;
          academic_year_id: string;
          term: "1" | "2" | "3";
          calculated_grade: number | null;
          final_grade: number | null;
          final_observation: string | null;
          status: "draft" | "closed";
          closed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          subject_id: string;
          teacher_id: string;
          course_id: string;
          academic_year_id?: string;
          term: "1" | "2" | "3";
          calculated_grade?: number | null;
          final_grade?: number | null;
          final_observation?: string | null;
          status?: "draft" | "closed";
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          calculated_grade?: number | null;
          final_grade?: number | null;
          final_observation?: string | null;
          status?: "draft" | "closed";
          closed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      evaluation_publications: {
        Row: {
          id: string;
          course_id: string;
          academic_year_id: string;
          term: "1" | "2" | "3";
          published: boolean;
          published_at: string | null;
          published_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          academic_year_id?: string;
          term: "1" | "2" | "3";
          published?: boolean;
          published_at?: string | null;
          published_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          published?: boolean;
          published_at?: string | null;
          published_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          student_id: string | null;
          academic_year_id: string;
          title: string;
          message: string;
          category: "incidencia" | "académico" | "tutoría" | "general";
          read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          receiver_id: string;
          student_id?: string | null;
          academic_year_id?: string;
          title: string;
          message: string;
          category?: "incidencia" | "académico" | "tutoría" | "general";
          read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          message?: string;
          category?: "incidencia" | "académico" | "tutoría" | "general";
          read?: boolean;
          read_at?: string | null;
          academic_year_id?: string;
        };
        Relationships: [];
      };
      internal_notifications: {
        Row: {
          id: string;
          user_id: string;
          role: "superadmin" | "director" | "tutor" | "family";
          type:
            | "new_communication"
            | "unread_communication"
            | "new_visible_grade"
            | "new_incident"
            | "pending_attendance_justification"
            | "report_published"
            | "evaluation_pending_close"
            | "report_pending_publication"
            | "administrative_incident"
            | "inactive_user";
          title: string;
          body: string | null;
          related_entity_type: string | null;
          related_entity_id: string | null;
          related_href: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: "superadmin" | "director" | "tutor" | "family";
          type:
            | "new_communication"
            | "unread_communication"
            | "new_visible_grade"
            | "new_incident"
            | "pending_attendance_justification"
            | "report_published"
            | "evaluation_pending_close"
            | "report_pending_publication"
            | "administrative_incident"
            | "inactive_user";
          title: string;
          body?: string | null;
          related_entity_type?: string | null;
          related_entity_id?: string | null;
          related_href?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          title?: string;
          body?: string | null;
          related_href?: string | null;
          read?: boolean;
        };
        Relationships: [];
      };
      student_incidents: {
        Row: {
          id: string;
          student_id: string;
          tutor_id: string;
          academic_year_id: string;
          type: string;
          description: string;
          severity: "leve" | "media" | "grave";
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          tutor_id: string;
          academic_year_id?: string;
          type: string;
          description: string;
          severity: "leve" | "media" | "grave";
          created_at?: string;
        };
        Update: {
          type?: string;
          description?: string;
          severity?: "leve" | "media" | "grave";
          academic_year_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_incidents_student_id_fkey";
            columns: ["student_id"];
            referencedRelation: "students";
            referencedColumns: ["id"];
          }
        ];
      };
      student_observations: {
        Row: {
          id: string;
          student_id: string;
          tutor_id: string;
          academic_year_id: string;
          type: string;
          title: string;
          content: string;
          priority: "baja" | "media" | "alta";
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          tutor_id: string;
          academic_year_id?: string;
          type: string;
          title: string;
          content: string;
          priority: "baja" | "media" | "alta";
          created_at?: string;
        };
        Update: {
          type?: string;
          title?: string;
          content?: string;
          priority?: "baja" | "media" | "alta";
          academic_year_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_observations_student_id_fkey";
            columns: ["student_id"];
            referencedRelation: "students";
            referencedColumns: ["id"];
          }
        ];
      };
      student_attendance: {
        Row: {
          id: string;
          student_id: string;
          tutor_id: string;
          academic_year_id: string;
          status: "present" | "absent" | "late";
          date: string;
          notes: string | null;
          justified: boolean;
          justification_text: string | null;
          justification_file_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          tutor_id: string;
          academic_year_id?: string;
          status: "present" | "absent" | "late";
          date: string;
          notes?: string | null;
          justified?: boolean;
          justification_text?: string | null;
          justification_file_url?: string | null;
          created_at?: string;
        };
        Update: {
          status?: "present" | "absent" | "late";
          notes?: string | null;
          justified?: boolean;
          justification_text?: string | null;
          justification_file_url?: string | null;
          academic_year_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_attendance_student_id_fkey";
            columns: ["student_id"];
            referencedRelation: "students";
            referencedColumns: ["id"];
          }
        ];
      };
      parent_students: {
        Row: {
          parent_id: string;
          student_id: string;
        };
        Insert: {
          parent_id: string;
          student_id: string;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      app_role: "superadmin" | "director" | "tutor" | "family";
    };
    CompositeTypes: Record<string, never>;
  };
};
