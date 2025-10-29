-- Create tier_limits table for subscription management
CREATE TABLE tier_limits (
  tier TEXT PRIMARY KEY CHECK (tier IN ('free', 'pro', 'admin')),
  
  -- Usage limits
  monthly_transcription_limit INTEGER NOT NULL,
  max_file_size_mb INTEGER NOT NULL,
  max_duration_minutes INTEGER NOT NULL,
  
  -- Feature configuration
  features JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default tier configurations (free, pro, admin)
INSERT INTO tier_limits (tier, monthly_transcription_limit, max_file_size_mb, max_duration_minutes, features) VALUES
(
  'free',
  5, -- 5 transcriptions per month
  150, -- 150MB max file size
  60, -- 60 minutes max duration
  '{
    "basic_transcription": true,
    "speaker_diarization": false,
    "summaries": false,
    "translations": false,
    "admin_dashboard": false,
    "user_management": false
  }'::jsonb
),
(
  'pro',
  -1, -- unlimited transcriptions per month
  -1, -- unlimited file size
  -1, -- unlimited duration
  '{
    "basic_transcription": true,
    "speaker_diarization": true,
    "summaries": true,
    "translations": true,
    "admin_dashboard": false,
    "user_management": false
  }'::jsonb
),
(
  'admin',
  -1, -- unlimited transcriptions
  -1, -- unlimited file size
  -1, -- unlimited duration
  '{
    "basic_transcription": true,
    "speaker_diarization": true,
    "summaries": true,
    "translations": true,
    "admin_dashboard": true,
    "user_management": true,
    "all_features": true
  }'::jsonb
);

-- Create updated_at trigger for tier_limits
CREATE TRIGGER update_tier_limits_updated_at 
    BEFORE UPDATE ON tier_limits 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to get tier limits for a user
CREATE OR REPLACE FUNCTION get_user_tier_limits(user_tier TEXT)
RETURNS TABLE (
  tier TEXT,
  monthly_transcription_limit INTEGER,
  max_file_size_mb INTEGER,
  max_duration_minutes INTEGER,
  features JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tl.tier,
    tl.monthly_transcription_limit,
    tl.max_file_size_mb,
    tl.max_duration_minutes,
    tl.features
  FROM tier_limits tl
  WHERE tl.tier = user_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can perform transcription based on tier limits
CREATE OR REPLACE FUNCTION can_user_transcribe(
  user_id UUID,
  file_size_mb INTEGER DEFAULT NULL,
  duration_minutes INTEGER DEFAULT NULL
)
RETURNS TABLE (
  can_transcribe BOOLEAN,
  reason TEXT,
  current_usage INTEGER,
  usage_limit INTEGER
) AS $$
DECLARE
  user_tier TEXT;
  user_usage INTEGER;
  tier_limit INTEGER;
  max_file_size INTEGER;
  max_duration INTEGER;
BEGIN
  -- Get user tier and current usage
  SELECT up.tier, up.monthly_transcriptions_used
  INTO user_tier, user_usage
  FROM user_profiles up
  WHERE up.id = user_id;
  
  -- Get tier limits
  SELECT tl.monthly_transcription_limit, tl.max_file_size_mb, tl.max_duration_minutes
  INTO tier_limit, max_file_size, max_duration
  FROM tier_limits tl
  WHERE tl.tier = user_tier;
  
  -- Check usage limit (admin has unlimited = -1)
  IF tier_limit != -1 AND user_usage >= tier_limit THEN
    RETURN QUERY SELECT FALSE, 'Monthly transcription limit exceeded', user_usage, tier_limit;
    RETURN;
  END IF;
  
  -- Check file size limit
  IF file_size_mb IS NOT NULL AND max_file_size != -1 AND file_size_mb > max_file_size THEN
    RETURN QUERY SELECT FALSE, 'File size exceeds tier limit', user_usage, tier_limit;
    RETURN;
  END IF;
  
  -- Check duration limit
  IF duration_minutes IS NOT NULL AND max_duration != -1 AND duration_minutes > max_duration THEN
    RETURN QUERY SELECT FALSE, 'Audio duration exceeds tier limit', user_usage, tier_limit;
    RETURN;
  END IF;
  
  -- All checks passed
  RETURN QUERY SELECT TRUE, 'OK', user_usage, tier_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;