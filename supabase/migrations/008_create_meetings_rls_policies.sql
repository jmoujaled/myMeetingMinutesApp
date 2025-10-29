-- Row Level Security (RLS) policies for meetings table
-- Ensures users can only access their own meeting records

BEGIN;

-- Enable RLS on meetings table
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own meetings
CREATE POLICY "Users can view own meetings" ON meetings
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can only insert meetings for themselves
CREATE POLICY "Users can insert own meetings" ON meetings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own meetings
CREATE POLICY "Users can update own meetings" ON meetings
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can only delete their own meetings
CREATE POLICY "Users can delete own meetings" ON meetings
  FOR DELETE USING (auth.uid() = user_id);

-- Admin users can access all meetings (for admin dashboard functionality)
CREATE POLICY "Admins can view all meetings" ON meetings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND tier = 'admin'
    )
  );

CREATE POLICY "Admins can update all meetings" ON meetings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND tier = 'admin'
    )
  );

CREATE POLICY "Admins can delete all meetings" ON meetings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND tier = 'admin'
    )
  );

-- Create security definer function for the view to bypass RLS when needed
-- This allows the view to work properly while maintaining security
CREATE OR REPLACE FUNCTION get_user_transcription_history(
  target_user_id UUID DEFAULT NULL,
  search_query TEXT DEFAULT NULL,
  date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  status_filter TEXT DEFAULT NULL,
  record_type_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 50,
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
  usage_cost INTEGER,
  transcription_metadata JSONB,
  meeting_id UUID,
  meeting_title VARCHAR(255),
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
  search_vector TSVECTOR,
  display_status TEXT,
  action_items_count INTEGER
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
    RAISE EXCEPTION 'Access denied: You can only access your own transcription history';
  END IF;
  
  -- Return filtered results
  RETURN QUERY
  SELECT 
    uth.id,
    uth.user_id,
    uth.filename,
    uth.status,
    uth.duration_seconds,
    uth.file_size,
    uth.created_at,
    uth.completed_at,
    uth.error_message,
    uth.tier,
    uth.usage_cost,
    uth.transcription_metadata,
    uth.meeting_id,
    uth.meeting_title,
    uth.meeting_description,
    uth.meeting_date,
    uth.duration_minutes,
    uth.attendees,
    uth.summary,
    uth.action_items,
    uth.key_topics,
    uth.audio_file_url,
    uth.transcript_file_url,
    uth.summary_file_url,
    uth.meeting_updated_at,
    uth.record_type,
    uth.search_vector,
    uth.display_status,
    uth.action_items_count
  FROM user_transcription_history uth
  WHERE 
    uth.user_id = target_user_id
    AND (search_query IS NULL OR uth.search_vector @@ plainto_tsquery('english', search_query))
    AND (date_from IS NULL OR uth.created_at >= date_from)
    AND (date_to IS NULL OR uth.created_at <= date_to)
    AND (status_filter IS NULL OR uth.status = status_filter)
    AND (record_type_filter IS NULL OR uth.record_type = record_type_filter)
  ORDER BY uth.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$function$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_transcription_history TO authenticated;

COMMIT;