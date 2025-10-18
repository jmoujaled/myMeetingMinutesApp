import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { 
  validateSearchParams, 
  createErrorResponse,
  createSuccessResponse 
} from '@/lib/validation/middleware';
import { MEETINGS_ERROR_CODES } from '@/lib/supabase/meetings-types';

// Schema for content search query parameters
const ContentSearchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required').max(200, 'Query too long'),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

// Response schema
const ContentSearchResultSchema = z.object({
  id: z.string(),
  record_type: z.enum(['meeting', 'transcription']),
  title: z.string(),
  filename: z.string(),
  snippet: z.string(),
  rank: z.number(),
  created_at: z.string(),
});

const ContentSearchResponseSchema = z.object({
  results: z.array(ContentSearchResultSchema),
  query: z.string(),
  total_results: z.number(),
});

/**
 * GET /api/meetings/search/content
 * Search through transcription and meeting content with snippets
 */
async function handleContentSearch(request: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const { data: queryParams, error: validationError } = validateSearchParams(
      ContentSearchQuerySchema, 
      searchParams
    );
    
    if (validationError || !queryParams) {
      return validationError || createErrorResponse('Invalid query parameters', 'VALIDATION_ERROR', 400);
    }

    const supabase = await createClient();
    const userId = request.user.id;

    // Search content using the database function
    const { data: searchResults, error: searchError } = await supabase
      .rpc('search_transcription_content', {
        target_user_id: userId,
        search_query: queryParams.q,
        limit_count: queryParams.limit,
      });

    if (searchError) {
      console.error('Error searching transcription content:', searchError);
      return createErrorResponse(
        'Failed to search content',
        MEETINGS_ERROR_CODES.ACCESS_DENIED,
        500
      );
    }

    const response = {
      results: searchResults || [],
      query: queryParams.q,
      total_results: searchResults?.length || 0,
    };

    return createSuccessResponse(response);
  } catch (error) {
    console.error('Unexpected error in GET /api/meetings/search/content:', error);
    return createErrorResponse(
      'Internal server error',
      'INTERNAL_ERROR',
      500
    );
  }
}

// Export the authenticated handler
export const GET = withAuth(handleContentSearch, {
  requireAuth: true,
});

// Export types for use in frontend
export type ContentSearchResult = z.infer<typeof ContentSearchResultSchema>;
export type ContentSearchResponse = z.infer<typeof ContentSearchResponseSchema>;