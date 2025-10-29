# My Meetings Page Requirements

## Introduction

This feature will provide users with a comprehensive view of their transcription and meeting history, allowing them to easily access, search, and manage their past audio transcriptions and meeting records. The system will leverage the existing `transcription_jobs` table and introduce a new `meetings` table to store processed meeting data with summaries and action items.

## Requirements

### Requirement 1: Transcription History Viewing

**User Story:** As a user, I want to view all my past transcription jobs, so that I can track my usage and access previous work.

#### Acceptance Criteria

1. WHEN a user navigates to the My Meetings page THEN the system SHALL display a paginated list of their transcription jobs
2. WHEN displaying transcription jobs THEN the system SHALL show filename, status, duration, and creation date
3. WHEN a transcription job is in progress THEN the system SHALL display a processing indicator
4. WHEN a transcription job has failed THEN the system SHALL display the error message
5. IF a user has no transcription history THEN the system SHALL display an empty state with guidance to create their first transcription

### Requirement 2: Meeting Records Management

**User Story:** As a user, I want to save and organize my transcribed meetings with summaries and action items, so that I can reference important meeting outcomes later.

#### Acceptance Criteria

1. WHEN a transcription is completed with meeting context THEN the system SHALL allow the user to save it as a meeting record
2. WHEN saving a meeting record THEN the system SHALL store the title, description, date, attendees, transcript, summary, and action items
3. WHEN viewing meeting history THEN the system SHALL display meeting title, date, duration, and creation date
4. WHEN a user clicks on a meeting record THEN the system SHALL display the full meeting details including transcript and summary

### Requirement 3: Search and Filtering

**User Story:** As a user, I want to search and filter my transcription and meeting history, so that I can quickly find specific records.

#### Acceptance Criteria

1. WHEN a user enters text in the search field THEN the system SHALL filter results by filename, meeting title, or transcript content
2. WHEN a user applies date range filters THEN the system SHALL show only records within the specified date range
3. WHEN a user applies multiple filters THEN the system SHALL combine all filter criteria using AND logic
4. WHEN search or filter results are empty THEN the system SHALL display an appropriate "no results found" message

### Requirement 4: Export and Download Functionality

**User Story:** As a user, I want to download my transcripts and ai meeting  minutes and summaries in various formats, so that I can use them in other applications.

#### Acceptance Criteria

1. WHEN a user clicks download on a completed transcription THEN the system SHALL offer text and SRT formats
2. WHEN a user clicks download on AI meeting minutes and summaries THEN the system SHALL provide options for Word and PDF formats for both summary and full transcript


### Requirement 5: Navigation and Integration

**User Story:** As a user, I want easy access to my history from the main navigation, so that I can quickly review past work.

#### Acceptance Criteria

1. WHEN a user is logged in THEN the main navigation SHALL include a "My Meetings" link
2. WHEN a user is on the My Meetings page THEN the navigation SHALL highlight the My Meetings section
3. WHEN a user clicks "View All History" from the dashboard THEN the system SHALL navigate to the My Meetings page

### Requirement 6: Usage Analytics Integration

**User Story:** As a user, I want to see usage statistics based on my history, so that I can understand my transcription patterns and plan accordingly.

#### Acceptance Criteria

1. WHEN viewing the My Meetings page THEN the system SHALL display total transcriptions completed this month
2. WHEN viewing usage statistics THEN the system SHALL show total hours transcribed and average file size
3. WHEN a user approaches their tier limits THEN the system SHALL display usage warnings in the history interface
4. IF a user has exceeded limits THEN the system SHALL show upgrade prompts in the My Meetings section

### Requirement 7: Data Management and Privacy

**User Story:** As a user, I want to manage my transcription data and ensure my privacy, so that I have control over my stored information.

#### Acceptance Criteria

1. WHEN a user deletes a transcription job THEN the system SHALL remove it from their history and database
2. WHEN a user deletes a meeting record THEN the system SHALL remove all associated data including transcripts and summaries
3. WHEN deleting records THEN the system SHALL require confirmation to prevent accidental deletion
4. WHEN a user views their history THEN the system SHALL only display records they own based on their user ID
5. IF a user account is deleted THEN the system SHALL cascade delete all associated transcription jobs and meeting records
6. All data on previous usage SHALL NOT be deleted in order to maintain a proper record of their account usage, preventing users from circumventing the system 

### Requirement 8: Mobile Responsiveness

**User Story:** As a mobile user, I want to access my transcription history on my phone or tablet, so that I can review my work while on the go.

#### Acceptance Criteria

1. WHEN accessing the My Meetings page on mobile devices THEN the system SHALL display a responsive layout optimized for smaller screens
2. WHEN viewing transcription cards on mobile THEN the system SHALL stack information vertically and show essential details first
3. WHEN using search and filters on mobile THEN the system SHALL provide touch-friendly controls and collapsible filter sections
4. WHEN downloading files on mobile THEN the system SHALL handle mobile browser download limitations appropriately