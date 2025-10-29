-- Add missing analytics and search functions
-- This migration adds the remaining functions needed for the meetings system

BEGIN;

-- Create the search analytics function
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
  is_admin BOOLEAN := false;
  cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get the requesting user's ID
  requesting_user_id := auth.uid();
  
  -- Check if user is admin (with error handling)
  BEGIN
    SELECT (up.tier = 'admin') INTO is_admin 
    FROM user_profiles up
    WHERE up.id = requesting_user_id;
  EXCEPTION WHEN OTHERS THEN
    is_admin := false;
  END;
  
  -- Security check: non-admin users can only access their own data
  IF NOT is_admin AND target_user_id != requesting_user_id THEN
    RAISE EXCEPTION 'Access denied: You can only get analytics for your own content';
  END IF;
  
  -- Calculate cutoff date
  cutoff_date := NOW() - (days_back || ' days')::INTERVAL;
  
  -- Return analytics data with explicit type casting
  RETURN QUERY
  WITH analytics_data AS (
    SELECT 
      COUNT(*)::INTEGER as total_items,
      COUNT(m.id)::INTEGER as meetings_count,
      COUNT(CASE WHEN m.transcript_text IS NOT NULL AND length(m.transcript_text) > 0 THEN 1 END)::INTEGER as meetings_with_transcripts_count,
      COALESCE(AVG(LENGTH(COALESCE(m.transcript_text, '')))::INTEGER, 0) as avg_length,
      ARRAY_AGG(DISTINCT topic) FILTER (WHERE topic IS NOT NULL) as all_topics
    FROM transcription_jobs tj
    LEFT JOIN meetings m ON tj.id = m.transcription_job_id
    LEFT JOIN LATERAL UNNEST(COALESCE(m.key_topics, ARRAY[]::TEXT[])) AS topic ON true
    WHERE tj.user_id = target_user_id
      AND tj.created_at >= cutoff_date
  )
  SELECT 
    ad.total_items::INTEGER,
    ad.meetings_with_transcripts_count::INTEGER,
    ad.avg_length::INTEGER,
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
    )::TEXT[] as most_common_topics,
    -- Calculate search coverage score (percentage of items with searchable content)
    CASE 
      WHEN ad.total_items > 0 THEN
        (ad.meetings_with_transcripts_count::REAL / ad.total_items::REAL) * 100::REAL
      ELSE 0::REAL
    END::REAL as search_coverage_score
  FROM analytics_data ad;
END;
$function$;

-- Create the search content function
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
  is_admin BOOLEAN := false;
  search_ts_query TSQUERY;
BEGIN
  -- Get the requesting user's ID
  requesting_user_id := auth.uid();
  
  -- Check if user is admin (with error handling)
  BEGIN
    SELECT (up.tier = 'admin') INTO is_admin 
    FROM user_profiles up
    WHERE up.id = requesting_user_id;
  EXCEPTION WHEN OTHERS THEN
    is_admin := false;
  END;
  
  -- Security check: non-admin users can only access their own data
  IF NOT is_admin AND target_user_id != requesting_user_id THEN
    RAISE EXCEPTION 'Access denied: You can only search your own content';
  END IF;
  
  -- Create search query
  search_ts_query := plainto_tsquery('english', search_query);
  
  -- Return search results with snippets and ranking
  RETURN QUERY
  SELECT 
    tj.id::UUID,
    CASE WHEN m.id IS NOT NULL THEN 'meeting'::TEXT ELSE 'transcription'::TEXT END as record_type,
    COALESCE(m.title, tj.filename)::TEXT as title,
    tj.filename::TEXT,
    CASE 
      WHEN m.search_vector IS NOT NULL AND m.search_vector @@ search_ts_query THEN
        ts_headline('english', 
          COALESCE(m.title, '') || ' ' || COALESCE(m.description, '') || ' ' || COALESCE(m.transcript_text, ''),
          search_ts_query,
          'MaxWords=20, MinWords=10, ShortWord=3, HighlightAll=false, MaxFragments=1'
        )::TEXT
      ELSE
        ts_headline('english', 
          tj.filename,
          search_ts_query,
          'MaxWords=20, MinWords=5, ShortWord=3, HighlightAll=false, MaxFragments=1'
        )::TEXT
    END as snippet,
    GREATEST(
      COALESCE(ts_rank(m.search_vector, search_ts_query), 0::real),
      COALESCE(ts_rank(to_tsvector('english', tj.filename), search_ts_query), 0::real)
    )::REAL as rank,
    tj.created_at::TIMESTAMP WITH TIME ZONE
  FROM transcription_jobs tj
  LEFT JOIN meetings m ON tj.id = m.transcription_job_id
  WHERE tj.user_id = target_user_id
    AND ((m.search_vector IS NOT NULL AND m.search_vector @@ search_ts_query) OR 
         to_tsvector('english', tj.filename) @@ search_ts_query)
  ORDER BY rank DESC, tj.created_at DESC
  LIMIT limit_count;
END;
$function$;

-- Create the search suggestions function
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
  is_admin BOOLEAN := false;
BEGIN
  -- Get the requesting user's ID
  requesting_user_id := auth.uid();
  
  -- Check if user is admin (with error handling)
  BEGIN
    SELECT (up.tier = 'admin') INTO is_admin 
    FROM user_profiles up
    WHERE up.id = requesting_user_id;
  EXCEPTION WHEN OTHERS THEN
    is_admin := false;
  END;
  
  -- Security check: non-admin users can only access their own data
  IF NOT is_admin AND target_user_id != requesting_user_id THEN
    RAISE EXCEPTION 'Access denied: You can only get suggestions for your own content';
  END IF;
  
  -- Return suggestions based on meeting titles, key topics, and filenames
  RETURN QUERY
  WITH suggestions AS (
    -- Meeting titles
    SELECT 
      m.title::TEXT as suggestion,
      1 as match_count,
      'meeting'::TEXT as record_type
    FROM meetings m
    JOIN transcription_jobs tj ON m.transcription_job_id = tj.id
    WHERE tj.user_id = target_user_id
      AND m.title IS NOT NULL
      AND LOWER(m.title) LIKE LOWER(search_prefix || '%')
    
    UNION ALL
    
    -- Key topics from meetings
    SELECT 
      UNNEST(m.key_topics)::TEXT as suggestion,
      1 as match_count,
      'topic'::TEXT as record_type
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
      tj.filename::TEXT as suggestion,
      1 as match_count,
      'filename'::TEXT as record_type
    FROM transcription_jobs tj
    WHERE tj.user_id = target_user_id
      AND tj.filename IS NOT NULL
      AND LOWER(tj.filename) LIKE LOWER(search_prefix || '%')
  )
  SELECT 
    s.suggestion::TEXT,
    SUM(s.match_count)::INTEGER as match_count,
    s.record_type::TEXT
  FROM suggestions s
  GROUP BY s.suggestion, s.record_type
  ORDER BY match_count DESC, LENGTH(s.suggestion) ASC
  LIMIT limit_count;
END;
$function$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_search_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION search_transcription_content TO authenticated;
GRANT EXECUTE ON FUNCTION get_search_suggestions TO authenticated;

COMMIT;