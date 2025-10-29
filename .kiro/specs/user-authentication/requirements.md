# Requirements Document

## Introduction

This feature implements a complete user authentication and registration system for the Meeting Minutes App using Supabase Auth and Database. Currently, the application has no user management - anyone can access transcription services without authentication. This system will establish user accounts, secure access controls, and enable usage tracking that will serve as the foundation for admin panel functionality and user management features.

The authentication system will leverage Supabase's built-in authentication, user management, and PostgreSQL database to protect transcription services, enable personalized user experiences, and provide the necessary infrastructure for implementing usage quotas, billing, and administrative oversight.

## Requirements

### Requirement 1

**User Story:** As a new user, I want to create an account with email/password or Google Sign-In using Supabase Auth, so that I can access transcription services securely and have my usage tracked.

#### Acceptance Criteria

1. WHEN a user visits the registration page THEN the system SHALL display a Supabase Auth registration form with email/password fields and Google Sign-In button
2. WHEN a user submits valid registration data THEN Supabase SHALL create a new user account and send a verification email
3. WHEN a user clicks Google Sign-In THEN the system SHALL redirect to Google OAuth and create account upon successful authentication
4. WHEN a user provides an email that already exists THEN Supabase SHALL return an appropriate error message
5. WHEN a user provides invalid password format THEN Supabase SHALL enforce password policy and display validation errors
6. WHEN a user successfully registers (email or Google) THEN the system SHALL create a user profile record in the Supabase database
7. WHEN a user completes email verification THEN Supabase SHALL activate their account for login

### Requirement 2

**User Story:** As a registered user, I want to log in with email/password or Google Sign-In using Supabase Auth through a modern, clean interface, so that I can access my personalized transcription workspace.

#### Acceptance Criteria

1. WHEN a user visits the login page THEN the system SHALL display a centered card with "Log in to your account" heading and modern UI design
2. WHEN a user sees the login form THEN the system SHALL display a prominent "Continue with Google" button with Google logo at the top
3. WHEN a user sees the login form THEN the system SHALL display "or log in with email" divider text between Google and email sections
4. WHEN a user sees the email section THEN the system SHALL display labeled "Email address" and "Password" input fields with proper styling
5. WHEN a user needs password help THEN the system SHALL display a "Forgot your password?" link in teal color
6. WHEN a user is ready to submit THEN the system SHALL display a full-width teal "Sign in" button
7. WHEN a user needs to register THEN the system SHALL display "Don't have an account? Sign up with email" text with teal link
8. WHEN a user submits valid credentials THEN Supabase SHALL authenticate them and the system SHALL redirect to the studio2 page
9. WHEN a user clicks Google Sign-In THEN the system SHALL authenticate via Google OAuth and redirect to the studio2 page
10. WHEN a user submits invalid credentials THEN Supabase SHALL return an authentication error message
11. WHEN a user has not verified their email (email users only) THEN Supabase SHALL prevent login and display verification required message
12. WHEN a user successfully logs in (any method) THEN Supabase SHALL create a secure JWT session with configurable expiration
13. WHEN a user session expires THEN the system SHALL use Supabase refresh tokens to maintain authentication state

### Requirement 3

**User Story:** As a logged-in user, I want to access transcription services, so that I can process audio files under my account.

#### Acceptance Criteria

1. WHEN an unauthenticated user tries to access /studio THEN the system SHALL redirect them to the login page
2. WHEN an authenticated user accesses /studio THEN the system SHALL display the transcription interface
3. WHEN an authenticated user submits a transcription request THEN the system SHALL associate the job with their user account
4. WHEN an unauthenticated user tries to call /api/transcribe THEN the system SHALL return a 401 unauthorized error
5. WHEN an authenticated user calls /api/transcribe THEN the system SHALL process the request and log usage to their account
6. WHEN a user's session expires THEN the system SHALL redirect them to login and preserve their intended destination

### Requirement 4

**User Story:** As a user, I want to manage my account settings, so that I can update my profile information and change my password.

#### Acceptance Criteria

1. WHEN a user accesses their profile page THEN the system SHALL display their current email and account information
2. WHEN a user updates their email address THEN the system SHALL require email verification before applying the change
3. WHEN a user changes their password THEN the system SHALL require their current password for verification
4. WHEN a user requests password reset THEN the system SHALL send a secure reset link to their email
5. WHEN a user clicks a valid password reset link THEN the system SHALL allow them to set a new password
6. WHEN a user updates their profile THEN the system SHALL display a success confirmation message

### Requirement 5

**User Story:** As a user, I want to log out of my account, so that I can securely end my session.

#### Acceptance Criteria

1. WHEN a user clicks the logout button THEN the system SHALL invalidate their session immediately
2. WHEN a user logs out THEN the system SHALL redirect them to the home page
3. WHEN a user's session is invalidated THEN the system SHALL clear all authentication cookies and tokens
4. WHEN a user tries to access protected pages after logout THEN the system SHALL redirect them to login

### Requirement 6

**User Story:** As a system administrator, I want a three-tier user system (Free, Pro, Admin), so that I can provide different access levels and features based on user subscription tiers.

#### Acceptance Criteria

1. WHEN a user account is created THEN the system SHALL assign them a default "free" tier
2. WHEN a user upgrades their subscription THEN the system SHALL update their tier to "pro" with access to enhanced features
3. WHEN an admin promotes a user THEN the system SHALL update their role to "admin" with full system access and user management capabilities
4. WHEN a pro tier user accesses the system THEN the system SHALL provide enhanced features not available to free tier users
5. WHEN an admin user accesses the system THEN the system SHALL provide access to administrative dashboard, user management, and system monitoring
6. WHEN any user tries to access features above their tier level THEN the system SHALL deny access with appropriate upgrade messaging
7. WHEN tier permissions are checked THEN the system SHALL enforce access controls consistently across all protected resources

### Requirement 7

**User Story:** As a system, I want to track user sessions and usage in Supabase database with tier-based limits, so that I can provide analytics and enforce tier-appropriate usage restrictions.

#### Acceptance Criteria

1. WHEN a user logs in THEN the system SHALL record the login timestamp and tier information in Supabase user_sessions table
2. WHEN a user makes a transcription request THEN the system SHALL log the usage in Supabase transcription_jobs table with user_id, tier, and usage metrics
3. WHEN a user's session is active THEN the system SHALL track their activity and current usage against their tier limits using Supabase real-time features
4. WHEN a free tier user exceeds their usage limits THEN the system SHALL enforce restrictions and display upgrade prompts
5. WHEN a pro tier user approaches their usage limits THEN the system SHALL provide usage warnings and tier-appropriate messaging
6. WHEN an admin views user analytics THEN the system SHALL display accurate usage statistics segmented by tier from Supabase database queries

### Requirement 8

**User Story:** As a developer, I want to use Shadcn UI components and modern design patterns, so that I can create a consistent, accessible, and professional user interface across all authentication pages.

#### Acceptance Criteria

1. WHEN setting up the project THEN the system SHALL install and configure Shadcn UI with proper theming
2. WHEN creating form components THEN the system SHALL use Shadcn UI form components with proper validation styling
3. WHEN displaying buttons THEN the system SHALL use consistent button variants and colors (teal primary, proper hover states)
4. WHEN creating input fields THEN the system SHALL use Shadcn UI input components with proper labels and error states
5. WHEN designing layouts THEN the system SHALL use responsive design patterns with proper spacing and typography
6. WHEN creating cards THEN the system SHALL use Shadcn UI card components with proper shadows and borders
7. WHEN implementing the Google Sign-In button THEN the system SHALL include the official Google logo and proper branding guidelines

### Requirement 9

**User Story:** As a system administrator, I want Supabase database tables to store user data, tier information, and usage metrics, so that I can manage users across different subscription tiers and track system usage effectively.

#### Acceptance Criteria

1. WHEN the system is initialized THEN Supabase SHALL have tables for user profiles with tier information, transcription jobs, usage tracking, and tier limits
2. WHEN a user registers THEN the system SHALL create a profile record in the user_profiles table with default "free" tier, usage quotas, and metadata
3. WHEN a transcription job is processed THEN the system SHALL store job details, user_id, tier information, and usage metrics in the database
4. WHEN usage limits are checked THEN the system SHALL query current usage against tier-specific quotas stored in the database
5. WHEN a user's tier changes THEN the system SHALL update their profile with new tier limits and reset usage counters as appropriate
6. WHEN usage data is queried THEN Supabase SHALL provide efficient access to user statistics, job history, and tier-based analytics
7. WHEN data needs to be analyzed THEN the system SHALL leverage Supabase's PostgreSQL capabilities for complex queries, reporting, and tier-based user segmentation