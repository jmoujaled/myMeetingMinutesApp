import { NextRequest, NextResponse } from 'next/server';
import { scheduleMonthlyUsageReset } from '@/lib/usage-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cron endpoint for scheduled monthly usage reset
 * This should be called by a cron job service (e.g., Vercel Cron, GitHub Actions, etc.)
 * 
 * For security, you should add authentication via:
 * - Authorization header with a secret token
 * - Vercel Cron Secret
 * - IP allowlist
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Add authentication for cron jobs
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('Starting scheduled monthly usage reset...');
    await scheduleMonthlyUsageReset();
    
    return NextResponse.json({
      success: true,
      message: 'Monthly usage reset completed successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to reset monthly usage',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}