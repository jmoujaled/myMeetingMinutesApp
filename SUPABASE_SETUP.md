# Supabase Setup Instructions

## 1. Supabase Project Configuration

### Authentication Settings
1. Go to your Supabase project dashboard
2. Navigate to Authentication > Settings
3. Configure the following settings:
   - **Site URL**: `http://localhost:3030` (for development)
   - **Redirect URLs**: Add `http://localhost:3030/auth/callback`
   - **Email Auth**: Enable if you want email/password authentication
   - **Email Templates**: Customize confirmation and recovery email templates

### Google OAuth Provider Setup
1. In Supabase Dashboard, go to Authentication > Providers
2. Enable Google provider
3. You'll need to configure Google OAuth credentials (see next section)

## 2. Google Cloud Console Setup

### Create OAuth 2.0 Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to Credentials > Create Credentials > OAuth 2.0 Client IDs
5. Configure the OAuth consent screen
6. Set up OAuth 2.0 Client ID:
   - **Application type**: Web application
   - **Authorized JavaScript origins**: 
     - `http://localhost:3030` (development)
     - Your production domain
   - **Authorized redirect URIs**:
     - `https://your-project-ref.supabase.co/auth/v1/callback`
     - Replace `your-project-ref` with your actual Supabase project reference

### Get Your Credentials
1. Copy the **Client ID** and **Client Secret**
2. Add these to your Supabase Google provider configuration
3. Add them to your `.env.local` file

## 3. Environment Variables Setup

Create a `.env.local` file in your project root with the following variables:

```env
# Copy from .env.local.example and fill in your actual values
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
```

### Where to find Supabase keys:
- **Project URL**: Supabase Dashboard > Settings > API
- **Anon Key**: Supabase Dashboard > Settings > API
- **Service Role Key**: Supabase Dashboard > Settings > API (keep this secret!)

## 4. Database Schema

You'll need to create the meetings table in your Supabase database. Run this SQL in the Supabase SQL Editor:

```sql
-- Create meetings table
CREATE TABLE meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMPTZ NOT NULL,
  duration INTEGER,
  transcript TEXT,
  summary TEXT,
  action_items JSONB,
  attendees TEXT[],
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only see their own meetings
CREATE POLICY "Users can only see their own meetings" ON meetings
  FOR ALL USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE
  ON meetings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 5. Testing the Setup

1. Start your development server: `npm run dev`
2. Navigate to `http://localhost:3030`
3. The middleware should redirect unauthenticated users to `/login`
4. Test Google OAuth login flow

## Next Steps

After completing this setup:
1. Create login/logout pages
2. Implement authentication components
3. Create meeting management functionality