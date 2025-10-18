import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { 
  TranscriptionHistoryRecord, 
  GetMeetingsResponse, 
  GetMeetingsQuery,
  MeetingStats,
  Pagination
} from '@/lib/validation/meetings-schemas';

// Re-export types for convenience
export type MeetingRecord = TranscriptionHistoryRecord;
export type MeetingsFilters = Partial<GetMeetingsQuery>;
export type MeetingsResponse = GetMeetingsResponse;

// Query keys factory
export const meetingsKeys = {
  all: ['meetings'] as const,
  lists: () => [...meetingsKeys.all, 'list'] as const,
  list: (filters: MeetingsFilters) => [...meetingsKeys.lists(), filters] as const,
  details: () => [...meetingsKeys.all, 'detail'] as const,
  detail: (id: string) => [...meetingsKeys.details(), id] as const,
  stats: () => [...meetingsKeys.all, 'stats'] as const,
  search: (query: string) => [...meetingsKeys.all, 'search', query] as const,
};

// API functions
async function fetchMeetings(filters: MeetingsFilters): Promise<MeetingsResponse> {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });

  const response = await fetch(`/api/meetings?${params.toString()}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ 
      error: 'Failed to fetch meetings',
      code: 'FETCH_ERROR' 
    }));
    
    const errorObj = new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    (errorObj as any).status = response.status;
    (errorObj as any).code = error.code;
    throw errorObj;
  }
  
  return response.json();
}

async function deleteMeeting(id: string): Promise<void> {
  const response = await fetch(`/api/meetings/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ 
      error: 'Failed to delete meeting',
      code: 'DELETE_ERROR' 
    }));
    
    const errorObj = new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    (errorObj as any).status = response.status;
    (errorObj as any).code = error.code;
    throw errorObj;
  }
}

// Custom hooks
export function useMeetings(filters: MeetingsFilters = {}) {
  return useQuery({
    queryKey: meetingsKeys.list(filters),
    queryFn: () => fetchMeetings(filters),
    staleTime: 15 * 60 * 1000, // 15 minutes for list data
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: true,
    // Enable background refetch for real-time updates
    refetchInterval: (query) => {
      // Refetch more frequently if there are processing items
      const queryData = query.state.data as MeetingsResponse | undefined;
      if (!queryData?.data) return 15 * 60 * 1000; // Default 15 minutes
      const hasProcessing = queryData.data.some((item: any) => item.status === 'processing');
      return hasProcessing ? 2 * 60 * 1000 : 15 * 60 * 1000; // 2min vs 15min
    },
  });
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteMeeting,
    onMutate: async (meetingId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: meetingsKeys.lists() });
      
      // Snapshot previous value for rollback
      const previousMeetings = queryClient.getQueriesData({ queryKey: meetingsKeys.lists() });
      
      // Optimistically remove the meeting from all cached lists
      queryClient.setQueriesData<MeetingsResponse>(
        { queryKey: meetingsKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.filter(meeting => meeting.id !== meetingId),
            pagination: {
              ...old.pagination,
              total: old.pagination.total - 1,
            },
            stats: {
              ...old.stats,
              total_transcriptions: old.stats.total_transcriptions - 1,
              this_month_transcriptions: old.stats.this_month_transcriptions - 1,
            },
          };
        }
      );
      
      return { previousMeetings };
    },
    onError: (error, meetingId, context) => {
      // Rollback optimistic updates
      if (context?.previousMeetings) {
        context.previousMeetings.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: meetingsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: meetingsKeys.stats() });
    },
  });
}

// Hook for prefetching meetings data
export function usePrefetchMeetings() {
  const queryClient = useQueryClient();
  
  return useCallback((filters: MeetingsFilters) => {
    queryClient.prefetchQuery({
      queryKey: meetingsKeys.list(filters),
      queryFn: () => fetchMeetings(filters),
      staleTime: 15 * 60 * 1000,
    });
  }, [queryClient]);
}

// Hook for invalidating meetings cache
export function useInvalidateMeetings() {
  const queryClient = useQueryClient();
  
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: meetingsKeys.all });
  }, [queryClient]);
}