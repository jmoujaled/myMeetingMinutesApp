-- Test script for Row Level Security policies
-- This script can be run to verify that RLS policies are working correctly

-- Test 1: Verify RLS is enabled on all tables
DO $$
BEGIN
  -- Check if RLS is enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'user_profiles' 
    AND n.nspname = 'public' 
    AND c.relrowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on user_profiles table';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'transcription_jobs' 
    AND n.nspname = 'public' 
    AND c.relrowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on transcription_jobs table';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'tier_limits' 
    AND n.nspname = 'public' 
    AND c.relrowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on tier_limits table';
  END IF;
  
  RAISE NOTICE 'SUCCESS: RLS is enabled on all tables';
END $$;

-- Test 2: Verify policies exist
DO $$
BEGIN
  -- Check user_profiles policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Users can view own profile'
  ) THEN
    RAISE EXCEPTION 'Missing policy: Users can view own profile';
  END IF;
  
  -- Check transcription_jobs policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'transcription_jobs' 
    AND policyname = 'Users can view own jobs'
  ) THEN
    RAISE EXCEPTION 'Missing policy: Users can view own jobs';
  END IF;
  
  -- Check tier_limits policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tier_limits' 
    AND policyname = 'Authenticated users can view tier limits'
  ) THEN
    RAISE EXCEPTION 'Missing policy: Authenticated users can view tier limits';
  END IF;
  
  RAISE NOTICE 'SUCCESS: All required policies exist';
END $$;

-- Test 3: Verify helper functions exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'is_admin' AND n.nspname = 'public'
  ) THEN
    RAISE EXCEPTION 'Missing function: is_admin()';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'get_current_user_profile' AND n.nspname = 'public'
  ) THEN
    RAISE EXCEPTION 'Missing function: get_current_user_profile()';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'can_user_transcribe' AND n.nspname = 'public'
  ) THEN
    RAISE EXCEPTION 'Missing function: can_user_transcribe()';
  END IF;
  
  RAISE NOTICE 'SUCCESS: All helper functions exist';
END $$;

-- Test 4: Verify tier limits data exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tier_limits WHERE tier = 'free') THEN
    RAISE EXCEPTION 'Missing tier configuration: free';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM tier_limits WHERE tier = 'pro') THEN
    RAISE EXCEPTION 'Missing tier configuration: pro';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM tier_limits WHERE tier = 'admin') THEN
    RAISE EXCEPTION 'Missing tier configuration: admin';
  END IF;
  
  RAISE NOTICE 'SUCCESS: All tier configurations exist';
END $$;

-- Display summary of created objects
SELECT 'Tables with RLS enabled:' as summary;
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'transcription_jobs', 'tier_limits');

SELECT 'RLS Policies created:' as summary;
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as command_type
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

SELECT 'Tier configurations:' as summary;
SELECT 
  tier,
  monthly_transcription_limit,
  max_file_size_mb,
  max_duration_minutes
FROM tier_limits
ORDER BY 
  CASE tier 
    WHEN 'free' THEN 1 
    WHEN 'pro' THEN 2 
    WHEN 'admin' THEN 3 
  END;