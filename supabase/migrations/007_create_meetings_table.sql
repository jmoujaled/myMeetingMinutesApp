-- Create meetings table for enhanced transcription management
-- This migration adds the meetings functionality to store processed meeting data
-- with summaries, action items, and enhanced metadata

BEGIN;

-- Create meetings table
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  transcription_job_id UUID REFERENCES transcription_jobs(id) ON DELETE SET NULL,
  
  -- Meeting Metadata
  title VARCHAR(255) NOT NULL,
  description TEXT,
  meeting_date TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  attendees TEXT[], -- Array of attendee names/emails
  
  -- Content
  transcript_text TEXT,
  summary TEXT,
  action_items JSONB DEFAULT '[]'::jsonb, -- Structured action items with assignees, due dates
  key_topics TEXT[],
  
  -- File References
  audio_file_url TEXT,
  transcript_file_url TEXT,
  summary_file_url TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Search optimization - Full-text search vector
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', 
      COALESCE(title, '') || ' ' || 
      COALESCE(description, '') || ' ' || 
      COALESCE(transcript_text, '')
    )
  ) STORED,
  
  -- Constraints
  CONSTRAINT meetings_duration_positive CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  CONSTRAINT meetings_title_not_empty CHECK (length(trim(title)) > 0)
);

-- Create indexes for performance optimization
CREATE INDEX idx_meetings_user_id ON meetings(user_id);
CREATE INDEX idx_meetings_user_created ON meetings(user_id, created_at DESC);
CREATE INDEX idx_meetings_date ON meetings(meeting_date DESC) WHERE meeting_date IS NOT NULL;
CREATE INDEX idx_meetings_search ON meetings USING GIN(search_vector);
CREATE INDEX idx_meetings_created_at ON meetings(created_at DESC);
CREATE INDEX idx_meetings_transcription_job ON meetings(transcription_job_id) WHERE transcription_job_id IS NOT NULL;

-- Create updated_at trigger for meetings table
CREATE TRIGGER update_meetings_updated_at 
    BEFORE UPDATE ON meetings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create view for combined transcription and meeting data
CREATE VIEW user_transcription_history AS
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
  tj.tier,
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
  
  -- Search relevance (for future use)
  CASE 
    WHEN m.search_vector IS NOT NULL THEN m.search_vector
    ELSE to_tsvector('english', COALESCE(tj.filename, ''))
  END as search_vector,
  
  -- Status indicators
  CASE 
    WHEN tj.status = 'completed' AND m.id IS NOT NULL THEN 'meeting_saved'
    ELSE tj.status
  END as display_status,
  
  -- Action items count
  CASE 
    WHEN m.action_items IS NOT NULL THEN jsonb_array_length(m.action_items)
    ELSE 0
  END as action_items_count

FROM transcription_jobs tj
LEFT JOIN meetings m ON tj.id = m.transcription_job_id
ORDER BY tj.created_at DESC;

-- Create index on the view for better performance
CREATE INDEX idx_user_transcription_history_user_created 
ON transcription_jobs(user_id, created_at DESC);

COMMIT;