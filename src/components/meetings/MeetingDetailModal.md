# MeetingDetailModal Component

## Overview

The `MeetingDetailModal` component provides a comprehensive view of meeting details in a modal dialog. It displays full meeting information including metadata, summary, action items, and transcript with proper formatting and interactive elements.

## Features

### Core Functionality
- **Full Meeting Data Display**: Shows complete meeting information including title, description, date, duration, and attendees
- **Transcript Display**: Renders the full transcript with proper formatting in a scrollable container
- **Interactive Action Items**: Displays action items with checkboxes that can be toggled (local state only)
- **Meeting Metadata**: Shows attendees, key topics, and source file information
- **Export Integration**: Provides download buttons for various export formats

### UI/UX Features
- **Responsive Design**: Adapts to different screen sizes with proper mobile support
- **Loading States**: Shows loading spinner while fetching meeting data
- **Error Handling**: Displays user-friendly error messages with retry options
- **Backdrop Click**: Closes modal when clicking outside the content area
- **Keyboard Accessible**: Proper focus management and keyboard navigation

## Props

```typescript
interface MeetingDetailModalProps {
  meetingId: string;           // ID of the meeting to display
  isOpen: boolean;             // Controls modal visibility
  onClose: () => void;         // Callback when modal should close
  onDownload?: (id: string, format: ExportFormat) => void; // Optional download handler
}
```

## Usage

### Basic Usage

```tsx
import { MeetingDetailModal } from '@/components/meetings';

function MyComponent() {
  const [showModal, setShowModal] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState('');

  const handleDownload = (id: string, format: ExportFormat) => {
    // Handle download logic
    console.log('Download meeting:', id, 'format:', format);
  };

  return (
    <>
      <button onClick={() => {
        setSelectedMeetingId('meeting-123');
        setShowModal(true);
      }}>
        View Meeting Details
      </button>

      <MeetingDetailModal
        meetingId={selectedMeetingId}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onDownload={handleDownload}
      />
    </>
  );
}
```

### Integration with MeetingCard

The modal is automatically integrated with the `MeetingCard` component. When users click on a meeting card or select "View Details" from the dropdown menu, the modal opens with the meeting details.

## Data Requirements

The component expects the meeting API endpoint (`/api/meetings/[id]`) to return data in the following format:

```typescript
interface GetMeetingDetailResponse {
  meeting: {
    id: string;
    title: string;
    description?: string;
    meeting_date?: string;
    duration_minutes?: number;
    attendees?: string[];
    transcript_text?: string;
    summary?: string;
    action_items?: ActionItem[];
    key_topics?: string[];
    created_at: string;
    updated_at: string;
    // ... other meeting fields
  };
  transcription_job?: {
    filename: string;
    file_size: number | null;
    processing_time: number | null;
  };
}
```

## Action Items

Action items are displayed with interactive checkboxes that allow users to mark items as complete. The component includes:

- **Visual States**: Different styling for completed vs pending items
- **Metadata Display**: Shows assignee, due date, and priority when available
- **Notes**: Displays additional notes in italics
- **Priority Badges**: Color-coded priority indicators (high, medium, low)

### Action Item Structure

```typescript
interface ActionItem {
  id?: string;
  text: string;
  assignee?: string;
  due_date?: string;
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
  notes?: string;
}
```

## Styling

The component uses Tailwind CSS classes and follows the existing design system:

- **Modal Backdrop**: Semi-transparent black overlay with backdrop blur
- **Content Container**: White rounded container with shadow
- **Responsive Layout**: Adapts to mobile screens with proper spacing
- **Color Scheme**: Consistent with the application's color palette
- **Typography**: Proper text hierarchy and readability

## Error Handling

The component handles various error states:

- **Network Errors**: Shows retry button and error message
- **Not Found**: Displays appropriate message when meeting doesn't exist
- **Loading States**: Shows spinner during data fetching
- **Invalid Data**: Gracefully handles missing or malformed data

## Accessibility

- **Keyboard Navigation**: Proper tab order and keyboard shortcuts
- **Screen Reader Support**: Semantic HTML and ARIA labels
- **Focus Management**: Traps focus within modal when open
- **Color Contrast**: Meets WCAG accessibility guidelines

## Demo

You can see the component in action by visiting `/test-cards` and clicking the "Open Meeting Detail Modal" button, which demonstrates the modal with sample meeting data.

## Future Enhancements

- **Action Item Sync**: Currently action item toggles only update local state. Future versions could sync with the backend
- **Edit Mode**: Allow inline editing of meeting details
- **Comments**: Add ability to add comments to meetings
- **Sharing**: Share meeting details with team members
- **Print View**: Optimized layout for printing meeting summaries