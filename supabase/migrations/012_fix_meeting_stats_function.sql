-- Fix the get_user_meeting_stats function to resolve ambiguous tier reference
BEGIN;

-- Drop and recreate the function with explicit table references
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
  
  -- Return statistics
  RETURN QUERY
  SELECT 
    -- Total counts
    COUNT(*) as total_transcriptions,
    COUNT(m.id) as total_meetings,
    COALESCE(SUM(
      CASE 
        WHEN tj.duration_seconds IS NOT NULL THEN tj.duration_seconds::NUMERIC / 3600
        WHEN m.duration_minutes IS NOT NULL THEN m.duration_minutes::NUMERIC / 60
        ELSE 0
      END
    ), 0) as total_hours,
    
    -- This month counts
    COUNT(*) FILTER (WHERE tj.created_at >= month_start) as this_month_transcriptions,
    COUNT(m.id) FILTER (WHERE tj.created_at >= month_start) as this_month_meetings,
    COALESCE(SUM(
      CASE 
        WHEN tj.created_at >= month_start AND tj.duration_seconds IS NOT NULL THEN tj.duration_seconds::NUMERIC / 3600
        WHEN tj.created_at >= month_start AND m.duration_minutes IS NOT NULL THEN m.duration_minutes::NUMERIC / 60
        ELSE 0
      END
    ), 0) as this_month_hours,
    
    -- Status counts
    COUNT(*) FILTER (WHERE tj.status = 'completed') as completed_transcriptions,
    COUNT(*) FILTER (WHERE tj.status = 'processing') as processing_transcriptions,
    COUNT(*) FILTER (WHERE tj.status = 'failed') as failed_transcriptions
    
  FROM transcription_jobs tj
  LEFT JOIN meetings m ON tj.id = m.transcription_job_id
  WHERE tj.user_id = target_user_id;
END;
$function$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_meeting_stats TO authenticated;

COMMIT;