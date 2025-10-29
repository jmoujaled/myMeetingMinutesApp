import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { usageService } from '@/lib/usage-service';

async function handleUsageServiceTest(request: AuthenticatedRequest) {
  const user = request.user;
  const results: any = {
    timestamp: new Date().toISOString(),
    user: {
      id: user.id,
      tier: user.tier
    },
    tests: {}
  };

  // Test 1: Check if we can get current usage
  try {
    const usage = await usageService.getCurrentUsage(user.id);
    results.tests.getCurrentUsage = {
      status: 'completed',
      usage: usage
    };
  } catch (error) {
    results.tests.getCurrentUsage = {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Test 2: Check if we can get tier limits
  try {
    const limits = await usageService.getTierLimits(user.tier);
    results.tests.getTierLimits = {
      status: 'completed',
      limits: limits
    };
  } catch (error) {
    results.tests.getTierLimits = {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Test 3: Test recordUsage method
  try {
    await usageService.recordUsage(user.id, {
      filename: `test-usage-${Date.now()}.mp3`,
      fileSize: 1024 * 1024, // 1MB
      usageCost: 1
    });
    
    results.tests.recordUsage = {
      status: 'completed',
      message: 'Successfully recorded test usage'
    };
  } catch (error) {
    results.tests.recordUsage = {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    };
  }

  // Test 4: Test checkLimits method
  try {
    const limitCheck = await usageService.checkLimits(user.id, user.tier, {
      fileSizeMB: 1
    });
    
    results.tests.checkLimits = {
      status: 'completed',
      result: limitCheck
    };
  } catch (error) {
    results.tests.checkLimits = {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Test 5: Test service client creation
  try {
    const { createServiceClient } = await import('@/lib/supabase/service');
    const supabase = createServiceClient();
    
    // Try a simple query
    const { data, error } = await (supabase as any)
      .from('user_profiles')
      .select('id, tier')
      .eq('id', user.id)
      .single();
    
    results.tests.serviceClient = {
      status: 'completed',
      hasData: !!data,
      error: error?.message || null,
      profile: data
    };
  } catch (error) {
    results.tests.serviceClient = {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    };
  }

  results.overall = {
    status: 'completed',
    allTestsPassed: Object.values(results.tests).every((test: any) => test.status === 'completed')
  };

  return NextResponse.json(results);
}

export const GET = withAuth(handleUsageServiceTest, {
  requireAuth: true,
  checkUsageLimits: false
});