import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { usageService } from '@/lib/usage-service';

async function handleSystemInit(request: AuthenticatedRequest) {
  const user = request.user;

  // Only allow admin users to initialize the system
  if (user.tier !== 'admin') {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  try {
    // Ensure default tier limits exist using service client
    console.log('Initializing tier limits...');
    await usageService.ensureDefaultTierLimits();

    // Verify tier limits were created
    const freeTierLimits = await usageService.getTierLimits('free');
    const proTierLimits = await usageService.getTierLimits('pro');
    const adminTierLimits = await usageService.getTierLimits('admin');

    const tierLimitsCreated = !!(freeTierLimits && proTierLimits && adminTierLimits);

    return NextResponse.json({
      success: true,
      message: 'System initialization completed',
      results: {
        tierLimitsCreated,
        tierLimitsDetails: {
          free: !!freeTierLimits,
          pro: !!proTierLimits,
          admin: !!adminTierLimits
        }
      }
    });
  } catch (error) {
    console.error('System initialization error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to initialize system',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Export the authenticated POST handler
export const POST = withAuth(handleSystemInit, {
  requireAuth: true,
  requiredTier: 'admin'
});