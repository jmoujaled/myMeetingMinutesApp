# Search and Filter Components

This directory contains the search and filter components for the My Meetings page, implementing task 6 from the transcription history specification.

## Components

### SearchBar
- **File**: `SearchBar.tsx`
- **Purpose**: Provides a debounced search input for filtering meetings and transcriptions
- **Features**:
  - Debounced input (300ms default)
  - Clear button when text is present
  - Accessible with proper ARIA labels
  - Search icon and clear icon

### DateRangeFilter
- **File**: `DateRangeFilter.tsx`
- **Purpose**: Calendar-based date range picker for filtering by date
- **Features**:
  - Uses react-day-picker for calendar interface
  - Supports single date or date range selection
  - Responsive design with proper mobile support
  - Clear functionality
  - Formatted date display

### StatusFilter
- **File**: `StatusFilter.tsx`
- **Purpose**: Dropdown filter for transcription/meeting status
- **Options**:
  - All Status
  - Completed ✅
  - Processing ⏳
  - Failed ❌
- **Features**:
  - Radix UI Select component for accessibility
  - Visual icons for each status
  - Keyboard navigation support

### TypeFilter
- **File**: `TypeFilter.tsx`
- **Purpose**: Dropdown filter for content type
- **Options**:
  - All Types 📁
  - Meetings 👥
  - Transcriptions 🎵
- **Features**:
  - Radix UI Select component for accessibility
  - Visual icons for each type
  - Keyboard navigation support

### SearchAndFilters
- **File**: `SearchAndFilters.tsx`
- **Purpose**: Main component that combines all filters with state management
- **Features**:
  - URL synchronization for shareable filter states
  - Mobile-responsive design with collapsible filters
  - Active filter indicators
  - Clear all filters functionality
  - Results count display
  - Automatic page reset when filters change

## Hook

### useSearchFilters
- **File**: `../hooks/useSearchFilters.ts`
- **Purpose**: Custom hook for managing filter state
- **Features**:
  - Centralized filter state management
  - Helper functions for updating and resetting filters
  - Active filter detection

## Usage

```tsx
import SearchAndFilters from '@/components/meetings/SearchAndFilters'
import { useSearchFilters } from '@/hooks/useSearchFilters'

function MyMeetingsPage() {
  const { filters, updateFilters } = useSearchFilters()
  
  return (
    <SearchAndFilters
      filters={filters}
      onFiltersChange={updateFilters}
      totalResults={42}
    />
  )
}
```

## URL Synchronization

The SearchAndFilters component automatically synchronizes filter state with URL parameters:

- `search` - Search query string
- `dateFrom` - Start date (YYYY-MM-DD format)
- `dateTo` - End date (YYYY-MM-DD format)  
- `status` - Status filter (completed, processing, failed)
- `type` - Type filter (meetings, transcriptions)
- `page` - Pagination (automatically reset when filters change)

## Mobile Responsiveness

- **Desktop**: All filters displayed in a horizontal row
- **Tablet**: Filters wrap to multiple rows as needed
- **Mobile**: Collapsible filter section with toggle button
- **Touch-friendly**: Larger touch targets and proper spacing

## Accessibility

- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader friendly
- Focus management
- High contrast support

## Dependencies

- `react-day-picker` - Calendar component
- `date-fns` - Date formatting and manipulation
- `@radix-ui/react-select` - Accessible dropdown components
- `@radix-ui/react-popover` - Popover for date picker
- `next/navigation` - URL management

## Testing

Basic test coverage is provided in `__tests__/SearchAndFilters.test.tsx` covering:
- Component rendering
- Search input functionality
- Filter state changes
- Results display
- Clear filters functionality

## Requirements Satisfied

This implementation satisfies the following requirements from the specification:

- **3.1**: Text search functionality with debounced input
- **3.2**: Date range filtering with calendar picker
- **3.3**: Status and type filtering with dropdown components
- **8.3**: Mobile-responsive design with touch-friendly controls

## Future Enhancements

- Advanced search operators (AND, OR, NOT)
- Saved filter presets
- Filter history
- Export filtered results
- Bulk actions on filtered items