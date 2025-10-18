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
      meetings: {
        Row: {
          id: string
          user_id: string
          transcription_job_id: string | null
          title: string
          description: string | null
          meeting_date: string | null
          duration_minutes: number | null
          attendees: string[] | null
          transcript_text: string | null
          summary: string | null
          action_items: Json | null
          key_topics: string[] | null
          audio_file_url: string | null
          transcript_file_url: string | null
          summary_file_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          transcription_job_id?: string | null
          title: string
          description?: string | null
          meeting_date?: string | null
          duration_minutes?: number | null
          attendees?: string[] | null
          transcript_text?: string | null
          summary?: string | null
          action_items?: Json | null
          key_topics?: string[] | null
          audio_file_url?: string | null
          transcript_file_url?: string | null
          summary_file_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          transcription_job_id?: string | null
          title?: string
          description?: string | null
          meeting_date?: string | null
          duration_minutes?: number | null
          attendees?: string[] | null
          transcript_text?: string | null
          summary?: string | null
          action_items?: Json | null
          key_topics?: string[] | null
          audio_file_url?: string | null
          transcript_file_url?: string | null
          summary_file_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tier_limits: {
        Row: {
          tier: 'free' | 'pro' | 'admin'
          monthly_transcription_limit: number
          max_file_size_mb: number
          max_duration_minutes: number
          features: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          tier: 'free' | 'pro' | 'admin'
          monthly_transcription_limit: number
          max_file_size_mb: number
          max_duration_minutes: number
          features?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          tier?: 'free' | 'pro' | 'admin'
          monthly_transcription_limit?: number
          max_file_size_mb?: number
          max_duration_minutes?: number
          features?: Json
          created_at?: string
          updated_at?: string
        }
      }
      transcription_jobs: {
        Row: {
          id: string
          user_id: string
          job_id: string | null
          filename: string
          file_size: number | null
          duration_seconds: number | null
          status: 'processing' | 'completed' | 'failed' | 'cancelled'
          tier: 'free' | 'pro' | 'admin'
          created_at: string
          completed_at: string | null
          error_message: string | null
          usage_cost: number
          metadata: Json
        }
        Insert: {
          id?: string
          user_id: string
          job_id?: string | null
          filename: string
          file_size?: number | null
          duration_seconds?: number | null
          status?: 'processing' | 'completed' | 'failed' | 'cancelled'
          tier: 'free' | 'pro' | 'admin'
          created_at?: string
          completed_at?: string | null
          error_message?: string | null
          usage_cost?: number
          metadata?: Json
        }
        Update: {
          id?: string
          user_id?: string
          job_id?: string | null
          filename?: string
          file_size?: number | null
          duration_seconds?: number | null
          status?: 'processing' | 'completed' | 'failed' | 'cancelled'
          tier?: 'free' | 'pro' | 'admin'
          created_at?: string
          completed_at?: string | null
          error_message?: string | null
          usage_cost?: number
          metadata?: Json
        }
      }
      user_profiles: {
        Row: {
          id: string
          email: string
          tier: 'free' | 'pro' | 'admin'
          created_at: string
          updated_at: string
          usage_reset_date: string
          provider: string | null
          provider_id: string | null
          avatar_url: string | null
          full_name: string | null
          monthly_transcriptions_used: number
          total_transcriptions: number
          metadata: Json
        }
        Insert: {
          id: string
          email: string
          tier?: 'free' | 'pro' | 'admin'
          created_at?: string
          updated_at?: string
          usage_reset_date?: string
          provider?: string | null
          provider_id?: string | null
          avatar_url?: string | null
          full_name?: string | null
          monthly_transcriptions_used?: number
          total_transcriptions?: number
          metadata?: Json
        }
        Update: {
          id?: string
          email?: string
          tier?: 'free' | 'pro' | 'admin'
          created_at?: string
          updated_at?: string
          usage_reset_date?: string
          provider?: string | null
          provider_id?: string | null
          avatar_url?: string | null
          full_name?: string | null
          monthly_transcriptions_used?: number
          total_transcriptions?: number
          metadata?: Json
        }
      }
    }
    Views: {
      user_transcription_history: {
        Row: {
          id: string
          user_id: string
          filename: string
          status: 'processing' | 'completed' | 'failed' | 'cancelled'
          duration_seconds: number | null
          file_size: number | null
          created_at: string
          completed_at: string | null
          error_message: string | null
          tier: 'free' | 'pro' | 'admin'
          usage_cost: number
          transcription_metadata: Json
          meeting_id: string | null
          meeting_title: string | null
          meeting_description: string | null
          meeting_date: string | null
          duration_minutes: number | null
          attendees: string[] | null
          summary: string | null
          action_items: Json | null
          key_topics: string[] | null
          audio_file_url: string | null
          transcript_file_url: string | null
          summary_file_url: string | null
          meeting_updated_at: string | null
          record_type: 'meeting' | 'transcription'
          display_status: string
          action_items_count: number
        }
      }
    }
    Functions: {
      get_user_transcription_history: {
        Args: {
          target_user_id?: string
          search_query?: string
          date_from?: string
          date_to?: string
          status_filter?: string
          record_type_filter?: string
          limit_count?: number
          offset_count?: number
        }
        Returns: {
          id: string
          user_id: string
          filename: string
          status: string
          duration_seconds: number | null
          file_size: number | null
          created_at: string
          completed_at: string | null
          error_message: string | null
          tier: string
          usage_cost: number
          transcription_metadata: Json
          meeting_id: string | null
          meeting_title: string | null
          meeting_description: string | null
          meeting_date: string | null
          duration_minutes: number | null
          attendees: string[] | null
          summary: string | null
          action_items: Json | null
          key_topics: string[] | null
          audio_file_url: string | null
          transcript_file_url: string | null
          summary_file_url: string | null
          meeting_updated_at: string | null
          record_type: string
          display_status: string
          action_items_count: number
        }[]
      }
      get_user_meeting_stats: {
        Args: {
          target_user_id?: string
        }
        Returns: {
          total_transcriptions: number
          total_meetings: number
          total_hours: number
          this_month_transcriptions: number
          this_month_meetings: number
          this_month_hours: number
          completed_transcriptions: number
          processing_transcriptions: number
          failed_transcriptions: number
        }[]
      }
      create_meeting_from_transcription: {
        Args: {
          p_transcription_job_id: string
          p_title: string
          p_description?: string
          p_meeting_date?: string
          p_attendees?: string[]
          p_summary?: string
          p_action_items?: Json
          p_key_topics?: string[]
        }
        Returns: string
      }
      update_meeting_action_items: {
        Args: {
          p_meeting_id: string
          p_action_items: Json
        }
        Returns: boolean
      }
      delete_meeting: {
        Args: {
          p_meeting_id: string
        }
        Returns: boolean
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