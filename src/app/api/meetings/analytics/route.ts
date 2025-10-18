import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { validateSearchParams } from '@/lib/validation/middleware';

// Schema for analytics query parameters
const AnalyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

// Response schema
const SearchAnalyticsSchema = z.object({
  total_searchable_items: z.number(),
  meetings_with_transcripts: z.number(),
  avg_transcript_length: z.number(),
  most_common_topics: z.array(z.string()),
  search_coverage_score: z.number(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const { data: queryParams, error: validationError } = validateSearchParams(
      AnalyticsQuerySchema, 
      searchParams
    );
    
    if (validationError || !queryParams) {
      return validationError || NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get analytics using the database function
    const { data: analyticsData, error: analyticsError } = await supabase
      .rpc('get_search_analytics', {
        target_user_id: user.id,
        days_back: queryParams.days,
      });

    if (analyticsError) {
      console.error('Error fetching search analytics:', analyticsError);
      // Return default analytics instead of failing
      const defaultAnalytics = {
        total_searchable_items: 0,
        meetings_with_transcripts: 0,
        avg_transcript_length: 0,
        most_common_topics: [],
        search_coverage_score: 0,
      };
      return NextResponse.json(defaultAnalytics);
    }

    // Return the first (and only) result from the analytics function
    const analytics = analyticsData?.[0] || {
      total_searchable_items: 0,
      meetings_with_transcripts: 0,
      avg_transcript_length: 0,
      most_common_topics: [],
      search_coverage_score: 0,
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Unexpected error in GET /api/meetings/analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export types for use in frontend
export type SearchAnalytics = z.infer<typeof SearchAnalyticsSchema>;