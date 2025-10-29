import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';

async function handleTranscribeTest(request: AuthenticatedRequest) {
  try {
    const user = request.user;
    
    // Check environment variables
    const envCheck = {
      speechmaticsKey: !!process.env.SPEECHMATICS_API_KEY,
      openaiKey: !!process.env.OPENAI_API_KEY,
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    };

    // Test basic functionality
    const testResults = {
      authWorking: !!user,
      userInfo: user ? {
        id: user.id,
        email: user.email,
        tier: user.tier
      } : null,
      environment: envCheck,
      missingEnvVars: Object.entries(envCheck)
        .filter(([_, value]) => !value)
        .map(([key]) => key),
      timestamp: new Date().toISOString()
    };

    return NextResponse.json({
      status: 'Transcribe test completed',
      results: testResults,
      canProceed: testResults.authWorking && testResults.missingEnvVars.length === 0
    });

  } catch (error) {
    console.error('Transcribe test error:', error);
    return NextResponse.json(
      { 
        error: 'Transcribe test failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handleTranscribeTest, {
  requireAuth: true,
  checkUsageLimits: false
});

export const GET = withAuth(handleTranscribeTest, {
  requireAuth: true,
  checkUsageLimits: false
});