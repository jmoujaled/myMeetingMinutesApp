# Supabase Database Migrations

This directory contains SQL migration files for the user authentication system.

## Migration Files

1. **001_create_user_profiles.sql** - Creates the user_profiles table with tier system and OAuth support
2. **002_create_transcription_jobs.sql** - Creates the transcription_jobs table for usage tracking
3. **003_create_tier_limits.sql** - Creates the tier_limits table with default configurations
4. **004_create_rls_policies.sql** - Implements Row Level Security policies
5. **005_test_rls_policies.sql** - Test script to verify RLS implementation

## How to Apply Migrations

### Option 1: Using Supabase CLI (Recommended)

If you have the Supabase CLI installed:

```bash
# Initialize Supabase in your project (if not already done)
supabase init

# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push
```

### Option 2: Manual Application via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste each migration file in order (001, 002, 003, 004)
4. Execute each migration
5. Run the test script (005) to verify everything works

### Option 3: Using psql

If you have direct database access:

```bash
# Apply each migration in order
psql -h YOUR_DB_HOST -U postgres -d postgres -f 001_create_user_profiles.sql
psql -h YOUR_DB_HOST -U postgres -d postgres -f 002_create_transcription_jobs.sql
psql -h YOUR_DB_HOST -U postgres -d postgres -f 003_create_tier_limits.sql
psql -h YOUR_DB_HOST -U postgres -d postgres -f 004_create_rls_policies.sql

# Run tests
psql -h YOUR_DB_HOST -U postgres -d postgres -f 005_test_rls_policies.sql
```

## What These Migrations Create

### Tables

- **user_profiles**: Stores user information, tier, and usage tracking
- **transcription_jobs**: Tracks all transcription jobs with usage metrics
- **tier_limits**: Defines limits and features for each subscription tier

### Functions

- **handle_new_user()**: Automatically creates user profile on registration
- **update_user_usage()**: Updates usage counters when jobs complete
- **reset_monthly_usage()**: Resets monthly usage (for scheduled jobs)
- **is_admin()**: Helper function to check admin status
- **can_user_transcribe()**: Validates if user can perform transcription
- **get_current_user_profile()**: Safely retrieves user profile
- **get_user_transcription_jobs()**: Safely retrieves user's jobs

### Row Level Security

- Users can only access their own data
- Admins can access all data
- Tier limits are readable by all authenticated users
- Comprehensive policies for all CRUD operations

### Tier Configurations

- **Free**: 5 transcriptions/month, 150MB files, 60min duration
- **Pro**: Unlimited transcriptions, unlimited file size, unlimited duration
- **Admin**: Unlimited usage with full system access and all features

## Verification

After applying migrations, run the test script to verify:

```sql
-- In Supabase SQL Editor or psql
\i 005_test_rls_policies.sql
```

This will check that all tables, policies, and functions are properly created.

## Environment Variables

Make sure your `.env.local` file has the correct Supabase configuration:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```