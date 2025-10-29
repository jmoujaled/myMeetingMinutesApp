-- Create user_profiles table with tier system and OAuth support
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  usage_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- OAuth provider information (Google profile data)
  provider TEXT, -- 'email' or 'google'
  provider_id TEXT, -- Google user ID if OAuth
  avatar_url TEXT, -- Profile picture URL from OAuth
  full_name TEXT, -- Full name from OAuth or user input
  
  -- Usage tracking fields
  monthly_transcriptions_used INTEGER DEFAULT 0,
  total_transcriptions INTEGER DEFAULT 0,
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Ensure email uniqueness
  UNIQUE(email)
);

-- Create indexes for efficient querying
CREATE INDEX idx_user_profiles_tier ON user_profiles(tier);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_usage_reset ON user_profiles(usage_reset_date);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile automatically on user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, provider, provider_id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
    CASE 
      WHEN NEW.raw_app_meta_data->>'provider' = 'google' 
      THEN NEW.raw_user_meta_data->>'sub'
      ELSE NULL
    END,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user registration (email and OAuth)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to reset monthly usage (to be called by a scheduled job)
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
  UPDATE user_profiles 
  SET 
    monthly_transcriptions_used = 0,
    usage_reset_date = NOW()
  WHERE usage_reset_date <= NOW() - INTERVAL '1 month';
END;
$$ LANGUAGE plpgsql;