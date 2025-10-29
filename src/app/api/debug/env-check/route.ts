import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const envCheck = {
      speechmaticsKey: !!process.env.SPEECHMATICS_API_KEY,
      openaiKey: !!process.env.OPENAI_API_KEY,
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      nodeEnv: process.env.NODE_ENV,
      runtime: 'nodejs',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      status: 'Environment check completed',
      environment: envCheck,
      missingKeys: Object.entries(envCheck)
        .filter(([key, value]) => key !== 'nodeEnv' && key !== 'runtime' && key !== 'timestamp' && !value)
        .map(([key]) => key),
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Environment check failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}