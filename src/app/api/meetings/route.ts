import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateSearchParams } from '@/lib/validation/middleware';
import { GetMeetingsQuerySchema } from '@/lib/validation/meetings-schemas';

export async function GET(request: NextRequest) {
  try {
    // Validate query parameters
    const url = new URL(request.url);
    const { data: queryParams, error: validationError } = validateSearchParams(
      GetMeetingsQuerySchema, 
      url.searchParams
    );
    
    if (validationError || !queryParams) {
      return validationError || NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      );
    }

    const { 
      record_type = 'all',
      page = 1,
      limit = 20,
      status,
      search,
      date_from,
      date_to
    } = queryParams;

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build the database function parameters
    const functionParams = {
      target_user_id: user.id,
      search_query: search || null,
      date_from: date_from || null,
      date_to: date_to || null,
      status_filter: status || null,
      record_type_filter: record_type === 'all' ? null : record_type,
      limit_count: limit,
      offset_count: offset,
    };

    // Try to get transcription history using the database function
    let meetings = [];
    let total = 0;
    let stats = {
      total_transcriptions: 0,
      total_meetings: 0,
      total_hours: 0,
      this_month_transcriptions: 0,
      this_month_meetings: 0,
      this_month_hours: 0,
      completed_transcriptions: 0,
      processing_transcriptions: 0,
      failed_transcriptions: 0,
    };

    try {
      const { data: meetingsData, error: queryError } = await supabase
        .rpc('get_user_transcription_history', functionParams);

      if (queryError) {
        console.error('Database function error, falling back to direct queries:', queryError);
        throw new Error('Function not available');
      }

      meetings = meetingsData || [];

      // Get total count for pagination using the dedicated count function
      const { data: totalCountData, error: countError } = await supabase
        .rpc('get_user_transcription_history_count', {
          target_user_id: user.id,
          search_query: search || null,
          date_from: date_from || null,
          date_to: date_to || null,
          status_filter: status || null,
          record_type_filter: record_type === 'all' ? null : record_type,
        });

      if (countError) {
        console.error('Error getting total count:', countError);
        total = meetings.length;
      } else {
        total = totalCountData || meetings.length;
      }

      // Get user meeting stats using the database function
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_user_meeting_stats', { target_user_id: user.id });

      if (statsError) {
        console.error('Error fetching meeting stats:', statsError);
      } else {
        stats = statsData?.[0] || stats;
      }
    } catch (functionError) {
      console.log('Database functions not available, using direct table queries');
      
      // Fallback to direct table queries
      let query = supabase
        .from('transcription_jobs')
        .select(`
          id,
          user_id,
          filename,
          status,
          duration_seconds,
          file_size,
          created_at,
          completed_at,
          error_message,
          tier,
          usage_cost,
          metadata
        `)
        .eq('user_id', user.id);

      // Apply filters
      if (status) {
        query = query.eq('status', status);
      }
      if (search) {
        query = query.ilike('filename', `%${search}%`);
      }
      if (date_from) {
        query = query.gte('created_at', date_from);
      }
      if (date_to) {
        query = query.lte('created_at', date_to);
      }

      // Apply pagination
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: jobsData, error: jobsError } = await query;

      if (jobsError) {
        console.error('Error fetching transcription jobs:', jobsError);
        return NextResponse.json(
          { error: 'Failed to fetch meetings and transcriptions' },
          { status: 500 }
        );
      }

      // Transform jobs data to match expected format
      meetings = (jobsData || []).map(job => ({
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
        meeting_title: null,
        meeting_description: null,
        meeting_date: null,
        duration_minutes: job.duration_seconds ? Math.round(job.duration_seconds / 60) : null,
        attendees: null,
        summary: null,
        action_items: [],
        key_topics: null,
        audio_file_url: null,
        transcript_file_url: null,
        summary_file_url: null,
        meeting_updated_at: null,
        record_type: 'transcription',
        display_status: job.status,
        action_items_count: 0,
        search_rank: 0
      }));

      // Get total count
      const { count } = await supabase
        .from('transcription_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      total = count || 0;
    }

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: meetings || [],
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
      },
      stats,
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}