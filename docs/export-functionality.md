# Export Functionality Implementation

## Overview

The export functionality allows users to download their transcription and meeting data in various formats including TXT, SRT, DOCX, and PDF. This implementation provides both server-side generation and client-side utilities for handling exports.

## Components

### 1. Export Service (`src/lib/export-service.ts`)

Core service for generating export files in different formats:

- **Text Export**: Plain text format with meeting content
- **SRT Export**: Subtitle format with timestamps (for transcriptions)
- **Word Export**: Microsoft Word document with formatted content
- **PDF Export**: PDF document with professional formatting

#### Key Features:
- Streaming file downloads for large files
- Configurable content inclusion (transcript, summary, action items)
- Proper filename sanitization and MIME type handling
- Validation of export data requirements

### 2. Export API Endpoint (`src/app/api/meetings/[id]/export/route.ts`)

RESTful API endpoint for handling export requests:

```
GET /api/meetings/[id]/export?format=pdf&include_transcript=true&include_summary=true&include_action_items=true
```

#### Query Parameters:
- `format`: Export format (txt, srt, docx, pdf)
- `include_transcript`: Include transcript content (default: true)
- `include_summary`: Include meeting summary (default: true)
- `include_action_items`: Include action items (default: true)

### 3. Export Client (`src/lib/export-client.ts`)

Client-side utilities for handling exports:

- Download management with proper error handling
- Batch export capabilities
- Export preview functionality
- Format validation and support checking

### 4. React Hook (`src/hooks/useExport.ts`)

React hook for managing export state and operations:

```typescript
const { exportState, downloadExport, downloadBatchExports } = useExport();
```

#### Features:
- Loading states and progress tracking
- Error handling and recovery
- Batch export support
- Format utilities and validation

### 5. Export Button Component (`src/components/meetings/ExportButton.tsx`)

Ready-to-use React component for export functionality:

```typescript
<ExportButton 
  recordId="meeting-123" 
  recordType="meeting"
  variant="dropdown" 
/>
```

## Supported Formats

### Text (TXT)
- Simple plain text format
- Includes all meeting content
- Good for basic sharing and archiving

### Subtitle (SRT)
- Standard subtitle format with timestamps
- Only available for transcriptions
- Useful for video synchronization

### Word Document (DOCX)
- Professional formatted document
- Includes structured sections
- Good for formal documentation

### PDF Document (PDF)
- Professional PDF with proper formatting
- Includes all content with good typography
- Best for sharing and printing

## Usage Examples

### Basic Export
```typescript
import { ExportClient } from '@/lib/export-client';

// Download a meeting as PDF
await ExportClient.downloadExport('meeting-123', {
  format: 'pdf',
  includeTranscript: true,
  includeSummary: true,
  includeActionItems: true
});
```

### Using React Hook
```typescript
import { useExport } from '@/hooks/useExport';

function MyComponent() {
  const { exportState, downloadExport } = useExport();
  
  const handleExport = async () => {
    await downloadExport('meeting-123', {
      format: 'docx',
      includeTranscript: true
    });
  };
  
  return (
    <button 
      onClick={handleExport}
      disabled={exportState.isExporting}
    >
      {exportState.isExporting ? 'Exporting...' : 'Export'}
    </button>
  );
}
```

### Using Export Button Component
```typescript
import { ExportButton } from '@/components/meetings/ExportButton';

function MeetingCard({ meeting }) {
  return (
    <div>
      <h3>{meeting.title}</h3>
      <ExportButton 
        recordId={meeting.id}
        recordType="meeting"
        variant="dropdown"
      />
    </div>
  );
}
```

## Error Handling

The export system includes comprehensive error handling:

- **Validation Errors**: Invalid format or missing required data
- **Network Errors**: API communication failures
- **Generation Errors**: File creation failures
- **Download Errors**: Browser download issues

All errors are properly typed and include helpful error messages for debugging.

## Performance Considerations

- **Streaming**: Large files are streamed to prevent memory issues
- **Caching**: Generated files can be cached temporarily
- **Compression**: Files are optimized for size
- **Progress Tracking**: User feedback during long operations

## Security

- **Authentication**: All exports require valid user authentication
- **Authorization**: Users can only export their own data
- **Input Validation**: All parameters are validated
- **Rate Limiting**: Prevents abuse of export endpoints

## Testing

A test endpoint is available for development:

```
GET /api/test-export?format=pdf
```

This generates a sample export with test data to verify functionality.

## Dependencies

- `jspdf`: PDF generation
- `docx`: Word document generation
- `html2canvas`: For advanced PDF features (if needed)

## Future Enhancements

- **Templates**: Custom export templates
- **Batch Processing**: Background job processing for large exports
- **Cloud Storage**: Direct export to cloud storage
- **Email Integration**: Email exports directly to users
- **Advanced Formatting**: More sophisticated document styling