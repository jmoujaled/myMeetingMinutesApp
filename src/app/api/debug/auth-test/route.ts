import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';

async function handleAuthTest(request: AuthenticatedRequest) {
  try {
    const user = request.user;
    
    return NextResponse.json({
      status: 'Auth test successful',
      timestamp: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        tier: user.tier,
        hasProfile: !!user.profile
      },
      authWorking: true
    });

  } catch (error) {
    console.error('Auth test error:', error);
    return NextResponse.json(
      { 
        status: 'Auth test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        authWorking: false
      },
      { status: 500 }
    );
  }
}

// Test both GET and POST with auth
export const GET = withAuth(handleAuthTest, {
  requireAuth: true,
  checkUsageLimits: false
});

export const POST = withAuth(handleAuthTest, {
  requireAuth: true,
  checkUsageLimits: false
});