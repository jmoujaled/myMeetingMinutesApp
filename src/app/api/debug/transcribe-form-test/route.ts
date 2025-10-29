import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { usageService } from '@/lib/usage-service';

async function handleTranscribeFormTest(request: AuthenticatedRequest) {
  try {
    const user = request.user;
    const results: any = {
      timestamp: new Date().toISOString(),
      user: { id: user.id, tier: user.tier },
      tests: {}
    };

    // Test 1: Usage service check limits
    try {
      const usageLimitCheck = await usageService.checkLimits(user.id, user.tier, { 
        fileSizeMB: 1 // Test with 1MB file
      });
      
      results.tests.usageLimitCheck = {
        status: 'completed',
        canProceed: usageLimitCheck.canProceed,
        reason: usageLimitCheck.reason,
        usageStats: usageLimitCheck.usageStats
      };
    } catch (error) {
      results.tests.usageLimitCheck = {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 2: Try to get current usage
    try {
      const currentUsage = await usageService.getCurrentUsage(user.id);
      results.tests.getCurrentUsage = {
        status: 'completed',
        usage: currentUsage
      };
    } catch (error) {
      results.tests.getCurrentUsage = {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 3: Try to get tier limits
    try {
      const tierLimits = await usageService.getTierLimits(user.tier);
      results.tests.getTierLimits = {
        status: 'completed',
        limits: tierLimits
      };
    } catch (error) {
      results.tests.getTierLimits = {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 4: Try to record usage (test database operations)
    try {
      await usageService.recordUsage(user.id, {
        filename: 'test.mp3',
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
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 5: Form data parsing (if POST with form data)
    if (request.method === 'POST') {
      try {
        const formData = await request.formData();
        const audioBlob = formData.get('audio');
        
        results.tests.formDataParsing = {
          status: 'completed',
          hasAudio: !!audioBlob,
          audioType: audioBlob ? typeof audioBlob : null,
          isBlob: audioBlob instanceof Blob,
          audioSize: audioBlob instanceof Blob ? audioBlob.size : null,
          formDataKeys: Array.from(formData.keys())
        };
      } catch (error) {
        results.tests.formDataParsing = {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    } else {
      results.tests.formDataParsing = {
        status: 'skipped',
        reason: 'Not a POST request with form data'
      };
    }

    results.overall = {
      status: 'completed',
      allTestsPassed: Object.values(results.tests).every((test: any) => test.status === 'completed')
    };

    return NextResponse.json(results);

  } catch (error) {
    console.error('Transcribe form test error:', error);
    return NextResponse.json(
      { 
        status: 'Transcribe form test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleTranscribeFormTest, {
  requireAuth: true,
  checkUsageLimits: false
});

export const POST = withAuth(handleTranscribeFormTest, {
  requireAuth: true,
  checkUsageLimits: false
});