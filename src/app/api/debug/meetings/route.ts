import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // First, check if we can import Supabase
    let supabaseImportError = null;
    let createClient = null;
    
    try {
      const supabaseModule = await import('@/lib/supabase/server');
      createClient = supabaseModule.createClient;
    } catch (importError) {
      supabaseImportError = importError instanceof Error ? importError.message : 'Failed to import Supabase';
    }

    if (supabaseImportError || !createClient) {
      return NextResponse.json({
        error: 'Supabase import failed',
        details: supabaseImportError,
        env: {
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'missing',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'missing',
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'missing',
        }
      });
    }

    const supabase = await createClient();

    // Test basic connection
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    return NextResponse.json({
      status: 'success',
      auth: {
        user: user ? { id: user.id, email: user.email } : null,
        error: authError?.message || null,
      },
      env: {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'missing',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'missing',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'missing',
      }
    });
  } catch (error) {
    console.error('Debug API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null,
      },
      { status: 500 }
    );
  }
}