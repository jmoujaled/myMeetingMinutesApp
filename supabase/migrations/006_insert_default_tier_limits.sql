-- Insert default tier limits if they don't exist
-- This migration ensures tier limits are always available

-- Temporarily disable RLS for this migration
ALTER TABLE tier_limits DISABLE ROW LEVEL SECURITY;

-- Insert or update default tier configurations
INSERT INTO tier_limits (tier, monthly_transcription_limit, max_file_size_mb, max_duration_minutes, features) 
VALUES
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
)
ON CONFLICT (tier) DO UPDATE SET
  monthly_transcription_limit = EXCLUDED.monthly_transcription_limit,
  max_file_size_mb = EXCLUDED.max_file_size_mb,
  max_duration_minutes = EXCLUDED.max_duration_minutes,
  features = EXCLUDED.features,
  updated_at = NOW();

-- Re-enable RLS
ALTER TABLE tier_limits ENABLE ROW LEVEL SECURITY;