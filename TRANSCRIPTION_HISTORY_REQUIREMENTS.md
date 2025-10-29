# Transcription History Management

## Overview
This document outlines the requirements for implementing transcription history functionality in the meeting minutes app. This will allow users to view, search, and manage their completed transcriptions and meetings.

## Current Database Schema (Already Available)

### Tables We'll Use:
- `transcription_jobs` - Tracks all transcription jobs with status, metadata, file info
- `meetings` - Stores meeting data with transcripts, summaries, action items  
- `user_profiles` - User data for filtering and permissions

## Features to Implement

### 1. History API Endpoints

#### 1.1 Transcription Jobs History
- **Endpoint**: `GET /api/user/transcriptions`
- **Purpose**: Retrieve user's transcription job history
- **Features**:
  - Pagination (limit/offset)
  - Filtering by status (completed, failed, cancelled)
  - Date range filtering
  - Search by filename
  - Sort by date, duration, file size
- **Response**: List of transcription jobs with metadata

#### 1.2 Meetings History  
- **Endpoint**: `GET /api/user/meetings`
- **Purpose**: Retrieve user's meeting history
- **Features**:
  - Pagination
  - Search by title, description, attendees
  - Date range filtering
  - Sort by date, duration
- **Response**: List of meetings with summaries

#### 1.3 Individual Record Details
- **Endpoint**: `GET /api/user/transcriptions/{id}`
- **Purpose**: Get detailed view of specific transcription
- **Response**: Full transcription data, segments, metadata

- **Endpoint**: `GET /api/user/meetings/{id}`  
- **Purpose**: Get detailed view of specific meeting
- **Response**: Full meeting data, transcript, summary, action items

### 2. History Page UI (`/history`)

#### 2.1 Main History View
- **Layout**: Tabbed interface
  - Tab 1: "Transcriptions" - Shows transcription jobs
  - Tab 2: "Meetings" - Shows saved meetings
- **List Features**:
  - Card-based layout showing key info
  - Status indicators (completed, failed, processing)
  - File size, duration, date created
  - Quick actions (view, download, delete)

#### 2.2 Search & Filter Controls
- **Search Bar**: Search by filename, title, or content
- **Filters**:
  - Date range picker
  - Status filter (completed, failed, etc.)
  - File type filter (audio format)
  - Duration range
- **Sort Options**:
  - Date (newest/oldest first)
  - Duration (longest/shortest first)
  - File size (largest/smallest first)
  - Alphabetical by name

#### 2.3 Transcription Detail View
- **Modal or dedicated page** showing:
  - Full transcript with speaker segments
  - Audio file info (name, size, duration)
  - Processing metadata (language, features used)
  - Download options (text, SRT, JSON)
  - Delete option

#### 2.4 Meeting Detail View
- **Modal or dedicated page** showing:
  - Meeting title, description, date
  - Attendees list
  - Full transcript
  - AI-generated summary
  - Action items with status
  - Export options

### 3. Dashboard Integration

#### 3.1 Recent Activity Widget
- Show last 5 transcriptions on dashboard
- Quick status overview
- "View All History" link to full history page

#### 3.2 Usage Statistics Enhancement
- Add history-based metrics:
  - Total transcriptions completed
  - Total hours transcribed
  - Most active days/times
  - Average file size

### 4. Export & Download Features

#### 4.1 Individual Downloads
- **Transcript formats**: TXT, SRT, JSON
- **Meeting exports**: PDF summary, Word document
- **Audio file re-download** (if stored)

#### 4.2 Bulk Operations
- Select multiple transcriptions
- Bulk download as ZIP
- Bulk delete with confirmation
- Export usage report (CSV)

### 5. Navigation Updates

#### 5.1 Add History Link
- Add "History" to main navigation menu
- Add breadcrumbs for history pages
- Update mobile navigation

## Technical Implementation Plan

### Phase 1: Backend API
1. Create history API endpoints in `/api/user/`
2. Implement pagination, filtering, and search
3. Add proper error handling and validation
4. Update RLS policies for history access

### Phase 2: Basic History Page
1. Create `/history` page with basic list view
2. Implement search and filter UI
3. Add pagination controls
4. Create detail view modals

### Phase 3: Enhanced Features
1. Add export/download functionality
2. Implement bulk operations
3. Add usage analytics
4. Integrate with dashboard

### Phase 4: Polish & Optimization
1. Add loading states and error handling
2. Implement caching for better performance
3. Add keyboard shortcuts
4. Mobile responsiveness improvements

## Database Queries Needed

### Get User Transcription History
```sql
SELECT 
  id, filename, file_size, duration_seconds, 
  status, created_at, completed_at, tier, usage_cost
FROM transcription_jobs 
WHERE user_id = $1 
ORDER BY created_at DESC 
LIMIT $2 OFFSET $3;
```

### Get User Meeting History
```sql
SELECT 
  id, title, description, date, duration,
  attendees, created_at, updated_at
FROM meetings 
WHERE user_id = $1 
ORDER BY date DESC 
LIMIT $2 OFFSET $3;
```

### Search Transcriptions
```sql
SELECT * FROM transcription_jobs 
WHERE user_id = $1 
AND filename ILIKE '%' || $2 || '%'
AND status = ANY($3)
AND created_at BETWEEN $4 AND $5
ORDER BY created_at DESC;
```

## UI Components to Create

1. **HistoryPage** - Main history page container
2. **TranscriptionList** - List of transcription jobs
3. **MeetingList** - List of meetings
4. **HistoryFilters** - Search and filter controls
5. **TranscriptionCard** - Individual transcription item
6. **MeetingCard** - Individual meeting item
7. **DetailModal** - Detailed view popup
8. **ExportButton** - Download/export functionality
9. **BulkActions** - Multi-select operations
10. **HistoryStats** - Usage statistics widget

## Success Metrics

- Users can easily find past transcriptions
- Search and filter work effectively
- Export functionality is reliable
- Page loads quickly even with large history
- Mobile experience is smooth
- Integration with existing dashboard is seamless

## Future Enhancements (Not in Scope)

- Transcription sharing with other users
- Collaborative meeting notes
- Integration with calendar systems
- Advanced analytics and insights
- Automated tagging and categorization
- Full-text search within transcripts