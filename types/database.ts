export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      actor_headshots: {
        Row: {
          id: string
          actor_id: string
          storage_path: string
          public_url: string
          label: string
          created_at: string | null
        }
        Insert: {
          id?: string
          actor_id: string
          storage_path: string
          public_url: string
          label?: string
          created_at?: string | null
        }
        Update: {
          id?: string
          actor_id?: string
          storage_path?: string
          public_url?: string
          label?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actor_headshots_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      actors: {
        Row: {
          id: string
          email: string
          created_at: string | null
          subscription_tier: string | null
        }
        Insert: {
          id?: string
          email: string
          created_at?: string | null
          subscription_tier?: string | null
        }
        Update: {
          id?: string
          email?: string
          created_at?: string | null
          subscription_tier?: string | null
        }
        Relationships: []
      }
      actor_profiles: {
        Row: {
          actor_id: string
          legal_name: string | null
          stage_name: string | null
          union_status: string[] | null
          age_range_low: number | null
          age_range_high: number | null
          ethnicity_self_id: string[] | null
          gender_identity: string | null
          height_cm: number | null
          weight_lbs: number | null
          location_primary: string | null
          location_secondary: string[] | null
          rep_status: string | null
          rep_agency: string | null
          skills: string[] | null
          languages: string[] | null
          accent_capabilities: string[] | null
          reel_url: string | null
          resume_url: string | null
          headshot_urls: string[] | null
          conflict_brands: string[] | null
          rate_floor: number | null
          travel_radius_miles: number | null
          updated_at: string | null
          inbound_token: string
          pronouns: string | null
          bio: string | null
          hair_color: string | null
          eye_color: string | null
          hair_length: string | null
          body_type: string | null
          distinctive_features: string | null
          willing_to_relocate: boolean | null
          work_authorization: string | null
          character_types: string[] | null
          project_type_preferences: string[] | null
          training: string[] | null
          voice_type: string | null
          nudity_comfort: string | null
          imdb_url: string | null
          actors_access_url: string | null
          backstage_url: string | null
          casting_networks_url: string | null
          shirt_size: string | null
          pants_size: string | null
          shoe_size: string | null
        }
        Insert: {
          actor_id: string
          legal_name?: string | null
          stage_name?: string | null
          union_status?: string[] | null
          age_range_low?: number | null
          age_range_high?: number | null
          ethnicity_self_id?: string[] | null
          gender_identity?: string | null
          height_cm?: number | null
          weight_lbs?: number | null
          location_primary?: string | null
          location_secondary?: string[] | null
          rep_status?: string | null
          rep_agency?: string | null
          skills?: string[] | null
          languages?: string[] | null
          accent_capabilities?: string[] | null
          reel_url?: string | null
          resume_url?: string | null
          headshot_urls?: string[] | null
          conflict_brands?: string[] | null
          rate_floor?: number | null
          travel_radius_miles?: number | null
          updated_at?: string | null
          inbound_token?: string
          pronouns?: string | null
          bio?: string | null
          hair_color?: string | null
          eye_color?: string | null
          hair_length?: string | null
          body_type?: string | null
          distinctive_features?: string | null
          willing_to_relocate?: boolean | null
          work_authorization?: string | null
          character_types?: string[] | null
          project_type_preferences?: string[] | null
          training?: string[] | null
          voice_type?: string | null
          nudity_comfort?: string | null
          imdb_url?: string | null
          actors_access_url?: string | null
          backstage_url?: string | null
          casting_networks_url?: string | null
          shirt_size?: string | null
          pants_size?: string | null
          shoe_size?: string | null
        }
        Update: {
          actor_id?: string
          legal_name?: string | null
          stage_name?: string | null
          union_status?: string[] | null
          age_range_low?: number | null
          age_range_high?: number | null
          ethnicity_self_id?: string[] | null
          gender_identity?: string | null
          height_cm?: number | null
          weight_lbs?: number | null
          location_primary?: string | null
          location_secondary?: string[] | null
          rep_status?: string | null
          rep_agency?: string | null
          skills?: string[] | null
          languages?: string[] | null
          accent_capabilities?: string[] | null
          reel_url?: string | null
          resume_url?: string | null
          headshot_urls?: string[] | null
          conflict_brands?: string[] | null
          rate_floor?: number | null
          travel_radius_miles?: number | null
          updated_at?: string | null
          inbound_token?: string
          pronouns?: string | null
          bio?: string | null
          hair_color?: string | null
          eye_color?: string | null
          hair_length?: string | null
          body_type?: string | null
          distinctive_features?: string | null
          willing_to_relocate?: boolean | null
          work_authorization?: string | null
          character_types?: string[] | null
          project_type_preferences?: string[] | null
          training?: string[] | null
          voice_type?: string | null
          nudity_comfort?: string | null
          imdb_url?: string | null
          actors_access_url?: string | null
          backstage_url?: string | null
          casting_networks_url?: string | null
          shirt_size?: string | null
          pants_size?: string | null
          shoe_size?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actor_profiles_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: true
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          id: string
          actor_id: string | null
          source: string
          raw_text: string
          raw_metadata: Json | null
          ingested_at: string | null
          processing_status: string | null
          source_email: string | null
          source_subject: string | null
          scan_title: string | null
          scan_project: string | null
          scan_skip_reason: string | null
        }
        Insert: {
          id?: string
          actor_id?: string | null
          source: string
          raw_text: string
          raw_metadata?: Json | null
          ingested_at?: string | null
          processing_status?: string | null
          source_email?: string | null
          source_subject?: string | null
          scan_title?: string | null
          scan_project?: string | null
          scan_skip_reason?: string | null
        }
        Update: {
          id?: string
          actor_id?: string | null
          source?: string
          raw_text?: string
          raw_metadata?: Json | null
          ingested_at?: string | null
          processing_status?: string | null
          source_email?: string | null
          source_subject?: string | null
          scan_title?: string | null
          scan_project?: string | null
          scan_skip_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_details: {
        Row: {
          opportunity_id: string
          project_title: string | null
          project_type: string | null
          role_name: string | null
          role_description: string | null
          union_requirement: string | null
          shoot_dates: unknown | null
          shoot_location: string | null
          audition_deadline: string | null
          rate_disclosed: number | null
          rate_currency: string | null
          casting_director: string | null
          production_company: string | null
          submission_method: string | null
          submission_target: string | null
          parsed_at: string | null
          submission_url: string | null
        }
        Insert: {
          opportunity_id: string
          project_title?: string | null
          project_type?: string | null
          role_name?: string | null
          role_description?: string | null
          union_requirement?: string | null
          shoot_dates?: unknown | null
          shoot_location?: string | null
          audition_deadline?: string | null
          rate_disclosed?: number | null
          rate_currency?: string | null
          casting_director?: string | null
          production_company?: string | null
          submission_method?: string | null
          submission_target?: string | null
          parsed_at?: string | null
          submission_url?: string | null
        }
        Update: {
          opportunity_id?: string
          project_title?: string | null
          project_type?: string | null
          role_name?: string | null
          role_description?: string | null
          union_requirement?: string | null
          shoot_dates?: unknown | null
          shoot_location?: string | null
          audition_deadline?: string | null
          rate_disclosed?: number | null
          rate_currency?: string | null
          casting_director?: string | null
          production_company?: string | null
          submission_method?: string | null
          submission_target?: string | null
          parsed_at?: string | null
          submission_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_details_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: true
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          id: string
          opportunity_id: string | null
          actor_id: string | null
          recommended_action: string | null
          fit_score: number | null
          confidence_score: number | null
          reasoning_summary: string | null
          reasoning_detail: Json | null
          draft_cover_note: string | null
          draft_tags: string[] | null
          draft_self_tape_notes: string | null
          flags: string[] | null
          priority_rank: number | null
          validator_passed: boolean | null
          validator_notes: string | null
          created_at: string | null
          model_version: string | null
        }
        Insert: {
          id?: string
          opportunity_id?: string | null
          actor_id?: string | null
          recommended_action?: string | null
          fit_score?: number | null
          confidence_score?: number | null
          reasoning_summary?: string | null
          reasoning_detail?: Json | null
          draft_cover_note?: string | null
          draft_tags?: string[] | null
          draft_self_tape_notes?: string | null
          flags?: string[] | null
          priority_rank?: number | null
          validator_passed?: boolean | null
          validator_notes?: string | null
          created_at?: string | null
          model_version?: string | null
        }
        Update: {
          id?: string
          opportunity_id?: string | null
          actor_id?: string | null
          recommended_action?: string | null
          fit_score?: number | null
          confidence_score?: number | null
          reasoning_summary?: string | null
          reasoning_detail?: Json | null
          draft_cover_note?: string | null
          draft_tags?: string[] | null
          draft_self_tape_notes?: string | null
          flags?: string[] | null
          priority_rank?: number | null
          validator_passed?: boolean | null
          validator_notes?: string | null
          created_at?: string | null
          model_version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      decisions: {
        Row: {
          id: string
          recommendation_id: string | null
          actor_id: string | null
          decision: string
          edits: Json | null
          decided_at: string | null
          time_to_decide_seconds: number | null
        }
        Insert: {
          id?: string
          recommendation_id?: string | null
          actor_id?: string | null
          decision: string
          edits?: Json | null
          decided_at?: string | null
          time_to_decide_seconds?: number | null
        }
        Update: {
          id?: string
          recommendation_id?: string | null
          actor_id?: string | null
          decision?: string
          edits?: Json | null
          decided_at?: string | null
          time_to_decide_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "decisions_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          id: string
          decision_id: string | null
          actor_id: string | null
          submitted_at: string | null
          submission_method: string | null
          final_payload: Json | null
        }
        Insert: {
          id?: string
          decision_id?: string | null
          actor_id?: string | null
          submitted_at?: string | null
          submission_method?: string | null
          final_payload?: Json | null
        }
        Update: {
          id?: string
          decision_id?: string | null
          actor_id?: string | null
          submitted_at?: string | null
          submission_method?: string | null
          final_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      outcomes: {
        Row: {
          id: string
          submission_id: string | null
          outcome_type: string
          outcome_at: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          submission_id?: string | null
          outcome_type: string
          outcome_at?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          submission_id?: string | null
          outcome_type?: string
          outcome_at?: string | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outcomes_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_signals: {
        Row: {
          id: string
          actor_id: string | null
          signal_type: string
          signal_payload: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          actor_id?: string | null
          signal_type: string
          signal_payload?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          actor_id?: string | null
          signal_type?: string
          signal_payload?: Json | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_signals_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
