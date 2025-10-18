import { z } from 'zod';

// Action Item schema
export const ActionItemSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, 'Action item text is required'),
  assignee: z.string().optional(),
  due_date: z.string().datetime().optional(),
  completed: z.boolean().default(false),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  notes: z.string().optional(),
});

// Create Meeting Request schema
export const CreateMeetingRequestSchema = z.object({
  transcription_job_id: z.string().uuid('Invalid transcription job ID'),
  title: z.string().min(1, 'Meeting title is required').max(255, 'Title too long'),
  description: z.string().optional(),
  meeting_date: z.string().datetime().optional(),
  attendees: z.array(z.string()).optional(),
  summary: z.string().optional(),
  action_items: z.array(ActionItemSchema.omit({ id: true })).optional(),
  key_topics: z.array(z.string()).optional(),
});

// Update Meeting Request schema
export const UpdateMeetingRequestSchema = z.object({
  title: z.string().min(1, 'Meeting title is required').max(255, 'Title too long').optional(),
  description: z.string().optional(),
  meeting_date: z.string().datetime().optional(),
  attendees: z.array(z.string()).optional(),
  summary: z.string().optional(),
  action_items: z.array(ActionItemSchema).optional(),
  key_topics: z.array(z.string()).optional(),
});

// Query parameters for GET /api/meetings
export const GetMeetingsQuerySchema = z.object({
  search: z.string().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  status: z.enum(['processing', 'completed', 'failed', 'cancelled']).optional(),
  record_type: z.enum(['all', 'meetings', 'transcriptions']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Export options schema
export const ExportOptionsSchema = z.object({
  format: z.enum(['txt', 'srt', 'docx', 'pdf']),
  include_transcript: z.boolean().default(true),
  include_summary: z.boolean().default(true),
  include_action_items: z.boolean().default(true),
});

// Meeting ID parameter schema
export const MeetingIdParamSchema = z.object({
  id: z.string().uuid('Invalid meeting ID'),
});

// Response schemas for type safety
export const MeetingStatsSchema = z.object({
  total_transcriptions: z.number(),
  total_meetings: z.number(),
  total_hours: z.number(),
  this_month_transcriptions: z.number(),
  this_month_meetings: z.number(),
  this_month_hours: z.number(),
  completed_transcriptions: z.number(),
  processing_transcriptions: z.number(),
  failed_transcriptions: z.number(),
});

export const TranscriptionHistoryRecordSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  filename: z.string(),
  status: z.enum(['processing', 'completed', 'failed', 'cancelled']),
  duration_seconds: z.number().nullable(),
  file_size: z.number().nullable(),
  created_at: z.string(),
  completed_at: z.string().nullable(),
  error_message: z.string().nullable(),
  tier: z.enum(['free', 'pro', 'admin']),
  usage_cost: z.number(),
  transcription_metadata: z.record(z.any()),
  meeting_id: z.string().nullable(),
  meeting_title: z.string().nullable(),
  meeting_description: z.string().nullable(),
  meeting_date: z.string().nullable(),
  duration_minutes: z.number().nullable(),
  attendees: z.array(z.string()).nullable(),
  summary: z.string().nullable(),
  action_items: z.array(ActionItemSchema).nullable(),
  key_topics: z.array(z.string()).nullable(),
  audio_file_url: z.string().nullable(),
  transcript_file_url: z.string().nullable(),
  summary_file_url: z.string().nullable(),
  meeting_updated_at: z.string().nullable(),
  record_type: z.enum(['meeting', 'transcription']),
  display_status: z.string(),
  action_items_count: z.number(),
  search_rank: z.number(),
});

export const PaginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  total_pages: z.number(),
});

export const GetMeetingsResponseSchema = z.object({
  data: z.array(TranscriptionHistoryRecordSchema),
  pagination: PaginationSchema,
  stats: MeetingStatsSchema,
});

export const MeetingDetailSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  transcription_job_id: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  meeting_date: z.string().nullable(),
  duration_minutes: z.number().nullable(),
  attendees: z.array(z.string()).nullable(),
  transcript_text: z.string().nullable(),
  summary: z.string().nullable(),
  action_items: z.array(ActionItemSchema).nullable(),
  key_topics: z.array(z.string()).nullable(),
  audio_file_url: z.string().nullable(),
  transcript_file_url: z.string().nullable(),
  summary_file_url: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const GetMeetingDetailResponseSchema = z.object({
  meeting: MeetingDetailSchema,
  transcription_job: z.object({
    filename: z.string(),
    file_size: z.number().nullable(),
    processing_time: z.number().nullable(),
  }).optional(),
});

// Error response schema
export const ApiErrorSchema = z.object({
  error: z.string(),
  code: z.string(),
  details: z.record(z.any()).optional(),
});

// Type exports for use in API routes
export type CreateMeetingRequest = z.infer<typeof CreateMeetingRequestSchema>;
export type UpdateMeetingRequest = z.infer<typeof UpdateMeetingRequestSchema>;
export type GetMeetingsQuery = z.output<typeof GetMeetingsQuerySchema>; // Use z.output to get the type after defaults are applied
export type ExportOptionsRequest = z.infer<typeof ExportOptionsSchema>;
export type MeetingIdParam = z.infer<typeof MeetingIdParamSchema>;
export type MeetingStats = z.infer<typeof MeetingStatsSchema>;
export type TranscriptionHistoryRecord = z.infer<typeof TranscriptionHistoryRecordSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type GetMeetingsResponse = z.infer<typeof GetMeetingsResponseSchema>;
export type MeetingDetail = z.infer<typeof MeetingDetailSchema>;
export type GetMeetingDetailResponse = z.infer<typeof GetMeetingDetailResponseSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;