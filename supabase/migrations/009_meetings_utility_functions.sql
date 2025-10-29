-- Utility functions for meetings management
-- This migration adds helper functions for common operations

BEGIN;

-- Function to get meeting statistics for a user
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
  
  -- Check if user is admin
  SELECT (tier = 'admin') INTO is_admin 
  FROM user_profiles 
  WHERE id = requesting_user_id;
  
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

-- Function to create a meeting from a transcription job
CREATE OR REPLACE FUNCTION create_meeting_from_transcription(
  p_transcription_job_id UUID,
  p_title VARCHAR(255),
  p_description TEXT DEFAULT NULL,
  p_meeting_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_attendees TEXT[] DEFAULT NULL,
  p_summary TEXT DEFAULT NULL,
  p_action_items JSONB DEFAULT '[]'::jsonb,
  p_key_topics TEXT[] DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_meeting_id UUID;
  v_transcript_text TEXT;
  v_duration_seconds INTEGER;
  requesting_user_id UUID;
BEGIN
  -- Get the requesting user's ID
  requesting_user_id := auth.uid();
  
  -- Get transcription job details and verify ownership
  SELECT user_id, duration_seconds, metadata->>'transcript_text'
  INTO v_user_id, v_duration_seconds, v_transcript_text
  FROM transcription_jobs 
  WHERE id = p_transcription_job_id AND status = 'completed';
  
  -- Check if transcription job exists and user has access
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Transcription job not found or not completed';
  END IF;
  
  -- Security check: user can only create meetings from their own transcriptions
  IF v_user_id != requesting_user_id THEN
    RAISE EXCEPTION 'Access denied: You can only create meetings from your own transcriptions';
  END IF;
  
  -- Check if meeting already exists for this transcription
  IF EXISTS (SELECT 1 FROM meetings WHERE transcription_job_id = p_transcription_job_id) THEN
    RAISE EXCEPTION 'Meeting already exists for this transcription job';
  END IF;
  
  -- Create the meeting record
  INSERT INTO meetings (
    user_id,
    transcription_job_id,
    title,
    description,
    meeting_date,
    duration_minutes,
    attendees,
    transcript_text,
    summary,
    action_items,
    key_topics
  ) VALUES (
    v_user_id,
    p_transcription_job_id,
    p_title,
    p_description,
    COALESCE(p_meeting_date, NOW()),
    CASE WHEN v_duration_seconds IS NOT NULL THEN ROUND(v_duration_seconds::NUMERIC / 60) ELSE NULL END,
    p_attendees,
    v_transcript_text,
    p_summary,
    p_action_items,
    p_key_topics
  ) RETURNING id INTO v_meeting_id;
  
  RETURN v_meeting_id;
END;
$function$;

-- Function to update action items in a meeting
CREATE OR REPLACE FUNCTION update_meeting_action_items(
  p_meeting_id UUID,
  p_action_items JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  requesting_user_id UUID;
BEGIN
  -- Get the requesting user's ID
  requesting_user_id := auth.uid();
  
  -- Get meeting owner
  SELECT user_id INTO v_user_id
  FROM meetings 
  WHERE id = p_meeting_id;
  
  -- Check if meeting exists
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Meeting not found';
  END IF;
  
  -- Security check: user can only update their own meetings
  IF v_user_id != requesting_user_id THEN
    RAISE EXCEPTION 'Access denied: You can only update your own meetings';
  END IF;
  
  -- Update action items
  UPDATE meetings 
  SET 
    action_items = p_action_items,
    updated_at = NOW()
  WHERE id = p_meeting_id;
  
  RETURN TRUE;
END;
$function$;

-- Function to delete a meeting (soft delete by removing meeting record but keeping transcription)
CREATE OR REPLACE FUNCTION delete_meeting(p_meeting_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  requesting_user_id UUID;
BEGIN
  -- Get the requesting user's ID
  requesting_user_id := auth.uid();
  
  -- Get meeting owner
  SELECT user_id INTO v_user_id
  FROM meetings 
  WHERE id = p_meeting_id;
  
  -- Check if meeting exists
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Meeting not found';
  END IF;
  
  -- Security check: user can only delete their own meetings
  IF v_user_id != requesting_user_id THEN
    RAISE EXCEPTION 'Access denied: You can only delete your own meetings';
  END IF;
  
  -- Delete the meeting (transcription_job remains)
  DELETE FROM meetings WHERE id = p_meeting_id;
  
  RETURN TRUE;
END;
$function$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_meeting_stats TO authenticated;
GRANT EXECUTE ON FUNCTION create_meeting_from_transcription TO authenticated;
GRANT EXECUTE ON FUNCTION update_meeting_action_items TO authenticated;
GRANT EXECUTE ON FUNCTION delete_meeting TO authenticated;

COMMIT;