# Search and Filtering Backend Implementation

## Overview

This document describes the implementation of advanced search and filtering functionality for the transcription history feature. The implementation includes full-text search using PostgreSQL search vectors, date range filtering, status filtering, and relevance scoring.

## Database Functions

### 1. `get_user_transcription_history`

**Purpose:** Retrieve paginated and filtered transcription history with search capabilities.

**Parameters:**
- `target_user_id`: UUID of the user whose data to retrieve
- `search_query`: Optional text search query
- `date_from`: Optional start date for filtering
- `date_to`: Optional end date for filtering  
- `status_filter`: Optional status filter ('processing', 'completed', 'failed', 'cancelled')
- `record_type_filter`: Optional type filter ('meetings', 'transcriptions', 'all')
- `limit_count`: Number of records to return (default: 20)
- `offset_count`: Number of records to skip (default: 0)

**Features:**
- Full-text search across meeting titles, descriptions, transcripts, and filenames
- PostgreSQL `ts_rank` for relevance scoring
- Proper security with RLS enforcement
- Admin users can access any user's data
- Combined results from transcription_jobs and meetings tables

### 2. `get_user_transcription_history_count`

**Purpose:** Get total count of filtered results for pagination.

**Parameters:** Same filtering parameters as above (excluding limit/offset)

**Returns:** BIGINT count of matching records

### 3. `search_transcription_content`

**Purpose:** Advanced content search with highlighted snippets.

**Parameters:**
- `target_user_id`: UUID of the user
- `search_query`: Text to search for
- `limit_count`: Maximum results to return

**Features:**
- Uses `ts_headline` for highlighted snippets
- Relevance ranking with `ts_rank`
- Searches both meeting content and filenames

### 4. `get_search_suggestions`

**Purpose:** Provide search suggestions based on user's content.

**Parameters:**
- `target_user_id`: UUID of the user
- `search_prefix`: Text prefix to match
- `limit_count`: Maximum suggestions to return

**Features:**
- Suggests meeting titles, key topics, and filenames
- Prefix matching with case-insensitive search
- Grouped by suggestion type

### 5. `get_search_analytics`

**Purpose:** Provide analytics about user's searchable content.

**Parameters:**
- `target_user_id`: UUID of the user
- `days_back`: Number of days to analyze (default: 30)

**Returns:**
- Total searchable items
- Meetings with transcripts count
- Average transcript length
- Most common topics
- Search coverage score

## API Endpoints

### 1. `GET /api/meetings`

Enhanced with advanced search and filtering capabilities.

**Query Parameters:**
- `search`: Text search query
- `date_from`: ISO date string for start date
- `date_to`: ISO date string for end date
- `status`: Status filter
- `record_type`: Type filter ('all', 'meetings', 'transcriptions')
- `page`: Page number (default: 1)
- `limit`: Records per page (default: 20)

**Response:**
```typescript
{
  data: TranscriptionHistoryRecord[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    total_pages: number
  },
  stats: MeetingStats
}
```

### 2. `GET /api/meetings/search/suggestions`

**Query Parameters:**
- `q`: Search query prefix (required)
- `limit`: Maximum suggestions (default: 5)

**Response:**
```typescript
{
  suggestions: SearchSuggestion[],
  query: string
}
```

### 3. `GET /api/meetings/search/content`

**Query Parameters:**
- `q`: Search query (required)
- `limit`: Maximum results (default: 10)

**Response:**
```typescript
{
  results: ContentSearchResult[],
  query: string,
  total_results: number
}
```

### 4. `GET /api/meetings/analytics`

**Query Parameters:**
- `days`: Days to analyze (default: 30)

**Response:**
```typescript
{
  total_searchable_items: number,
  meetings_with_transcripts: number,
  avg_transcript_length: number,
  most_common_topics: string[],
  search_coverage_score: number
}
```

## Search Features

### Full-Text Search

- Uses PostgreSQL's built-in full-text search capabilities
- Search vectors are automatically generated and stored
- Supports English language stemming and stop words
- Searches across:
  - Meeting titles and descriptions
  - Transcript content
  - Filenames
  - Key topics

### Relevance Scoring

- Uses `ts_rank` function for relevance scoring
- Higher scores indicate better matches
- Results sorted by relevance when search query is provided
- Falls back to chronological sorting when no search query

### Performance Optimizations

- GIN indexes on search vectors for fast full-text search
- Composite indexes for user-specific queries
- Efficient pagination with LIMIT/OFFSET
- Separate count function to avoid expensive COUNT(*) operations

### Security

- Row Level Security (RLS) enforced at database level
- Admin users can access all data
- Regular users can only access their own data
- All functions use `SECURITY DEFINER` with proper authorization checks

## Usage Examples

### Basic Search
```typescript
// Search for meetings containing "standup"
const response = await fetch('/api/meetings?search=standup&record_type=meetings');
```

### Date Range Filtering
```typescript
// Get transcriptions from last week
const lastWeek = new Date();
lastWeek.setDate(lastWeek.getDate() - 7);
const response = await fetch(`/api/meetings?date_from=${lastWeek.toISOString()}`);
```

### Combined Filters
```typescript
// Search completed meetings from last month containing "project"
const response = await fetch('/api/meetings?search=project&status=completed&record_type=meetings&date_from=2024-01-01');
```

### Search Suggestions
```typescript
// Get suggestions for queries starting with "me"
const response = await fetch('/api/meetings/search/suggestions?q=me');
```

### Content Search with Snippets
```typescript
// Search content with highlighted snippets
const response = await fetch('/api/meetings/search/content?q=action+items');
```

## Database Schema

### Search Vector Generation

The `meetings` table includes a generated search vector:

```sql
search_vector TSVECTOR GENERATED ALWAYS AS (
  to_tsvector('english', 
    COALESCE(title, '') || ' ' || 
    COALESCE(description, '') || ' ' || 
    COALESCE(transcript_text, '')
  )
) STORED
```

### Indexes

Key indexes for search performance:

```sql
-- Full-text search index
CREATE INDEX idx_meetings_search ON meetings USING GIN(search_vector);

-- User-specific queries
CREATE INDEX idx_meetings_user_created ON meetings(user_id, created_at DESC);

-- Date filtering
CREATE INDEX idx_meetings_date ON meetings(meeting_date DESC) WHERE meeting_date IS NOT NULL;
```

## Error Handling

- Graceful handling of invalid search queries
- Proper error messages for authorization failures
- Fallback behavior when search features are unavailable
- Input validation and sanitization

## Future Enhancements

1. **Advanced Search Operators:** Support for boolean operators (AND, OR, NOT)
2. **Fuzzy Search:** Handle typos and similar terms
3. **Search History:** Track and suggest previous searches
4. **Faceted Search:** Category-based filtering
5. **Real-time Search:** Live search results as user types
6. **Search Analytics:** Track search patterns and popular queries

## Testing

The implementation includes comprehensive tests covering:
- Basic search functionality
- Filter combinations
- Edge cases and error conditions
- Performance with large datasets
- Security and authorization

Run tests with:
```bash
npm run test:search
```

## Monitoring

Key metrics to monitor:
- Search query performance
- Index usage and efficiency
- User search patterns
- Error rates and types
- Cache hit rates (if caching is implemented)