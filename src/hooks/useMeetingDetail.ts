import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { meetingsKeys } from './useMeetings';
import { 
  MeetingDetail as MeetingDetailType,
  GetMeetingDetailResponse,
  CreateMeetingRequest as CreateMeetingRequestType,
  UpdateMeetingRequest as UpdateMeetingRequestType,
} from '@/lib/validation/meetings-schemas';

// Re-export types for convenience
export type MeetingDetail = MeetingDetailType;
export type CreateMeetingRequest = CreateMeetingRequestType;
export type UpdateMeetingRequest = UpdateMeetingRequestType;

// API functions
async function fetchMeetingDetail(id: string): Promise<GetMeetingDetailResponse> {
  const response = await fetch(`/api/meetings/${id}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Meeting not found');
    }
    const error = await response.json().catch(() => ({ error: 'Failed to fetch meeting details' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

async function createMeeting(request: CreateMeetingRequest): Promise<GetMeetingDetailResponse> {
  const response = await fetch('/api/meetings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create meeting' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

async function updateMeeting(id: string, request: UpdateMeetingRequest): Promise<GetMeetingDetailResponse> {
  const response = await fetch(`/api/meetings/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update meeting' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

// Custom hooks
export function useMeetingDetail(id: string | null) {
  return useQuery({
    queryKey: meetingsKeys.detail(id!),
    queryFn: () => fetchMeetingDetail(id!),
    enabled: !!id,
    staleTime: 15 * 60 * 1000, // 15 minutes for detail data
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    retry: (failureCount, error: any) => {
      // Don't retry on 404 errors
      if (error?.message?.includes('not found')) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createMeeting,
    onSuccess: (response) => {
      // Add to detail cache
      queryClient.setQueryData(meetingsKeys.detail(response.meeting.id), response);
      
      // Invalidate lists to show the new meeting
      queryClient.invalidateQueries({ queryKey: meetingsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: meetingsKeys.stats() });
    },
    onError: (error) => {
      console.error('Failed to create meeting:', error);
    },
  });
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, ...request }: UpdateMeetingRequest & { id: string }) => 
      updateMeeting(id, request),
    onMutate: async ({ id, ...updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: meetingsKeys.detail(id) });
      
      // Snapshot previous value
      const previousMeeting = queryClient.getQueryData(meetingsKeys.detail(id));
      
      // Optimistically update the meeting detail
      queryClient.setQueryData<GetMeetingDetailResponse>(meetingsKeys.detail(id), (old) => {
        if (!old) return old;
        return { 
          ...old, 
          meeting: { ...old.meeting, ...updates }
        };
      });
      
      return { previousMeeting, id };
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousMeeting && context?.id) {
        queryClient.setQueryData(meetingsKeys.detail(context.id), context.previousMeeting);
      }
    },
    onSuccess: (response) => {
      // Update the detail cache with server response
      queryClient.setQueryData(meetingsKeys.detail(response.meeting.id), response);
      
      // Invalidate lists to reflect changes
      queryClient.invalidateQueries({ queryKey: meetingsKeys.lists() });
    },
  });
}

// Hook for prefetching meeting details
export function usePrefetchMeetingDetail() {
  const queryClient = useQueryClient();
  
  return useCallback((id: string) => {
    queryClient.prefetchQuery({
      queryKey: meetingsKeys.detail(id),
      queryFn: () => fetchMeetingDetail(id),
      staleTime: 15 * 60 * 1000,
    });
  }, [queryClient]);
}