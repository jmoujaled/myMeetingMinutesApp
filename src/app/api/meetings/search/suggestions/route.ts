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

// Schema for search suggestions query parameters
const SearchSuggestionsQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required').max(100, 'Query too long'),
  limit: z.coerce.number().int().min(1).max(20).default(5),
});

// Response schema
const SearchSuggestionSchema = z.object({
  suggestion: z.string(),
  match_count: z.number(),
  record_type: z.enum(['meeting', 'topic', 'filename']),
});

const SearchSuggestionsResponseSchema = z.object({
  suggestions: z.array(SearchSuggestionSchema),
  query: z.string(),
});

/**
 * GET /api/meetings/search/suggestions
 * Get search suggestions based on user's content
 */
async function handleGetSearchSuggestions(request: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const { data: queryParams, error: validationError } = validateSearchParams(
      SearchSuggestionsQuerySchema, 
      searchParams
    );
    
    if (validationError || !queryParams) {
      return validationError || createErrorResponse('Invalid query parameters', 'VALIDATION_ERROR', 400);
    }

    const supabase = await createClient();
    const userId = request.user.id;

    // Get search suggestions using the database function
    const { data: suggestionsData, error: suggestionsError } = await supabase
      .rpc('get_search_suggestions', {
        target_user_id: userId,
        search_prefix: queryParams.q,
        limit_count: queryParams.limit,
      });

    if (suggestionsError) {
      console.error('Error fetching search suggestions:', suggestionsError);
      return createErrorResponse(
        'Failed to fetch search suggestions',
        MEETINGS_ERROR_CODES.ACCESS_DENIED,
        500
      );
    }

    const response = {
      suggestions: suggestionsData || [],
      query: queryParams.q,
    };

    return createSuccessResponse(response);
  } catch (error) {
    console.error('Unexpected error in GET /api/meetings/search/suggestions:', error);
    return createErrorResponse(
      'Internal server error',
      'INTERNAL_ERROR',
      500
    );
  }
}

// Export the authenticated handler
export const GET = withAuth(handleGetSearchSuggestions, {
  requireAuth: true,
});

// Export types for use in frontend
export type SearchSuggestion = z.infer<typeof SearchSuggestionSchema>;
export type SearchSuggestionsResponse = z.infer<typeof SearchSuggestionsResponseSchema>;