import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { meetingsKeys } from './useMeetings';
import { useDebounce } from './useDebounce';

// Types
export interface SearchResult {
  id: string;
  type: 'meeting' | 'transcription';
  title: string;
  snippet: string;
  date: string;
  relevanceScore: number;
}

export interface SearchResponse {
  results: SearchResult[];
  totalResults: number;
  searchTime: number;
  suggestions?: string[];
}

// API functions
async function searchMeetings(query: string): Promise<SearchResponse> {
  if (!query.trim()) {
    return {
      results: [],
      totalResults: 0,
      searchTime: 0,
    };
  }

  const response = await fetch(`/api/meetings/search/content?q=${encodeURIComponent(query)}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Search failed' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

async function getSearchSuggestions(query: string): Promise<string[]> {
  if (!query.trim() || query.length < 2) {
    return [];
  }

  const response = await fetch(`/api/meetings/search/suggestions?q=${encodeURIComponent(query)}`);
  
  if (!response.ok) {
    return [];
  }
  
  const data = await response.json();
  return data.suggestions || [];
}

// Custom hooks
export function useMeetingSearch(query: string, options: { enabled?: boolean } = {}) {
  const debouncedQuery = useDebounce(query, 300);
  const { enabled = true } = options;
  
  return useQuery({
    queryKey: meetingsKeys.search(debouncedQuery),
    queryFn: () => searchMeetings(debouncedQuery),
    enabled: enabled && debouncedQuery.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes for search results
    gcTime: 2 * 60 * 1000, // 2 minutes cache
    retry: 2,
    retryDelay: 500,
  });
}

export function useSearchSuggestions(query: string, options: { enabled?: boolean } = {}) {
  const debouncedQuery = useDebounce(query, 200);
  const { enabled = true } = options;
  
  return useQuery({
    queryKey: [...meetingsKeys.all, 'suggestions', debouncedQuery] as const,
    queryFn: () => getSearchSuggestions(debouncedQuery),
    enabled: enabled && debouncedQuery.length >= 2,
    staleTime: 10 * 60 * 1000, // 10 minutes for suggestions
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    retry: 1,
  });
}

// Hook for search history and recent searches
export function useSearchHistory() {
  const queryClient = useQueryClient();
  
  const getSearchHistory = useCallback((): string[] => {
    try {
      const history = localStorage.getItem('meeting-search-history');
      return history ? JSON.parse(history) : [];
    } catch {
      return [];
    }
  }, []);
  
  const addToSearchHistory = useCallback((query: string) => {
    if (!query.trim()) return;
    
    try {
      const history = getSearchHistory();
      const updatedHistory = [
        query,
        ...history.filter(item => item !== query)
      ].slice(0, 10); // Keep only last 10 searches
      
      localStorage.setItem('meeting-search-history', JSON.stringify(updatedHistory));
    } catch (error) {
      console.warn('Failed to save search history:', error);
    }
  }, [getSearchHistory]);
  
  const clearSearchHistory = useCallback(() => {
    try {
      localStorage.removeItem('meeting-search-history');
    } catch (error) {
      console.warn('Failed to clear search history:', error);
    }
  }, []);
  
  return {
    searchHistory: getSearchHistory(),
    addToSearchHistory,
    clearSearchHistory,
  };
}

// Hook for intelligent search prefetching
export function useSearchPrefetch() {
  const queryClient = useQueryClient();
  
  return useCallback((queries: string[]) => {
    queries.forEach(query => {
      if (query.length >= 2) {
        queryClient.prefetchQuery({
          queryKey: meetingsKeys.search(query),
          queryFn: () => searchMeetings(query),
          staleTime: 5 * 60 * 1000,
        });
      }
    });
  }, [queryClient]);
}

// Hook for search analytics
export function useSearchAnalytics() {
  const trackSearch = useCallback((query: string, resultCount: number, searchTime: number) => {
    // Track search analytics (could integrate with analytics service)
    if (process.env.NODE_ENV === 'development') {
      console.log('Search Analytics:', {
        query,
        resultCount,
        searchTime,
        timestamp: new Date().toISOString(),
      });
    }
  }, []);
  
  const trackSearchClick = useCallback((query: string, resultId: string, position: number) => {
    // Track search result clicks
    if (process.env.NODE_ENV === 'development') {
      console.log('Search Click Analytics:', {
        query,
        resultId,
        position,
        timestamp: new Date().toISOString(),
      });
    }
  }, []);
  
  return {
    trackSearch,
    trackSearchClick,
  };
}