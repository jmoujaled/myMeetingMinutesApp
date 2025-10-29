-- Fix database function errors
-- This migration fixes the ambiguous column reference and type mismatch issues

BEGIN;

-- Fix the ambiguous tier column reference in get_user_transcription_history function
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
    
    -- Action items count
    CASE 
      WHEN m.action_items IS NOT NULL THEN jsonb_array_length(m.action_items)
      ELSE 0
    END as action_items_count,
    
    -- Search ranking (higher is more relevant)
    CASE 
      WHEN search_ts_query IS NOT NULL THEN
        GREATEST(
          COALESCE(ts_rank(m.search_vector, search_ts_query), 0),
          COALESCE(ts_rank(to_tsvector('english', COALESCE(tj.filename, '')), search_ts_query), 0)
        )
      ELSE 0
    END::REAL as search_rank
    
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
    CASE 
      WHEN search_ts_query IS NOT NULL THEN
        GREATEST(
          COALESCE(ts_rank(m.search_vector, search_ts_query), 0),
          COALESCE(ts_rank(to_tsvector('english', COALESCE(tj.filename, '')), search_ts_query), 0)
        )
      ELSE 0
    END DESC,
    tj.created_at DESC
  LIMIT COALESCE(limit_count, 20)
  OFFSET COALESCE(offset_count, 0);
END;
$function$;

-- Fix the count function as well
DROP FUNCTION IF EXISTS get_user_transcription_history_count(UUID, TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, TEXT, TEXT);

CREATE OR REPLACE FUNCTION get_user_transcription_history_count(
  target_user_id UUID,
  search_query TEXT DEFAULT NULL,
  date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  status_filter TEXT DEFAULT NULL,
  record_type_filter TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  requesting_user_id UUID;
  is_admin BOOLEAN;
  search_ts_query TSQUERY;
  result_count BIGINT;
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
  
  -- Count records with all filters applied
  SELECT COUNT(*)
  INTO result_count
  FROM transcription_jobs tj
  LEFT JOIN meetings m ON tj.id = m.transcription_job_id
  WHERE tj.user_id = target_user_id
    AND (search_ts_query IS NULL OR 
         m.search_vector @@ search_ts_query OR 
         to_tsvector('english', COALESCE(tj.filename, '')) @@ search_ts_query)
    AND (date_from IS NULL OR tj.created_at >= date_from)
    AND (date_to IS NULL OR tj.created_at <= date_to)
    AND (status_filter IS NULL OR status_filter = 'all' OR tj.status = status_filter)
    AND (record_type_filter IS NULL OR record_type_filter = 'all' OR
         (record_type_filter = 'meetings' AND m.id IS NOT NULL) OR
         (record_type_filter = 'transcriptions' AND m.id IS NULL));
  
  RETURN result_count;
END;
$function$;

-- Fix the analytics function type mismatch
DROP FUNCTION IF EXISTS get_search_analytics(UUID, INTEGER);

CREATE OR REPLACE FUNCTION get_search_analytics(
  target_user_id UUID,
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_searchable_items INTEGER,
  meetings_with_transcripts INTEGER,
  avg_transcript_length INTEGER,
  most_common_topics TEXT[],
  search_coverage_score REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  requesting_user_id UUID;
  is_admin BOOLEAN;
  cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get the requesting user's ID
  requesting_user_id := auth.uid();
  
  -- Check if user is admin (explicitly reference user_profiles.tier)
  SELECT (up.tier = 'admin') INTO is_admin 
  FROM user_profiles up
  WHERE up.id = requesting_user_id;
  
  -- Security check: non-admin users can only access their own data
  IF NOT is_admin AND target_user_id != requesting_user_id THEN
    RAISE EXCEPTION 'Access denied: You can only get analytics for your own content';
  END IF;
  
  -- Calculate cutoff date
  cutoff_date := NOW() - (days_back || ' days')::INTERVAL;
  
  -- Return analytics data
  RETURN QUERY
  WITH analytics_data AS (
    SELECT 
      COUNT(*)::INTEGER as total_items,
      COUNT(m.id)::INTEGER as meetings_count,
      COUNT(CASE WHEN m.transcript_text IS NOT NULL THEN 1 END)::INTEGER as meetings_with_transcripts_count,
      COALESCE(AVG(LENGTH(COALESCE(m.transcript_text, '')))::INTEGER, 0) as avg_length,
      ARRAY_AGG(DISTINCT topic) FILTER (WHERE topic IS NOT NULL) as all_topics
    FROM transcription_jobs tj
    LEFT JOIN meetings m ON tj.id = m.transcription_job_id
    LEFT JOIN LATERAL UNNEST(COALESCE(m.key_topics, ARRAY[]::TEXT[])) AS topic ON true
    WHERE tj.user_id = target_user_id
      AND tj.created_at >= cutoff_date
  )
  SELECT 
    ad.total_items,
    ad.meetings_with_transcripts_count,
    ad.avg_length,
    -- Get top 10 most common topics
    COALESCE(
      (
        SELECT ARRAY_AGG(topic ORDER BY topic_count DESC)
        FROM (
          SELECT topic, COUNT(*) as topic_count
          FROM UNNEST(COALESCE(ad.all_topics, ARRAY[]::TEXT[])) AS topic
          GROUP BY topic
          ORDER BY topic_count DESC
          LIMIT 10
        ) top_topics
      ),
      ARRAY[]::TEXT[]
    ) as most_common_topics,
    -- Calculate search coverage score (percentage of items with searchable content)
    CASE 
      WHEN ad.total_items > 0 THEN
        (ad.meetings_with_transcripts_count::REAL / ad.total_items::REAL) * 100
      ELSE 0::REAL
    END as search_coverage_score
  FROM analytics_data ad;
END;
$function$;

-- Fix other functions that might have the same tier ambiguity issue
DROP FUNCTION IF EXISTS search_transcription_content(UUID, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION search_transcription_content(
  target_user_id UUID,
  search_query TEXT,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  record_type TEXT,
  title TEXT,
  filename TEXT,
  snippet TEXT,
  rank REAL,
  created_at TIMESTAMP WITH TIME ZONE
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
    RAISE EXCEPTION 'Access denied: You can only search your own content';
  END IF;
  
  -- Create search query
  search_ts_query := plainto_tsquery('english', search_query);
  
  -- Return search results with snippets and ranking
  RETURN QUERY
  SELECT 
    tj.id,
    CASE WHEN m.id IS NOT NULL THEN 'meeting' ELSE 'transcription' END as record_type,
    COALESCE(m.title, tj.filename) as title,
    tj.filename,
    CASE 
      WHEN m.search_vector @@ search_ts_query THEN
        ts_headline('english', 
          COALESCE(m.title, '') || ' ' || COALESCE(m.description, '') || ' ' || COALESCE(m.transcript_text, ''),
          search_ts_query,
          'MaxWords=20, MinWords=10, ShortWord=3, HighlightAll=false, MaxFragments=1'
        )
      ELSE
        ts_headline('english', 
          tj.filename,
          search_ts_query,
          'MaxWords=20, MinWords=5, ShortWord=3, HighlightAll=false, MaxFragments=1'
        )
    END as snippet,
    GREATEST(
      COALESCE(ts_rank(m.search_vector, search_ts_query), 0),
      COALESCE(ts_rank(to_tsvector('english', tj.filename), search_ts_query), 0)
    ) as rank,
    tj.created_at
  FROM transcription_jobs tj
  LEFT JOIN meetings m ON tj.id = m.transcription_job_id
  WHERE tj.user_id = target_user_id
    AND (m.search_vector @@ search_ts_query OR 
         to_tsvector('english', tj.filename) @@ search_ts_query)
  ORDER BY rank DESC, tj.created_at DESC
  LIMIT limit_count;
END;
$function$;

-- Fix get_search_suggestions function
DROP FUNCTION IF EXISTS get_search_suggestions(UUID, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION get_search_suggestions(
  target_user_id UUID,
  search_prefix TEXT,
  limit_count INTEGER DEFAULT 5
)
RETURNS TABLE (
  suggestion TEXT,
  match_count INTEGER,
  record_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  requesting_user_id UUID;
  is_admin BOOLEAN;
BEGIN
  -- Get the requesting user's ID
  requesting_user_id := auth.uid();
  
  -- Check if user is admin (explicitly reference user_profiles.tier)
  SELECT (up.tier = 'admin') INTO is_admin 
  FROM user_profiles up
  WHERE up.id = requesting_user_id;
  
  -- Security check: non-admin users can only access their own data
  IF NOT is_admin AND target_user_id != requesting_user_id THEN
    RAISE EXCEPTION 'Access denied: You can only get suggestions for your own content';
  END IF;
  
  -- Return suggestions based on meeting titles, key topics, and filenames
  RETURN QUERY
  WITH suggestions AS (
    -- Meeting titles
    SELECT 
      m.title as suggestion,
      1 as match_count,
      'meeting' as record_type
    FROM meetings m
    JOIN transcription_jobs tj ON m.transcription_job_id = tj.id
    WHERE tj.user_id = target_user_id
      AND m.title IS NOT NULL
      AND LOWER(m.title) LIKE LOWER(search_prefix || '%')
    
    UNION ALL
    
    -- Key topics from meetings
    SELECT 
      UNNEST(m.key_topics) as suggestion,
      1 as match_count,
      'topic' as record_type
    FROM meetings m
    JOIN transcription_jobs tj ON m.transcription_job_id = tj.id
    WHERE tj.user_id = target_user_id
      AND m.key_topics IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM UNNEST(m.key_topics) AS topic
        WHERE LOWER(topic) LIKE LOWER(search_prefix || '%')
      )
    
    UNION ALL
    
    -- Filenames
    SELECT 
      tj.filename as suggestion,
      1 as match_count,
      'filename' as record_type
    FROM transcription_jobs tj
    WHERE tj.user_id = target_user_id
      AND tj.filename IS NOT NULL
      AND LOWER(tj.filename) LIKE LOWER(search_prefix || '%')
  )
  SELECT 
    s.suggestion,
    SUM(s.match_count)::INTEGER as match_count,
    s.record_type
  FROM suggestions s
  GROUP BY s.suggestion, s.record_type
  ORDER BY match_count DESC, LENGTH(s.suggestion) ASC
  LIMIT limit_count;
END;
$function$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_transcription_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_transcription_history_count TO authenticated;
GRANT EXECUTE ON FUNCTION search_transcription_content TO authenticated;
GRANT EXECUTE ON FUNCTION get_search_suggestions TO authenticated;
GRANT EXECUTE ON FUNCTION get_search_analytics TO authenticated;

COMMIT;