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

    // Simple query to get transcription jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('transcription_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (jobsError) {
      console.error('Error fetching transcription jobs:', jobsError);
      return NextResponse.json(
        { error: 'Failed to fetch transcription jobs', details: jobsError.message },
        { status: 500 }
      );
    }

    // Transform to expected format
    const meetings = (jobs || []).map(job => ({
      id: job.id,
      user_id: job.user_id,
      filename: job.filename,
      status: job.status,
      duration_seconds: job.duration_seconds,
      file_size: job.file_size,
      created_at: job.created_at,
      completed_at: job.completed_at,
      error_message: job.error_message,
      tier: job.tier,
      usage_cost: job.usage_cost,
      transcription_metadata: job.metadata,
      meeting_id: null,
      meeting_title: job.filename,
      meeting_description: null,
      meeting_date: job.created_at,
      duration_minutes: job.duration_seconds ? Math.round(job.duration_seconds / 60) : null,
      attendees: null,
      summary: job.metadata?.summary || null,
      action_items: [],
      key_topics: null,
      audio_file_url: null,
      transcript_file_url: null,
      summary_file_url: null,
      meeting_updated_at: job.created_at,
      record_type: 'transcription',
      display_status: job.status,
      action_items_count: 0,
      search_rank: 0
    }));

    return NextResponse.json({
      data: meetings,
      pagination: {
        page: 1,
        limit: 20,
        total: meetings.length,
        total_pages: 1,
      },
      stats: {
        total_transcriptions: meetings.length,
        total_meetings: 0,
        total_hours: 0,
        this_month_transcriptions: meetings.length,
        this_month_meetings: 0,
        this_month_hours: 0,
        completed_transcriptions: meetings.filter(m => m.status === 'completed').length,
        processing_transcriptions: meetings.filter(m => m.status === 'processing').length,
        failed_transcriptions: meetings.filter(m => m.status === 'failed').length,
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}