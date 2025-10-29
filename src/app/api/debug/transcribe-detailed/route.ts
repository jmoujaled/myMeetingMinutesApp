import { NextRequest, NextResponse } from 'next/server';
import { BatchTranscription } from 'speechmatics';
import OpenAI from 'openai';

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    steps: {}
  };

  try {
    // Step 1: Check environment variables
    results.steps.envCheck = {
      speechmaticsKey: !!process.env.SPEECHMATICS_API_KEY,
      openaiKey: !!process.env.OPENAI_API_KEY,
      status: 'completed'
    };

    // Step 2: Test Speechmatics initialization
    try {
      const speechmaticsKey = process.env.SPEECHMATICS_API_KEY;
      if (speechmaticsKey) {
        const speechmatics = new BatchTranscription(speechmaticsKey);
        results.steps.speechmaticsInit = {
          status: 'completed',
          initialized: true
        };
      } else {
        results.steps.speechmaticsInit = {
          status: 'failed',
          error: 'No Speechmatics API key'
        };
      }
    } catch (error) {
      results.steps.speechmaticsInit = {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Step 3: Test OpenAI initialization
    try {
      const openaiKey = process.env.OPENAI_API_KEY;
      if (openaiKey) {
        const openai = new OpenAI({ apiKey: openaiKey });
        results.steps.openaiInit = {
          status: 'completed',
          initialized: true
        };
      } else {
        results.steps.openaiInit = {
          status: 'failed',
          error: 'No OpenAI API key'
        };
      }
    } catch (error) {
      results.steps.openaiInit = {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Step 4: Test Supabase client creation
    try {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();
      results.steps.supabaseInit = {
        status: 'completed',
        initialized: true
      };
    } catch (error) {
      results.steps.supabaseInit = {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Step 5: Test usage service import
    try {
      const { usageService } = await import('@/lib/usage-service');
      results.steps.usageServiceImport = {
        status: 'completed',
        imported: true
      };
    } catch (error) {
      results.steps.usageServiceImport = {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    results.overall = {
      status: 'completed',
      allStepsSuccessful: Object.values(results.steps).every((step: any) => step.status === 'completed')
    };

    return NextResponse.json(results);

  } catch (error) {
    results.overall = {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    };

    return NextResponse.json(results, { status: 500 });
  }
}