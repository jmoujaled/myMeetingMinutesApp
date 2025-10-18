import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the latest transcription jobs with their metadata
    const { data: jobs, error: jobsError } = await supabase
      .from('transcription_jobs')
      .select('id, filename, status, metadata, created_at, duration_seconds')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError);
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    // Analyze the metadata structure
    const analysis = jobs?.map(job => ({
      id: job.id,
      filename: job.filename,
      status: job.status,
      created_at: job.created_at,
      duration_seconds: job.duration_seconds,
      metadata_keys: job.metadata ? Object.keys(job.metadata) : [],
      has_transcript_text: !!(job.metadata?.transcript_text),
      has_summary: !!(job.metadata?.summary),
      has_segments: !!(job.metadata?.segments),
      transcript_length: job.metadata?.transcript_text ? job.metadata.transcript_text.length : 0,
      summary_length: job.metadata?.summary ? job.metadata.summary.length : 0,
      segments_count: job.metadata?.segments ? job.metadata.segments.length : 0,
      metadata_sample: job.metadata ? {
        transcript_preview: job.metadata.transcript_text ? job.metadata.transcript_text.substring(0, 100) + '...' : null,
        summary_preview: job.metadata.summary ? job.metadata.summary.substring(0, 100) + '...' : null,
      } : null
    })) || [];

    return NextResponse.json({
      user_id: user.id,
      total_jobs: jobs?.length || 0,
      jobs_analysis: analysis,
      raw_jobs: jobs // Include raw data for debugging
    });
  } catch (error) {
    console.error('Debug API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}