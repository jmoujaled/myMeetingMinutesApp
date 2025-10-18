import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { usageService } from '@/lib/usage-service';

async function handleUserProfileDebug(request: AuthenticatedRequest) {
  const user = request.user;

  try {
    // Get current usage stats
    const usageStats = await usageService.getCurrentUsage(user.id);
    
    // Get tier limits
    const tierLimits = await usageService.getTierLimits(user.tier);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        tier: user.tier,
        profile: user.profile
      },
      usageStats,
      tierLimits,
      debug: {
        message: 'User profile and usage data retrieved successfully',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('User profile debug error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve user profile debug info',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Export the authenticated GET handler
export const GET = withAuth(handleUserProfileDebug, {
  requireAuth: true
});