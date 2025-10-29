-- Enable Row Level Security on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcription_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_limits ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND tier = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to prevent tier changes by non-admins
CREATE OR REPLACE FUNCTION prevent_tier_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow admins to change any tier
  IF is_admin() THEN
    RETURN NEW;
  END IF;
  
  -- For non-admins, preserve the old tier
  IF OLD.tier != NEW.tier THEN
    NEW.tier = OLD.tier;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to prevent tier changes by non-admins
CREATE TRIGGER prevent_user_tier_change
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_tier_change();

-- =============================================
-- USER_PROFILES TABLE RLS POLICIES
-- =============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT 
  USING (auth.uid() = id);

-- Users can update their own profile (except tier)
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (handled by trigger, but needed for RLS)
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT 
  USING (is_admin());

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles" ON user_profiles
  FOR UPDATE 
  USING (is_admin());

-- Admins can insert profiles
CREATE POLICY "Admins can insert profiles" ON user_profiles
  FOR INSERT 
  WITH CHECK (is_admin());

-- Admins can delete profiles
CREATE POLICY "Admins can delete profiles" ON user_profiles
  FOR DELETE 
  USING (is_admin());

-- =============================================
-- TRANSCRIPTION_JOBS TABLE RLS POLICIES
-- =============================================

-- Users can view their own transcription jobs
CREATE POLICY "Users can view own jobs" ON transcription_jobs
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert their own transcription jobs
CREATE POLICY "Users can insert own jobs" ON transcription_jobs
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own transcription jobs
CREATE POLICY "Users can update own jobs" ON transcription_jobs
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own transcription jobs
CREATE POLICY "Users can delete own jobs" ON transcription_jobs
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Admins can view all transcription jobs
CREATE POLICY "Admins can view all jobs" ON transcription_jobs
  FOR SELECT 
  USING (is_admin());

-- Admins can update all transcription jobs
CREATE POLICY "Admins can update all jobs" ON transcription_jobs
  FOR UPDATE 
  USING (is_admin());

-- Admins can insert transcription jobs for any user
CREATE POLICY "Admins can insert jobs for any user" ON transcription_jobs
  FOR INSERT 
  WITH CHECK (is_admin());

-- Admins can delete any transcription jobs
CREATE POLICY "Admins can delete any jobs" ON transcription_jobs
  FOR DELETE 
  USING (is_admin());

-- =============================================
-- TIER_LIMITS TABLE RLS POLICIES
-- =============================================

-- All authenticated users can read tier limits (needed for UI)
CREATE POLICY "Authenticated users can view tier limits" ON tier_limits
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Only admins can modify tier limits
CREATE POLICY "Admins can update tier limits" ON tier_limits
  FOR UPDATE 
  USING (is_admin());

CREATE POLICY "Admins can insert tier limits" ON tier_limits
  FOR INSERT 
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete tier limits" ON tier_limits
  FOR DELETE 
  USING (is_admin());

-- =============================================
-- SECURITY FUNCTIONS FOR API USE
-- =============================================

-- Function to safely get user profile (respects RLS)
CREATE OR REPLACE FUNCTION get_current_user_profile()
RETURNS TABLE (
  id UUID,
  email TEXT,
  tier TEXT,
  monthly_transcriptions_used INTEGER,
  total_transcriptions INTEGER,
  usage_reset_date TIMESTAMP WITH TIME ZONE,
  provider TEXT,
  full_name TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id,
    up.email,
    up.tier,
    up.monthly_transcriptions_used,
    up.total_transcriptions,
    up.usage_reset_date,
    up.provider,
    up.full_name,
    up.avatar_url
  FROM user_profiles up
  WHERE up.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely get user transcription jobs (respects RLS)
CREATE OR REPLACE FUNCTION get_user_transcription_jobs(
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  job_id TEXT,
  filename TEXT,
  file_size BIGINT,
  duration_seconds INTEGER,
  status TEXT,
  tier TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  usage_cost INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tj.id,
    tj.job_id,
    tj.filename,
    tj.file_size,
    tj.duration_seconds,
    tj.status,
    tj.tier,
    tj.created_at,
    tj.completed_at,
    tj.error_message,
    tj.usage_cost
  FROM transcription_jobs tj
  WHERE tj.user_id = auth.uid()
  ORDER BY tj.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;