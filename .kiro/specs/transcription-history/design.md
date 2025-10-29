# My Meetings Page Design Document

## Overview

The My Meetings Page provides users with a comprehensive interface to view, search, and manage their transcription history and meeting records. This feature builds upon the existing `transcription_jobs` table and introduces a new `meetings` table to store processed meeting data with enhanced metadata, summaries, and action items.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Routes     │    │   Database      │
│                 │    │                  │    │                 │
│ My Meetings     │◄──►│ /api/meetings    │◄──►│ meetings        │
│ Page Component  │    │ /api/transcripts │    │ transcription_  │
│                 │    │ /api/exports     │    │ jobs            │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Component Hierarchy

```
MyMeetingsPage
├── MeetingsHeader (title, stats, actions)
├── SearchAndFilters
│   ├── SearchBar
│   ├── DateRangeFilter
│   └── StatusFilter
├── MeetingsList
│   ├── MeetingCard (for each meeting/transcription)
│   └── Pagination
└── EmptyState (when no results)
```

## Data Models

### Enhanced Meetings Table

```sql
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  transcription_job_id UUID REFERENCES transcription_jobs(id) ON DELETE SET NULL,
  
  -- Meeting Metadata
  title VARCHAR(255) NOT NULL,
  description TEXT,
  meeting_date TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  attendees TEXT[], -- Array of attendee names/emails
  
  -- Content
  transcript_text TEXT,
  summary TEXT,
  action_items JSONB, -- Structured action items with assignees, due dates
  key_topics TEXT[],
  
  -- File References
  audio_file_url TEXT,
  transcript_file_url TEXT,
  summary_file_url TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Search optimization
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', 
      COALESCE(title, '') || ' ' || 
      COALESCE(description, '') || ' ' || 
      COALESCE(transcript_text, '')
    )
  ) STORED
);

-- Indexes for performance
CREATE INDEX idx_meetings_user_id ON meetings(user_id);
CREATE INDEX idx_meetings_date ON meetings(meeting_date DESC);
CREATE INDEX idx_meetings_search ON meetings USING GIN(search_vector);
CREATE INDEX idx_meetings_created_at ON meetings(created_at DESC);
```

### Enhanced Transcription Jobs View

The existing `transcription_jobs` table will be used with additional computed fields:

```sql
-- View for combined transcription and meeting data
CREATE VIEW user_transcription_history AS
SELECT 
  tj.id,
  tj.user_id,
  tj.filename,
  tj.status,
  tj.duration_seconds,
  tj.file_size,
  tj.created_at,
  tj.completed_at,
  tj.error_message,
  m.id as meeting_id,
  m.title as meeting_title,
  m.summary,
  CASE 
    WHEN m.id IS NOT NULL THEN 'meeting'
    ELSE 'transcription'
  END as record_type
FROM transcription_jobs tj
LEFT JOIN meetings m ON tj.id = m.transcription_job_id
ORDER BY tj.created_at DESC;
```

## Components and Interfaces

### 1. MyMeetingsPage Component

**Location:** `src/app/meetings/page.tsx`

```typescript
interface MeetingsPageProps {
  searchParams?: {
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    type?: 'all' | 'meetings' | 'transcriptions';
    page?: string;
  };
}

interface MeetingRecord {
  id: string;
  type: 'meeting' | 'transcription';
  title: string;
  filename?: string;
  date: string;
  duration: number;
  status: 'completed' | 'processing' | 'failed';
  summary?: string;
  hasActionItems: boolean;
  createdAt: string;
}
```

### 2. SearchAndFilters Component

**Location:** `src/components/meetings/SearchAndFilters.tsx`

```typescript
interface SearchFilters {
  search: string;
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
  status: 'all' | 'completed' | 'processing' | 'failed';
  type: 'all' | 'meetings' | 'transcriptions';
}

interface SearchAndFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  totalResults: number;
}
```

### 3. MeetingCard Component

**Location:** `src/components/meetings/MeetingCard.tsx`

```typescript
interface MeetingCardProps {
  record: MeetingRecord;
  onView: (id: string) => void;
  onDownload: (id: string, format: ExportFormat) => void;
  onDelete: (id: string) => void;
}

type ExportFormat = 'txt' | 'srt' | 'docx' | 'pdf';
```

### 4. MeetingDetailModal Component

**Location:** `src/components/meetings/MeetingDetailModal.tsx`

```typescript
interface MeetingDetailModalProps {
  meetingId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface MeetingDetail {
  id: string;
  title: string;
  description: string;
  date: string;
  duration: number;
  attendees: string[];
  transcript: string;
  summary: string;
  actionItems: ActionItem[];
  keyTopics: string[];
}

interface ActionItem {
  id: string;
  text: string;
  assignee?: string;
  dueDate?: string;
  completed: boolean;
}
```

## API Endpoints

### 1. GET /api/meetings

**Purpose:** Retrieve paginated list of user's meetings and transcriptions

```typescript
interface GetMeetingsRequest {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  type?: 'all' | 'meetings' | 'transcriptions';
  page?: number;
  limit?: number;
}

interface GetMeetingsResponse {
  data: MeetingRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    totalTranscriptions: number;
    totalMeetings: number;
    totalHours: number;
    thisMonthCount: number;
  };
}
```

### 2. GET /api/meetings/[id]

**Purpose:** Get detailed meeting information

```typescript
interface GetMeetingDetailResponse {
  meeting: MeetingDetail;
  transcriptionJob?: {
    filename: string;
    fileSize: number;
    processingTime: number;
  };
}
```

### 3. POST /api/meetings

**Purpose:** Create a new meeting record from transcription

```typescript
interface CreateMeetingRequest {
  transcriptionJobId: string;
  title: string;
  description?: string;
  meetingDate?: string;
  attendees?: string[];
  actionItems?: Omit<ActionItem, 'id'>[];
}
```

### 4. DELETE /api/meetings/[id]

**Purpose:** Delete a meeting or transcription record

### 5. GET /api/meetings/[id]/export

**Purpose:** Export meeting data in various formats

```typescript
interface ExportRequest {
  format: 'txt' | 'srt' | 'docx' | 'pdf';
  includeTranscript?: boolean;
  includeSummary?: boolean;
  includeActionItems?: boolean;
}
```

## User Interface Design

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Header: My Meetings                                         │
│ Subtitle: Manage your transcriptions and meeting records   │
├─────────────────────────────────────────────────────────────┤
│ Stats Bar: [Total: 45] [This Month: 12] [Hours: 23.5]     │
├─────────────────────────────────────────────────────────────┤
│ Search: [🔍 Search meetings and transcripts...]            │
│ Filters: [Date Range] [Status ▼] [Type ▼] [Clear Filters] │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Meeting Card                                            │ │
│ │ 📅 Team Standup - March 15, 2024                      │ │
│ │ ⏱️ 25 min • 📝 Summary available • ✅ 3 action items  │ │
│ │ [View] [Download ▼] [Delete]                           │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Transcription Card                                      │ │
│ │ 🎵 interview_recording.mp3 - March 14, 2024           │ │
│ │ ⏱️ 45 min • ✅ Completed • 📄 Transcript ready        │ │
│ │ [View] [Save as Meeting] [Download ▼] [Delete]        │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Pagination: [← Previous] [1] [2] [3] [Next →]             │
└─────────────────────────────────────────────────────────────┘
```

### Mobile Responsive Design

- **Tablet (768px+):** Two-column card layout
- **Mobile (< 768px):** Single-column stacked layout with collapsible filters
- **Touch-friendly:** Larger buttons and touch targets
- **Swipe actions:** Swipe left/right for quick actions on mobile

### Color Scheme and Visual Hierarchy

- **Primary Actions:** Blue (#3B82F6)
- **Success States:** Green (#10B981)
- **Warning/Processing:** Yellow (#F59E0B)
- **Error States:** Red (#EF4444)
- **Neutral Text:** Gray scale (#374151, #6B7280, #9CA3AF)

## Error Handling

### Client-Side Error Handling

```typescript
interface ErrorState {
  type: 'network' | 'validation' | 'permission' | 'not_found';
  message: string;
  retryable: boolean;
}

// Error boundaries for graceful degradation
class MeetingsErrorBoundary extends React.Component {
  // Handle component errors and show fallback UI
}
```

### Server-Side Error Responses

```typescript
interface ApiError {
  error: string;
  code: string;
  details?: Record<string, any>;
}

// Standard error codes
const ERROR_CODES = {
  MEETING_NOT_FOUND: 'MEETING_NOT_FOUND',
  EXPORT_FAILED: 'EXPORT_FAILED',
  INVALID_FORMAT: 'INVALID_FORMAT',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
} as const;
```

## Performance Optimizations

### Database Optimizations

1. **Indexing Strategy:**
   - Composite index on `(user_id, created_at DESC)` for user-specific queries
   - Full-text search index on `search_vector` for content search
   - Partial indexes for status filtering

2. **Query Optimization:**
   - Use `LIMIT` and `OFFSET` for pagination
   - Implement cursor-based pagination for large datasets
   - Use `SELECT` specific columns to reduce data transfer

### Frontend Optimizations

1. **Virtual Scrolling:** For large lists of meetings
2. **Lazy Loading:** Load meeting details on demand
3. **Caching:** Cache search results and meeting data
4. **Debounced Search:** Prevent excessive API calls during typing
5. **Optimistic Updates:** Immediate UI feedback for user actions

### File Export Optimizations

1. **Streaming:** Stream large file exports to prevent memory issues
2. **Background Processing:** Queue large export jobs
3. **Caching:** Cache generated export files temporarily
4. **Compression:** Compress export files for faster downloads

## Security Considerations

### Data Access Control

1. **Row Level Security (RLS):** Ensure users can only access their own data
2. **API Authentication:** Verify user identity on all endpoints
3. **Input Validation:** Sanitize all user inputs
4. **Rate Limiting:** Prevent abuse of search and export endpoints

### Privacy and Data Protection

1. **Data Encryption:** Encrypt sensitive meeting content at rest
2. **Audit Logging:** Log access to meeting records
3. **Data Retention:** Implement configurable data retention policies
4. **Export Controls:** Limit export frequency and file sizes

## Testing Strategy

### Unit Tests

- Component rendering and interaction
- API endpoint logic
- Data transformation utilities
- Search and filtering functions

### Integration Tests

- End-to-end user workflows
- Database operations
- File export functionality
- Authentication and authorization

### Performance Tests

- Large dataset handling
- Search performance with various query types
- Export generation for different file sizes
- Concurrent user access patterns

## Migration Strategy

### Database Migration

```sql
-- Migration script for meetings table
-- This will be implemented as a Supabase migration
BEGIN;

-- Create meetings table
CREATE TABLE meetings (
  -- Table definition as specified above
);

-- Create indexes
-- Index definitions as specified above

-- Create view
-- View definition as specified above

COMMIT;
```

### Data Migration

1. **Existing Data:** No migration needed for existing `transcription_jobs`
2. **New Features:** Meetings table starts empty
3. **Backward Compatibility:** Existing transcription viewing remains functional

## Future Enhancements

### Phase 2 Features

1. **Meeting Templates:** Pre-defined meeting structures
2. **Collaboration:** Share meetings with team members
3. **Integration:** Calendar integration for automatic meeting detection
4. **Analytics:** Advanced usage analytics and insights
5. **AI Enhancements:** Automatic action item extraction and follow-up reminders

### Scalability Considerations

1. **Microservices:** Split meeting management into separate service
2. **CDN Integration:** Serve static exports via CDN
3. **Search Service:** Dedicated search service for complex queries
4. **Archive Strategy:** Move old meetings to cold storage