import { useCallback, useEffect } from 'react';
import { useMeetings, useDeleteMeeting, MeetingsFilters } from './useMeetings';
import { useMeetingDetail, useCreateMeeting, useUpdateMeeting } from './useMeetingDetail';
import { useMeetingSearch, useSearchSuggestions, useSearchHistory } from './useMeetingSearch';
import { useMeetingExport, useBulkExport } from './useMeetingExport';
import { useMeetingCache, useUserBehaviorTracking } from './useMeetingCache';

// Combined hook for all meetings data operations
export function useMeetingsData(filters: MeetingsFilters = {}) {
  const meetingsQuery = useMeetings(filters);
  const deleteMutation = useDeleteMeeting();
  const createMutation = useCreateMeeting();
  const updateMutation = useUpdateMeeting();
  
  const cache = useMeetingCache();
  const behaviorTracking = useUserBehaviorTracking();
  const exportHook = useMeetingExport();
  const bulkExportHook = useBulkExport();
  
  // Track filter usage for intelligent caching
  useEffect(() => {
    if (Object.keys(filters).length > 0) {
      behaviorTracking.trackFilters(filters);
    }
  }, [filters, behaviorTracking]);
  
  // Prefetch next page when user is near the end of current page
  useEffect(() => {
    if (meetingsQuery.data?.pagination) {
      const { page, total_pages } = meetingsQuery.data.pagination;
      if (page < total_pages) {
        cache.prefetchNextPage(filters);
      }
    }
  }, [meetingsQuery.data?.pagination, filters, cache]);
  
  // Warm cache on initial load
  useEffect(() => {
    cache.warmCache(filters);
  }, []); // Only run once on mount
  
  const handleMeetingHover = useCallback((meetingId: string) => {
    cache.prefetchMeetingOnHover(meetingId);
  }, [cache]);
  
  const handleMeetingHoverEnd = useCallback((meetingId: string) => {
    cache.cancelPrefetch(meetingId);
  }, [cache]);
  
  const handleMeetingView = useCallback((meetingId: string) => {
    behaviorTracking.trackMeetingView(meetingId);
  }, [behaviorTracking]);
  
  return {
    // Data queries
    meetings: meetingsQuery.data,
    isLoading: meetingsQuery.isLoading,
    isError: meetingsQuery.isError,
    error: meetingsQuery.error,
    isRefetching: meetingsQuery.isRefetching,
    
    // Mutations
    deleteMeeting: deleteMutation.mutate,
    isDeletingMeeting: deleteMutation.isPending,
    deleteError: deleteMutation.error,
    
    createMeeting: createMutation.mutate,
    isCreatingMeeting: createMutation.isPending,
    createError: createMutation.error,
    
    updateMeeting: updateMutation.mutate,
    isUpdatingMeeting: updateMutation.isPending,
    updateError: updateMutation.error,
    
    // Export functionality
    exportMeeting: exportHook.exportMeeting,
    isExporting: exportHook.isExporting,
    getExportProgress: exportHook.getExportProgress,
    exportProgress: exportHook.exportProgress,
    
    bulkExport: bulkExportHook.exportMultipleMeetings,
    isBulkExporting: bulkExportHook.isBulkExporting,
    bulkProgress: bulkExportHook.bulkProgress,
    
    // Cache and performance
    onMeetingHover: handleMeetingHover,
    onMeetingHoverEnd: handleMeetingHoverEnd,
    onMeetingView: handleMeetingView,
    
    // Utility functions
    refetch: meetingsQuery.refetch,
  };
}

// Hook for meeting detail with caching
export function useMeetingDetailData(meetingId: string | null) {
  const detailQuery = useMeetingDetail(meetingId);
  const updateMutation = useUpdateMeeting();
  const behaviorTracking = useUserBehaviorTracking();
  
  // Track meeting view
  useEffect(() => {
    if (meetingId && detailQuery.data) {
      behaviorTracking.trackMeetingView(meetingId);
    }
  }, [meetingId, detailQuery.data, behaviorTracking]);
  
  return {
    meeting: detailQuery.data,
    isLoading: detailQuery.isLoading,
    isError: detailQuery.isError,
    error: detailQuery.error,
    
    updateMeeting: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,
    
    refetch: detailQuery.refetch,
  };
}

// Hook for search with caching and behavior tracking
export function useMeetingSearchData(query: string, options: { enabled?: boolean } = {}) {
  const searchQuery = useMeetingSearch(query, options);
  const suggestionsQuery = useSearchSuggestions(query, options);
  const searchHistory = useSearchHistory();
  const behaviorTracking = useUserBehaviorTracking();
  
  // Track search queries
  const handleSearch = useCallback((searchQuery: string) => {
    if (searchQuery.trim()) {
      searchHistory.addToSearchHistory(searchQuery);
      behaviorTracking.trackSearch(searchQuery);
    }
  }, [searchHistory, behaviorTracking]);
  
  return {
    searchResults: searchQuery.data,
    isSearching: searchQuery.isLoading,
    searchError: searchQuery.error,
    
    suggestions: suggestionsQuery.data || [],
    isFetchingSuggestions: suggestionsQuery.isLoading,
    
    searchHistory: searchHistory.searchHistory,
    addToSearchHistory: handleSearch,
    clearSearchHistory: searchHistory.clearSearchHistory,
    
    refetchSearch: searchQuery.refetch,
  };
}

// Hook for error handling and retry logic
export function useErrorHandling() {
  const handleRetry = useCallback((retryFn: () => void, maxRetries = 3) => {
    let attempts = 0;
    
    const retry = () => {
      attempts++;
      try {
        retryFn();
      } catch (error) {
        if (attempts < maxRetries) {
          setTimeout(retry, Math.min(1000 * Math.pow(2, attempts), 10000));
        } else {
          throw error;
        }
      }
    };
    
    retry();
  }, []);
  
  const isRetryableError = useCallback((error: any): boolean => {
    // Network errors are retryable
    if (error?.message?.includes('fetch')) return true;
    
    // 5xx server errors are retryable
    if (error?.status >= 500) return true;
    
    // Timeout errors are retryable
    if (error?.message?.includes('timeout')) return true;
    
    // 4xx client errors are not retryable
    if (error?.status >= 400 && error?.status < 500) return false;
    
    return true;
  }, []);
  
  const getErrorMessage = useCallback((error: any): string => {
    if (error?.message) return error.message;
    if (error?.error) return error.error;
    if (typeof error === 'string') return error;
    return 'An unexpected error occurred';
  }, []);
  
  return {
    handleRetry,
    isRetryableError,
    getErrorMessage,
  };
}