# Meeting and Transcription Card Components

This directory contains the card components for displaying meeting records and transcription jobs in the My Meetings page.

## Components

### RecordCard
The main component that automatically renders either a `MeetingCard` or `TranscriptionCard` based on the record type.

**Props:**
- `record: TranscriptionHistoryRecord` - The meeting or transcription record to display
- `onView: (id: string) => void` - Callback when user clicks to view details
- `onDownload: (id: string, format: ExportFormat) => void` - Callback for download actions
- `onDelete: (id: string) => Promise<void>` - Callback for delete actions (async)
- `onSaveAsMeeting?: (id: string) => void` - Optional callback to save transcription as meeting
- `isLoading?: boolean` - Loading state
- `className?: string` - Additional CSS classes

### MeetingCard
Displays meeting records with summaries, action items, and attendees.

**Features:**
- Meeting title, description, and date
- Attendee count and duration
- Action items count and key topics
- Status indicators with appropriate colors
- Download options (TXT, Word, PDF)
- Delete confirmation

### TranscriptionCard
Displays transcription job records with processing status and file information.

**Features:**
- Filename and file size
- Processing status with animated indicators
- Duration and creation date
- Error messages for failed transcriptions
- "Save as Meeting" option for completed transcriptions
- Download options (TXT, SRT)
- Tier and usage cost information

### ConfirmDialog
A reusable confirmation dialog for destructive actions.

**Props:**
- `isOpen: boolean` - Dialog visibility
- `onClose: () => void` - Close callback
- `onConfirm: () => void` - Confirm callback
- `title: string` - Dialog title
- `description: string` - Dialog description
- `confirmText?: string` - Confirm button text (default: "Confirm")
- `cancelText?: string` - Cancel button text (default: "Cancel")
- `variant?: 'destructive' | 'default'` - Visual variant
- `isLoading?: boolean` - Loading state

### CardSkeleton & CardSkeletonList
Loading skeleton components for better UX during data fetching.

**CardSkeletonList Props:**
- `count?: number` - Number of skeleton cards (default: 3)
- `className?: string` - Additional CSS classes

## Usage Example

```tsx
import { RecordCard } from '@/components/meetings';
import { useExport } from '@/hooks/useExport';

function MeetingsList({ records }: { records: TranscriptionHistoryRecord[] }) {
  const { downloadExport } = useExport();

  const handleView = (id: string) => {
    // Navigate to detail view
  };

  const handleDownload = async (id: string, format: ExportFormat) => {
    await downloadExport(id, { format });
  };

  const handleDelete = async (id: string) => {
    // Call API to delete record
  };

  const handleSaveAsMeeting = (id: string) => {
    // Navigate to meeting creation form
  };

  return (
    <div className="space-y-4">
      {records.map(record => (
        <RecordCard
          key={record.id}
          record={record}
          onView={handleView}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onSaveAsMeeting={handleSaveAsMeeting}
        />
      ))}
    </div>
  );
}
```

## Styling

The components use Tailwind CSS and follow the design system established in the UI components. Key styling features:

- **Hover Effects**: Cards have subtle shadow and scale effects on hover
- **Status Colors**: 
  - Green for completed
  - Yellow for processing
  - Red for failed/errors
  - Gray for cancelled/unknown
- **Responsive Design**: Cards adapt to different screen sizes
- **Loading States**: Disabled appearance and loading indicators
- **Interactive Elements**: Proper focus states and accessibility

## Accessibility

- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader friendly
- High contrast colors for status indicators
- Focus management in dialogs

## Dependencies

- `lucide-react` - Icons
- `@radix-ui/react-dropdown-menu` - Dropdown menus
- `date-fns` - Date formatting
- `class-variance-authority` - Component variants
- `tailwind-merge` - CSS class merging

## Testing

A demo component is available at `/test-cards` to preview all card states and interactions.

## Requirements Fulfilled

This implementation addresses the following requirements from the specification:

- **1.2**: Display transcription jobs with filename, status, duration, and creation date
- **1.3**: Show processing indicators and error messages
- **1.4**: Display meeting records with title, date, duration, and metadata
- **2.4**: Full meeting details including transcript and summary access
- **7.3**: Confirmation dialogs for destructive actions

The components provide a comprehensive interface for viewing and managing both meeting records and transcription jobs with proper state management and user feedback.