import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';

async function handleGetProfile(request: AuthenticatedRequest) {
  try {
    // The auth middleware already ensures the user profile exists
    // and provides it in request.user
    return NextResponse.json({
      success: true,
      user: request.user
    });
  } catch (error) {
    console.error('Error in profile endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to get user profile' },
      { status: 500 }
    );
  }
}

// Export the authenticated GET handler
export const GET = withAuth(handleGetProfile, {
  requireAuth: true,
  checkUsageLimits: false // Don't check usage limits for profile endpoint
});