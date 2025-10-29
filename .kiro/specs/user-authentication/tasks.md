# Implementation Plan

- [x] 1. Set up Supabase project and configuration
  - Create new Supabase project for the Meeting Minutes App
  - Configure authentication settings and email templates
  - Set up Google OAuth provider in Supabase Auth settings
  - Configure Google Cloud Console OAuth credentials and redirect URLs
  - Set up environment variables in .env.local including Google OAuth keys
  - Install @supabase/supabase-js and @supabase/ssr packages
  - Create Supabase client configuration files
  - _Requirements: 1.2, 2.2, 8.1_

- [x] 2. Create database schema and security policies
  - [x] 2.1 Create user_profiles table with tier system
    - Write SQL migration for user_profiles table with tier, usage tracking fields
    - Add fields for OAuth provider info (Google profile data)
    - Set up database triggers for automatic profile creation on user registration (email and OAuth)
    - _Requirements: 6.1, 8.2_

  - [x] 2.2 Create transcription_jobs table for usage tracking
    - Write SQL migration for transcription_jobs table with user_id foreign key
    - Add indexes for efficient querying by user_id and created_at
    - _Requirements: 7.1, 8.3_

  - [x] 2.3 Create tier_limits table for subscription management
    - Write SQL migration for tier_limits table with usage quotas
    - Insert default tier configurations (free, pro, admin)
    - _Requirements: 6.2, 8.4_

  - [x] 2.4 Implement Row Level Security policies
    - Create RLS policies for user_profiles (users see own data, admins see all)
    - Create RLS policies for transcription_jobs (users see own jobs, admins see all)
    - Enable RLS on all tables and test access controls
    - _Requirements: 6.7, 8.6_

- [x] 3. Implement authentication components and context
  - [x] 3.1 Create AuthProvider context component
    - Build React context for user authentication state management
    - Implement signIn, signUp, signOut functions using Supabase Auth
    - Add user profile loading and caching logic
    - _Requirements: 1.1, 2.1, 2.5_

  - [x] 3.2 Create login and registration forms
    - Build responsive login form with email/password validation
    - Add Google Sign-In button with Supabase OAuth integration
    - Build registration form with email verification flow and Google sign-up option
    - Add error handling and loading states for both email and Google auth
    - Implement redirect logic after successful authentication from any method
    - Handle Google OAuth callback and profile data integration
    - _Requirements: 1.1, 1.3, 2.1, 2.3_

  - [x] 3.3 Create protected route wrapper component
    - Build ProtectedRoute component that checks authentication status
    - Add tier-based access control for different user levels
    - Implement automatic redirects for unauthorized access
    - _Requirements: 3.1, 6.6, 6.7_

- [x] 4. Add authentication middleware to API routes
  - [x] 4.1 Create authentication middleware utility
    - Build middleware function to validate Supabase JWT tokens
    - Extract user information from validated tokens
    - Add error handling for invalid or expired tokens
    - _Requirements: 3.4, 3.6_

  - [x] 4.2 Implement tier validation middleware
    - Create middleware to check user tier against required permissions
    - Add usage limit checking before processing requests
    - Implement appropriate error responses for tier violations
    - _Requirements: 6.4, 6.6, 7.3_

  - [x] 4.3 Update transcription API with authentication
    - Modify /api/transcribe route to require authentication
    - Add user_id to transcription job logging
    - Implement usage tracking and limit enforcement
    - _Requirements: 3.5, 7.1, 7.5_

- [x] 5. Create user profile and usage management
  - [x] 5.1 Build user profile page
    - Create profile page displaying user information and current tier
    - Add form for updating user profile information
    - Implement password change functionality
    - _Requirements: 4.1, 4.3, 4.6_

  - [x] 5.2 Create usage dashboard component
    - Build dashboard showing current usage vs tier limits
    - Display transcription history with job details
    - Add usage statistics and charts for user insights
    - _Requirements: 7.2, 7.4_

  - [x] 5.3 Implement tier upgrade/downgrade system
    - Create tier comparison component showing features and limits
    - Add upgrade prompts when users approach or exceed limits
    - Build admin interface for manual tier changes
    - _Requirements: 6.2, 6.4, 7.3_

- [x] 6. Protect existing routes and update navigation
  - [x] 6.1 Add authentication to studio pages
    - Wrap /studio and /studio2 pages with ProtectedRoute component
    - Update navigation to show login/logout options
    - Add user profile dropdown in header
    - _Requirements: 3.1, 3.2_

  - [x] 6.2 Create authentication pages
    - Build /login page with email/password form and Google Sign-In button
    - Build /register page with email verification flow and Google sign-up option
    - Create /forgot-password page for password reset (email users only)
    - Add /verify-email page for email confirmation
    - Handle OAuth callback page for Google authentication flow
    - _Requirements: 1.1, 2.1, 4.4, 4.5_

  - [x] 6.3 Update home page for authenticated users
    - Modify home page to show different content for logged-in users
    - Add quick access to user dashboard and recent transcriptions
    - Display tier-specific feature highlights
    - _Requirements: 6.5_

- [x] 7. Implement usage tracking and analytics
  - [x] 7.1 Create usage tracking service
    - Build service to record transcription usage in database
    - Implement monthly usage calculation and reset logic
    - Add functions to check current usage against tier limits
    - _Requirements: 7.1, 7.2, 8.5_

  - [x] 7.2 Add real-time usage updates
    - Implement Supabase real-time subscriptions for usage changes
    - Update UI components when usage limits change
    - Add live usage meter for users approaching limits
    - _Requirements: 7.6_

  - [x] 7.3 Fix missing user profile creation issue
    - Add fallback user profile creation in auth middleware when profile doesn't exist
    - Ensure tier_limits table is populated with default configurations
    - Add profile creation for existing users who don't have profiles
    - Test transcription API with proper user profile and tier limit validation
    - Fix infinite loading loops in ProtectedRoute component
    - Add timeout and retry mechanisms for profile creation
    - _Requirements: 1.6, 6.1, 9.1_

  - [ ]* 7.4 Create usage analytics for admins
    - Build admin dashboard showing system-wide usage statistics
    - Add user segmentation by tier and usage patterns
    - Implement usage trend analysis and reporting
    - _Requirements: 7.6_

- [x] 8. Add admin panel foundation
  - [x] 8.1 Create admin dashboard layout
    - Build admin-only dashboard with navigation sidebar
    - Add user management interface with search and filtering
    - Create system overview with key metrics display
    - _Requirements: 6.3, 6.5_

  - [x] 8.2 Implement user management features
    - Build user list with tier information and usage stats
    - Add ability to change user tiers and reset usage
    - Implement user search and filtering capabilities
    - _Requirements: 6.2, 6.3_

  - [ ]* 8.3 Add system monitoring components
    - Create system health dashboard with API usage metrics
    - Add error tracking and logging for admin visibility
    - Implement usage alerts and notifications for admins
    - _Requirements: 6.5_

- [ ] 9. Testing and validation
  - [ ]* 9.1 Write authentication tests
    - Create unit tests for auth service functions
    - Write integration tests for login/register flows
    - Add tests for protected route access control
    - _Requirements: All authentication requirements_

  - [ ]* 9.2 Write usage tracking tests
    - Create tests for usage calculation and limit enforcement
    - Write tests for tier-based access control
    - Add tests for database operations and RLS policies
    - _Requirements: 6.7, 7.5, 8.7_

  - [ ]* 9.3 End-to-end testing
    - Create E2E tests for complete user registration and usage flow
    - Test tier upgrade scenarios and limit enforcement
    - Validate admin panel functionality and user management
    - _Requirements: All requirements_

- [ ] 10. Implement modern UI design with Shadcn UI
  - [x] 10.1 Install and configure Shadcn UI components
    - Install Shadcn UI CLI and initialize project configuration
    - Set up theming with teal color scheme and proper typography
    - Install required UI components (Button, Input, Card, Form, etc.)
    - _Requirements: 8.1, 8.2_

  - [x] 10.2 Redesign login page with modern interface
    - Create new login page layout matching the provided design mockup
    - Implement centered card design with "Log in to your account" heading
    - Add prominent "Continue with Google" button with official Google branding
    - Create "or log in with email" divider section
    - Style email and password input fields with proper labels
    - Add "Forgot your password?" link in teal color
    - Implement full-width teal "Sign in" button
    - Add "Don't have an account? Sign up with email" footer with teal link
    - Ensure responsive design works on mobile and desktop
    - Update routing to redirect to studio2 page after successful login
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 8.3, 8.4, 8.5, 8.6_

  - [x] 10.3 Update registration page to match design system
    - Apply consistent styling to registration form using Shadcn UI components
    - Ensure Google Sign-Up button matches login page design
    - Update form validation and error display styling
    - _Requirements: 1.1, 1.3, 8.2, 8.3, 8.4_

- [ ] 11. Deploy and configure production environment
  - Configure production Supabase project with proper security settings
  - Set up environment variables for production deployment
  - Configure email templates and SMTP settings for production
  - Test authentication flows in production environment
  - _Requirements: 1.2, 2.2, 4.4_