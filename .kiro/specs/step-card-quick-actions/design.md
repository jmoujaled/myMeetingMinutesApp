# Design Document

## Overview

This design enhances the existing step card interface in the meeting minutes application by adding quick action buttons that appear on collapsed cards. The solution maintains the current expansion/collapse behavior while providing immediate access to primary actions without requiring card expansion.

## Architecture

### Component Structure

The enhancement will modify the existing step card structure in `src/app/studio2/page.tsx` by:

1. **Adding Quick Action Buttons**: Each step card will have a conditional quick action button that appears only when the card is collapsed
2. **Preserving Existing Behavior**: The current click-to-expand functionality will remain unchanged for areas outside the quick action button
3. **Event Handling**: Click events on quick action buttons will be prevented from bubbling to avoid triggering card expansion

### State Management

The existing state variables will be leveraged:
- `captureOpen`: Controls step 1 expansion state
- `contextOpen`: Controls step 2 expansion state  
- `submitOpen`: Controls step 3 expansion state

No additional state variables are required as the quick action buttons will directly call existing handler functions.

## Components and Interfaces

### Step Card Structure Enhancement

Each step card will follow this enhanced structure:

```tsx
<div className={styles.panel}>
  <button className={styles.stepHeader} onClick={handleCardExpansion}>
    <div className={styles.stepLabel}>
      {/* Existing step content */}
    </div>
    
    {/* NEW: Quick Action Button - only shown when collapsed */}
    {!isExpanded && (
      <button 
        className={styles.quickActionButton}
        onClick={handleQuickAction}
        onMouseDown={preventBubbling}
      >
        {buttonText}
      </button>
    )}
    
    <span className={styles.chevron}>
      {/* Existing chevron */}
    </span>
  </button>
  
  {/* Existing expanded content */}
</div>
```

### Quick Action Button Component

A reusable button component will be created with the following interface:

```tsx
interface QuickActionButtonProps {
  variant: 'record' | 'context' | 'generate';
  onClick: () => void;
  disabled?: boolean;
  isVisible: boolean;
}
```

### Button Variants

1. **Record Meeting Button** (Step 1)
   - Color: Red (`#ef4444`)
   - Text: "Record Meeting"
   - Action: Calls `handleMeetingRecordToggle()`

2. **Record Meeting Context Button** (Step 2)
   - Color: Grey (`rgba(15, 23, 42, 0.04)`)
   - Text: "Record Meeting Context"
   - Action: Calls `handleContextRecordToggle()`

3. **Generate Minutes Button** (Step 3)
   - Color: Blue (`#2563eb`)
   - Text: "Generate Minutes"
   - Action: Calls `handleSubmit()`

## Data Models

No new data models are required. The enhancement uses existing state and handler functions.

## Error Handling

### Event Propagation Prevention

Quick action buttons must prevent event bubbling to avoid triggering card expansion:

```tsx
const handleQuickActionClick = (event: React.MouseEvent, action: () => void) => {
  event.preventDefault();
  event.stopPropagation();
  action();
};
```

### Disabled State Handling

Quick action buttons will respect the same disabled conditions as their expanded counterparts:

- Step 1: Disabled when `isSubmitting || isProcessingRecording`
- Step 2: Disabled when `isRecordingContext || isTranscribingContext`
- Step 3: Disabled when `!file || isSubmitting`

### Error State Display

Errors will continue to be displayed in the expanded card content. Quick action buttons will not show error states directly but will be disabled when errors prevent actions.

## Testing Strategy

### Unit Testing Approach

1. **Button Visibility Tests**
   - Verify buttons appear only when cards are collapsed
   - Verify buttons disappear when cards are expanded
   - Test all three step cards independently

2. **Event Handling Tests**
   - Verify quick action buttons call correct handler functions
   - Verify event propagation is prevented
   - Verify card expansion doesn't occur when quick action is clicked

3. **Disabled State Tests**
   - Test button disabled states match existing logic
   - Verify disabled buttons don't execute actions
   - Test visual disabled state styling

4. **Integration Tests**
   - Test complete user workflows using quick actions
   - Verify existing functionality remains unchanged
   - Test responsive behavior on different screen sizes

### Visual Testing

1. **Styling Verification**
   - Verify button colors match specifications
   - Test hover and focus states
   - Verify button positioning and alignment
   - Test dark mode compatibility

2. **Responsive Testing**
   - Test button behavior on mobile devices
   - Verify button sizing and touch targets
   - Test layout with long button text

### Accessibility Testing

1. **Keyboard Navigation**
   - Verify buttons are keyboard accessible
   - Test tab order and focus management
   - Verify screen reader compatibility

2. **ARIA Attributes**
   - Add appropriate `aria-label` attributes
   - Ensure buttons have descriptive accessible names
   - Test with screen readers

## Implementation Details

### CSS Classes

New CSS classes will be added to `src/app/studio2/page.module.css`:

```css
.quickActionButton {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
  margin-left: auto;
}

.quickActionButton:hover {
  transform: translateY(-1px);
}

.quickActionButton:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
}

.quickActionRecord {
  background: #ef4444;
  color: #ffffff;
  box-shadow: 0 8px 16px rgba(239, 68, 68, 0.2);
}

.quickActionContext {
  background: rgba(15, 23, 42, 0.04);
  color: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(15, 23, 42, 0.08);
}

.quickActionGenerate {
  background: #2563eb;
  color: #ffffff;
  box-shadow: 0 8px 16px rgba(37, 99, 235, 0.2);
}
```

### Event Handler Modifications

The existing step header click handlers will be modified to check if the click originated from a quick action button:

```tsx
const handleStepHeaderClick = (event: React.MouseEvent, toggleFunction: () => void) => {
  // Don't expand if click came from quick action button
  if ((event.target as HTMLElement).closest('.quickActionButton')) {
    return;
  }
  toggleFunction();
};
```

### Dark Mode Support

Dark mode styles will be added to ensure proper contrast and visibility:

```css
@media (prefers-color-scheme: dark) {
  .quickActionRecord {
    background: #f87171;
    box-shadow: 0 8px 16px rgba(248, 113, 113, 0.25);
  }
  
  .quickActionContext {
    background: rgba(226, 232, 240, 0.08);
    color: rgba(226, 232, 240, 0.9);
    border-color: rgba(226, 232, 240, 0.18);
  }
  
  .quickActionGenerate {
    background: #3b82f6;
    box-shadow: 0 8px 16px rgba(59, 130, 246, 0.25);
  }
}
```

This design maintains the existing user experience while adding the requested quick action functionality in a clean, accessible, and maintainable way.