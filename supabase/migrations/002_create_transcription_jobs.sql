-- Create transcription_jobs table for usage tracking
CREATE TABLE transcription_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Speechmatics job information
  job_id TEXT, -- Speechmatics job ID
  filename TEXT NOT NULL,
  file_size BIGINT, -- File size in bytes
  duration_seconds INTEGER, -- Audio duration in seconds
  
  -- Job status and tracking
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'cancelled')),
  tier TEXT NOT NULL CHECK (tier IN ('free', 'pro', 'admin')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Error handling
  error_message TEXT,
  
  -- Usage tracking
  usage_cost INTEGER DEFAULT 1, -- Usage units consumed (for future billing)
  
  -- Additional job metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for efficient querying by user_id and created_at
CREATE INDEX idx_transcription_jobs_user_id ON transcription_jobs(user_id);
CREATE INDEX idx_transcription_jobs_created_at ON transcription_jobs(created_at);
CREATE INDEX idx_transcription_jobs_user_created ON transcription_jobs(user_id, created_at);
CREATE INDEX idx_transcription_jobs_status ON transcription_jobs(status);
CREATE INDEX idx_transcription_jobs_tier ON transcription_jobs(tier);
CREATE INDEX idx_transcription_jobs_job_id ON transcription_jobs(job_id) WHERE job_id IS NOT NULL;

-- Function to update user usage when transcription job is completed
CREATE OR REPLACE FUNCTION update_user_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update usage when job status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE user_profiles 
    SET 
      monthly_transcriptions_used = monthly_transcriptions_used + NEW.usage_cost,
      total_transcriptions = total_transcriptions + NEW.usage_cost,
      updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update user usage when job completes
CREATE TRIGGER on_transcription_job_completed
  AFTER INSERT OR UPDATE ON transcription_jobs
  FOR EACH ROW 
  EXECUTE FUNCTION update_user_usage();