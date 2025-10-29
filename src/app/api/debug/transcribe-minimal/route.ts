import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';

async function handleMinimalTranscribe(request: AuthenticatedRequest) {
  try {
    const user = request.user;
    
    // Test 1: Basic auth
    if (!user) {
      return NextResponse.json({ error: 'No user found' }, { status: 401 });
    }

    // Test 2: Environment variables
    const speechmaticsKey = process.env.SPEECHMATICS_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    
    if (!speechmaticsKey || !openaiKey) {
      return NextResponse.json({
        error: 'Missing API keys',
        details: {
          speechmatics: !!speechmaticsKey,
          openai: !!openaiKey
        }
      }, { status: 500 });
    }

    // Test 3: Try to parse form data (if POST)
    let formDataTest = null;
    if (request.method === 'POST') {
      try {
        const formData = await request.formData();
        const audioBlob = formData.get('audio');
        formDataTest = {
          hasAudio: !!audioBlob,
          audioType: audioBlob ? typeof audioBlob : null,
          isBlob: audioBlob instanceof Blob,
          formDataKeys: Array.from(formData.keys())
        };
      } catch (formError) {
        formDataTest = {
          error: formError instanceof Error ? formError.message : 'Form data parsing failed'
        };
      }
    }

    // Test 4: Try to initialize Speechmatics
    let speechmaticsTest = null;
    try {
      const { BatchTranscription } = await import('speechmatics');
      const speechmatics = new BatchTranscription(speechmaticsKey);
      speechmaticsTest = { initialized: true };
    } catch (speechmaticsError) {
      speechmaticsTest = {
        error: speechmaticsError instanceof Error ? speechmaticsError.message : 'Speechmatics init failed'
      };
    }

    // Test 5: Try to initialize OpenAI
    let openaiTest = null;
    try {
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: openaiKey });
      openaiTest = { initialized: true };
    } catch (openaiError) {
      openaiTest = {
        error: openaiError instanceof Error ? openaiError.message : 'OpenAI init failed'
      };
    }

    return NextResponse.json({
      status: 'Minimal transcribe test completed',
      timestamp: new Date().toISOString(),
      tests: {
        auth: { passed: true, user: { id: user.id, tier: user.tier } },
        environment: { passed: true, speechmatics: !!speechmaticsKey, openai: !!openaiKey },
        formData: formDataTest,
        speechmatics: speechmaticsTest,
        openai: openaiTest
      }
    });

  } catch (error) {
    console.error('Minimal transcribe test error:', error);
    return NextResponse.json(
      { 
        status: 'Minimal transcribe test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleMinimalTranscribe, {
  requireAuth: true,
  checkUsageLimits: false
});

export const POST = withAuth(handleMinimalTranscribe, {
  requireAuth: true,
  checkUsageLimits: false
});