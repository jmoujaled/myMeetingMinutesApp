// TypeScript types for the meetings database schema
// Generated from the meetings table and related structures

export interface Meeting {
  id: string;
  user_id: string;
  transcription_job_id: string | null;
  title: string;
  description: string | null;
  meeting_date: string | null;
  duration_minutes: number | null;
  attendees: string[] | null;
  transcript_text: string | null;
  summary: string | null;
  action_items: ActionItem[] | null;
  key_topics: string[] | null;
  audio_file_url: string | null;
  transcript_file_url: string | null;
  summary_file_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActionItem {
  id?: string;
  text: string;
  assignee?: string;
  due_date?: string;
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
  notes?: string;
}

export interface TranscriptionHistoryRecord {
  // Transcription job fields
  id: string;
  user_id: string;
  filename: string;
  status: 'processing' | 'completed' | 'failed' | 'cancelled';
  duration_seconds: number | null;
  file_size: number | null;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
  tier: 'free' | 'pro' | 'admin';
  usage_cost: number;
  transcription_metadata: Record<string, any>;
  
  // Meeting fields (null if no associated meeting)
  meeting_id: string | null;
  meeting_title: string | null;
  meeting_description: string | null;
  meeting_date: string | null;
  duration_minutes: number | null;
  attendees: string[] | null;
  summary: string | null;
  action_items: ActionItem[] | null;
  key_topics: string[] | null;
  audio_file_url: string | null;
  transcript_file_url: string | null;
  summary_file_url: string | null;
  meeting_updated_at: string | null;
  
  // Computed fields
  record_type: 'meeting' | 'transcription';
  display_status: string;
  action_items_count: number;
}

export interface MeetingStats {
  total_transcriptions: number;
  total_meetings: number;
  total_hours: number;
  this_month_transcriptions: number;
  this_month_meetings: number;
  this_month_hours: number;
  completed_transcriptions: number;
  processing_transcriptions: number;
  failed_transcriptions: number;
}

export interface CreateMeetingRequest {
  transcription_job_id: string;
  title: string;
  description?: string;
  meeting_date?: string;
  attendees?: string[];
  summary?: string;
  action_items?: Omit<ActionItem, 'id'>[];
  key_topics?: string[];
}

export interface UpdateMeetingRequest {
  title?: string;
  description?: string;
  meeting_date?: string;
  attendees?: string[];
  summary?: string;
  action_items?: ActionItem[];
  key_topics?: string[];
}

export interface TranscriptionHistoryFilters {
  search?: string;
  date_from?: string;
  date_to?: string;
  status?: 'processing' | 'completed' | 'failed' | 'cancelled';
  record_type?: 'all' | 'meetings' | 'transcriptions';
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface MeetingsResponse extends PaginatedResponse<TranscriptionHistoryRecord> {
  stats: MeetingStats;
}

// Export format types
export type ExportFormat = 'txt' | 'srt' | 'docx' | 'pdf';

export interface ExportOptions {
  include_transcript?: boolean;
  include_summary?: boolean;
  include_action_items?: boolean;
}

// Database function parameter types
export interface GetTranscriptionHistoryParams {
  target_user_id?: string;
  search_query?: string;
  date_from?: string;
  date_to?: string;
  status_filter?: string;
  record_type_filter?: string;
  limit_count?: number;
  offset_count?: number;
}

// Error types for better error handling
export interface MeetingsError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export const MEETINGS_ERROR_CODES = {
  MEETING_NOT_FOUND: 'MEETING_NOT_FOUND',
  TRANSCRIPTION_NOT_FOUND: 'TRANSCRIPTION_NOT_FOUND',
  MEETING_ALREADY_EXISTS: 'MEETING_ALREADY_EXISTS',
  ACCESS_DENIED: 'ACCESS_DENIED',
  INVALID_INPUT: 'INVALID_INPUT',
  EXPORT_FAILED: 'EXPORT_FAILED',
} as const;

export type MeetingsErrorCode = typeof MEETINGS_ERROR_CODES[keyof typeof MEETINGS_ERROR_CODES];