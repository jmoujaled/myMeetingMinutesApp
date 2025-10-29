# Requirements Document

## Introduction

This feature enhances the meeting minutes application's step cards by adding quick action buttons that are visible when the cards are in their collapsed (default) state. Users can perform primary actions directly from the collapsed view without needing to expand the cards first. The buttons should disappear when cards are expanded and reappear when collapsed.

## Requirements

### Requirement 1

**User Story:** As a user, I want to see quick action buttons on collapsed step cards, so that I can immediately perform the primary action for each step without expanding the card first.

#### Acceptance Criteria

1. WHEN a step card is in its collapsed state THEN the system SHALL display a quick action button on the right side of the card
2. WHEN a user clicks the quick action button THEN the system SHALL execute the primary action for that step without expanding the card
3. WHEN a user clicks anywhere else on the collapsed card (outside the quick action button) THEN the system SHALL expand the card and hide the quick action button

### Requirement 2

**User Story:** As a user, I want step 1 to show a "Record Meeting" button when collapsed, so that I can immediately start recording audio without expanding the card.

#### Acceptance Criteria

1. WHEN step 1 (audio capture) is collapsed THEN the system SHALL display a red "Record Meeting" button on the right side
2. WHEN the user clicks the "Record Meeting" button THEN the system SHALL start the meeting recording functionality
3. WHEN step 1 is expanded THEN the system SHALL hide the quick action button and show the existing expanded interface

### Requirement 3

**User Story:** As a user, I want step 2 to show a "Record Meeting Context" button when collapsed, so that I can immediately add context via voice recording without expanding the card.

#### Acceptance Criteria

1. WHEN step 2 (meeting context) is collapsed THEN the system SHALL display a grey "Record Meeting Context" button on the right side
2. WHEN the user clicks the "Record Meeting Context" button THEN the system SHALL start the context recording functionality
3. WHEN step 2 is expanded THEN the system SHALL hide the quick action button and show the existing expanded interface

### Requirement 4

**User Story:** As a user, I want step 3 to show a "Generate Minutes" button when collapsed, so that I can immediately start the transcription process without expanding the card.

#### Acceptance Criteria

1. WHEN step 3 (submit for transcription) is collapsed THEN the system SHALL display a blue "Generate Minutes" button on the right side
2. WHEN the user clicks the "Generate Minutes" button THEN the system SHALL execute the form submission to generate meeting minutes
3. WHEN step 3 is expanded THEN the system SHALL hide the quick action button and show the existing expanded interface including the "Generate minutes" button

### Requirement 5

**User Story:** As a user, I want the quick action buttons to have appropriate visual styling, so that they are clearly identifiable and match the application's design system.

#### Acceptance Criteria

1. WHEN displaying quick action buttons THEN the system SHALL use consistent button styling with appropriate colors (red for recording, grey for context, blue for generation)
2. WHEN a quick action button is hovered THEN the system SHALL provide visual feedback
3. WHEN a quick action button is disabled THEN the system SHALL display appropriate disabled state styling

### Requirement 6

**User Story:** As a user, I want the card expansion behavior to remain unchanged when clicking outside the quick action buttons, so that the existing interaction patterns are preserved.

#### Acceptance Criteria

1. WHEN a user clicks on any area of a collapsed card except the quick action button THEN the system SHALL expand the card as it currently does
2. WHEN a card is expanded THEN the system SHALL hide the quick action button
3. WHEN a card is collapsed again THEN the system SHALL show the quick action button again