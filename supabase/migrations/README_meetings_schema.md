# Meetings Schema Documentation

This document describes the database schema changes for the transcription history and meetings feature.

## Migration Files

### 007_create_meetings_table.sql
- Creates the `meetings` table with full-text search capabilities
- Creates the `user_transcription_history` view for combined data access
- Adds proper indexes for performance optimization
- Includes constraints for data integrity

### 008_create_meetings_rls_policies.sql
- Enables Row Level Security (RLS) on the meetings table
- Creates policies to ensure users can only access their own data
- Adds admin access policies for administrative functions
- Includes a secure function for querying transcription history with filtering

### 009_meetings_utility_functions.sql
- Provides utility functions for common meeting operations
- Includes statistics calculation functions
- Adds functions for creating meetings from transcriptions
- Provides secure action item management functions

## Database Schema

### meetings Table Structure

```sql
meetings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  transcription_job_id UUID REFERENCES transcription_jobs(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  meeting_date TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  attendees TEXT[],
  transcript_text TEXT,
  summary TEXT,
  action_items JSONB,
  key_topics TEXT[],
  audio_file_url TEXT,
  transcript_file_url TEXT,
  summary_file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  search_vector TSVECTOR -- Generated column for full-text search
)
```

### Key Features

1. **Full-Text Search**: The `search_vector` column enables efficient searching across meeting titles, descriptions, and transcript content.

2. **Flexible Relationships**: Meetings can be created from transcription jobs or independently.

3. **Structured Data**: Action items are stored as JSONB for flexible querying and updates.

4. **Security**: RLS policies ensure data isolation between users while allowing admin access.

5. **Performance**: Comprehensive indexing strategy for efficient queries.

## Usage Examples

### Creating a Meeting from Transcription
```sql
SELECT create_meeting_from_transcription(
  'transcription-job-uuid',
  'Team Standup Meeting',
  'Weekly team sync discussion',
  '2024-03-15 10:00:00+00',
  ARRAY['john@example.com', 'jane@example.com'],
  'Meeting summary text...',
  '[{"text": "Follow up on project X", "assignee": "john@example.com"}]'::jsonb
);
```

### Querying User History
```sql
SELECT * FROM get_user_transcription_history(
  NULL, -- current user
  'standup', -- search query
  '2024-03-01'::timestamp, -- date from
  '2024-03-31'::timestamp, -- date to
  'completed', -- status filter
  NULL, -- record type filter
  20, -- limit
  0 -- offset
);
```

### Getting User Statistics
```sql
SELECT * FROM get_user_meeting_stats();
```

## Security Considerations

- All functions use `SECURITY DEFINER` to ensure proper access control
- RLS policies prevent unauthorized data access
- Admin users have elevated permissions for management functions
- Input validation is performed at the database level

## Performance Optimizations

- Composite indexes on frequently queried columns
- GIN index for full-text search
- Partial indexes for conditional queries
- Generated columns for computed values