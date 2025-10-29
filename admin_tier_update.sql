-- Create a function that allows admin tier updates bypassing the trigger
CREATE OR REPLACE FUNCTION admin_update_user_tier(
  target_user_id UUID,
  new_tier TEXT
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  tier TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  usage_reset_date TIMESTAMP WITH TIME ZONE,
  provider TEXT,
  provider_id TEXT,
  avatar_url TEXT,
  full_name TEXT,
  monthly_transcriptions_used INTEGER,
  total_transcriptions INTEGER,
  metadata JSONB
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  -- Temporarily disable the trigger
  EXECUTE 'ALTER TABLE user_profiles DISABLE TRIGGER prevent_user_tier_change';
  
  -- Update the user tier
  UPDATE user_profiles 
  SET 
    tier = new_tier,
    updated_at = NOW()
  WHERE user_profiles.id = target_user_id;
  
  -- Re-enable the trigger
  EXECUTE 'ALTER TABLE user_profiles ENABLE TRIGGER prevent_user_tier_change';
  
  -- Return the updated user
  RETURN QUERY
  SELECT 
    up.id,
    up.email,
    up.tier,
    up.created_at,
    up.updated_at,
    up.usage_reset_date,
    up.provider,
    up.provider_id,
    up.avatar_url,
    up.full_name,
    up.monthly_transcriptions_used,
    up.total_transcriptions,
    up.metadata
  FROM user_profiles up
  WHERE up.id = target_user_id;
END;
$$;

-- Create a function for resetting usage
CREATE OR REPLACE FUNCTION admin_reset_user_usage(
  target_user_id UUID
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  tier TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  usage_reset_date TIMESTAMP WITH TIME ZONE,
  provider TEXT,
  provider_id TEXT,
  avatar_url TEXT,
  full_name TEXT,
  monthly_transcriptions_used INTEGER,
  total_transcriptions INTEGER,
  metadata JSONB
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  -- Update the user usage
  UPDATE user_profiles 
  SET 
    monthly_transcriptions_used = 0,
    usage_reset_date = NOW(),
    updated_at = NOW()
  WHERE user_profiles.id = target_user_id;
  
  -- Return the updated user
  RETURN QUERY
  SELECT 
    up.id,
    up.email,
    up.tier,
    up.created_at,
    up.updated_at,
    up.usage_reset_date,
    up.provider,
    up.provider_id,
    up.avatar_url,
    up.full_name,
    up.monthly_transcriptions_used,
    up.total_transcriptions,
    up.metadata
  FROM user_profiles up
  WHERE up.id = target_user_id;
END;
$$;