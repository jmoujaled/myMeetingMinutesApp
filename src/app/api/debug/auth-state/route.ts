import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    // Use the auth middleware to get user info
    const { user, error } = await validateAuth(request);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      user: user ? {
        id: user.id,
        email: user.profile.email,
        tier: user.tier,
        profile: user.profile
      } : null,
      error: error?.error,
      errorCode: error?.code,
      hasValidAuth: !!user && !error
    });
  } catch (error) {
    console.error('Debug auth state error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      hasValidAuth: false
    }, { status: 500 });
  }
}