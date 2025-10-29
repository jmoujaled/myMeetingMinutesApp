-- Fix function return type mismatches
-- This migration addresses the "Returned type integer does not match expected type numeric" error

BEGIN;

-- Drop and recreate get_user_transcription_history with correct return types
DROP FUNCTION IF EXISTS get_user_transcription_history(UUID, TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, TEXT, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_user_transcription_history(
  target_user_id UUID,
  search_query TEXT DEFAULT NULL,
  date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  status_filter TEXT DEFAULT NULL,
  record_type_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  filename TEXT,
  status TEXT,
  duration_seconds INTEGER,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  tier TEXT,
  usage_cost NUMERIC,
  transcription_metadata JSONB,
  meeting_id UUID,
  meeting_title TEXT,
  meeting_description TEXT,
  meeting_date TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  attendees TEXT[],
  summary TEXT,
  action_items JSONB,
  key_topics TEXT[],
  audio_file_url TEXT,
  transcript_file_url TEXT,
  summary_file_url TEXT,
  meeting_updated_at TIMESTAMP WITH TIME ZONE,
  record_type TEXT,
  display_status TEXT,
  action_items_count INTEGER,
  search_rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  requesting_user_id UUID;
  is_admin BOOLEAN;
  search_ts_query TSQUERY;
BEGIN
  -- Get the requesting user's ID
  requesting_user_id := auth.uid();
  
  -- Check if user is admin (explicitly reference user_profiles.tier)
  SELECT (up.tier = 'admin') INTO is_admin 
  FROM user_profiles up
  WHERE up.id = requesting_user_id;
  
  -- Security check: non-admin users can only access their own data
  IF NOT is_admin AND target_user_id != requesting_user_id THEN
    RAISE EXCEPTION 'Access denied: You can only access your own transcription history';
  END IF;
  
  -- Build search query if provided
  IF search_query IS NOT NULL AND length(trim(search_query)) > 0 THEN
    search_ts_query := plainto_tsquery('english', search_query);
  END IF;
  
  -- Return filtered and ranked results
  RETURN QUERY
  SELECT 
    tj.id,
    tj.user_id,
    tj.filename,
    tj.status,
    tj.duration_seconds,
    tj.file_size,
    tj.created_at,
    tj.completed_at,
    tj.error_message,
    tj.tier, -- Explicitly reference transcription_jobs.tier
    tj.usage_cost,
    tj.metadata as transcription_metadata,
    
    -- Meeting data (NULL if no associated meeting)
    m.id as meeting_id,
    m.title as meeting_title,
    m.description as meeting_description,
    m.meeting_date,
    m.duration_minutes,
    m.attendees,
    m.summary,
    m.action_items,
    m.key_topics,
    m.audio_file_url,
    m.transcript_file_url,
    m.summary_file_url,
    m.updated_at as meeting_updated_at,
    
    -- Computed fields
    CASE 
      WHEN m.id IS NOT NULL THEN 'meeting'
      ELSE 'transcription'
    END as record_type,
    
    -- Status indicators
    CASE 
      WHEN tj.status = 'completed' AND m.id IS NOT NULL THEN 'meeting_saved'
      ELSE tj.status
    END as display_status,
    
    -- Action items count - ensure it returns INTEGER
    COALESCE(
      CASE 
        WHEN m.action_items IS NOT NULL THEN jsonb_array_length(m.action_items)
        ELSE 0
      END, 0
    )::INTEGER as action_items_count,
    
    -- Search ranking (higher is more relevant) - ensure it returns REAL
    COALESCE(
      CASE 
        WHEN search_ts_query IS NOT NULL THEN
          GREATEST(
            COALESCE(ts_rank(m.search_vector, search_ts_query), 0),
            COALESCE(ts_rank(to_tsvector('english', COALESCE(tj.filename, '')), search_ts_query), 0)
          )
        ELSE 0
      END, 0
    )::REAL as search_rank
    
  FROM transcription_jobs tj
  LEFT JOIN meetings m ON tj.id = m.transcription_job_id
  WHERE tj.user_id = target_user_id
    -- Search filtering
    AND (search_ts_query IS NULL OR 
         m.search_vector @@ search_ts_query OR 
         to_tsvector('english', COALESCE(tj.filename, '')) @@ search_ts_query)
    -- Date range filtering
    AND (date_from IS NULL OR tj.created_at >= date_from)
    AND (date_to IS NULL OR tj.created_at <= date_to)
    -- Status filtering
    AND (status_filter IS NULL OR status_filter = 'all' OR tj.status = status_filter)
    -- Record type filtering
    AND (record_type_filter IS NULL OR record_type_filter = 'all' OR
         (record_type_filter = 'meetings' AND m.id IS NOT NULL) OR
         (record_type_filter = 'transcriptions' AND m.id IS NULL))
  ORDER BY 
    COALESCE(
      CASE 
        WHEN search_ts_query IS NOT NULL THEN
          GREATEST(
            COALESCE(ts_rank(m.search_vector, search_ts_query), 0),
            COALESCE(ts_rank(to_tsvector('english', COALESCE(tj.filename, '')), search_ts_query), 0)
          )
        ELSE 0
      END, 0
    ) DESC,
    tj.created_at DESC
  LIMIT COALESCE(limit_count, 20)
  OFFSET COALESCE(offset_count, 0);
END;
$function$;

-- Also fix the get_user_meeting_stats function to ensure all numeric types are consistent
DROP FUNCTION IF EXISTS get_user_meeting_stats(UUID);

CREATE OR REPLACE FUNCTION get_user_meeting_stats(target_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  total_transcriptions BIGINT,
  total_meetings BIGINT,
  total_hours NUMERIC,
  this_month_transcriptions BIGINT,
  this_month_meetings BIGINT,
  this_month_hours NUMERIC,
  completed_transcriptions BIGINT,
  processing_transcriptions BIGINT,
  failed_transcriptions BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  requesting_user_id UUID;
  is_admin BOOLEAN;
  month_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get the requesting user's ID
  requesting_user_id := auth.uid();
  
  -- Check if user is admin (explicitly reference user_profiles.tier)
  SELECT (up.tier = 'admin') INTO is_admin 
  FROM user_profiles up
  WHERE up.id = requesting_user_id;
  
  -- If no target_user_id specified, use requesting user's ID
  IF target_user_id IS NULL THEN
    target_user_id := requesting_user_id;
  END IF;
  
  -- Security check: non-admin users can only access their own data
  IF NOT is_admin AND target_user_id != requesting_user_id THEN
    RAISE EXCEPTION 'Access denied: You can only access your own statistics';
  END IF;
  
  -- Calculate start of current month
  month_start := date_trunc('month', NOW());
  
  -- Return statistics with explicit type casting
  RETURN QUERY
  SELECT 
    -- Total counts - ensure BIGINT
    COUNT(*)::BIGINT as total_transcriptions,
    COUNT(m.id)::BIGINT as total_meetings,
    COALESCE(SUM(
      CASE 
        WHEN tj.duration_seconds IS NOT NULL THEN tj.duration_seconds::NUMERIC / 3600
        WHEN m.duration_minutes IS NOT NULL THEN m.duration_minutes::NUMERIC / 60
        ELSE 0
      END
    ), 0)::NUMERIC as total_hours,
    
    -- This month counts - ensure BIGINT
    COUNT(*) FILTER (WHERE tj.created_at >= month_start)::BIGINT as this_month_transcriptions,
    COUNT(m.id) FILTER (WHERE tj.created_at >= month_start)::BIGINT as this_month_meetings,
    COALESCE(SUM(
      CASE 
        WHEN tj.created_at >= month_start AND tj.duration_seconds IS NOT NULL THEN tj.duration_seconds::NUMERIC / 3600
        WHEN tj.created_at >= month_start AND m.duration_minutes IS NOT NULL THEN m.duration_minutes::NUMERIC / 60
        ELSE 0
      END
    ), 0)::NUMERIC as this_month_hours,
    
    -- Status counts - ensure BIGINT
    COUNT(*) FILTER (WHERE tj.status = 'completed')::BIGINT as completed_transcriptions,
    COUNT(*) FILTER (WHERE tj.status = 'processing')::BIGINT as processing_transcriptions,
    COUNT(*) FILTER (WHERE tj.status = 'failed')::BIGINT as failed_transcriptions
    
  FROM transcription_jobs tj
  LEFT JOIN meetings m ON tj.id = m.transcription_job_id
  WHERE tj.user_id = target_user_id;
END;
$function$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_transcription_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_meeting_stats TO authenticated;

COMMIT;