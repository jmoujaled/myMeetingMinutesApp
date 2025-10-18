import { useState, useEffect, useCallback } from 'react';
import { clientUsageService, UsageStats, TranscriptionJob } from '@/lib/usage-client';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

export interface UseUsageTrackingOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  enableRealtime?: boolean; // Enable Supabase real-time subscriptions
}

export interface UsageTrackingState {
  usageStats: UsageStats | null;
  recentJobs: TranscriptionJob[];
  monthlyAnalytics: {
    dailyUsage: Array<{ date: string; count: number; duration: number }>;
    statusBreakdown: Record<string, number>;
    averageFileSize: number;
    averageDuration: number;
  } | null;
  loading: boolean;
  error: string | null;
}

export function useUsageTracking(options: UseUsageTrackingOptions = {}) {
  const { user } = useAuth();
  const { autoRefresh = false, refreshInterval = 30000, enableRealtime = true } = options;
  const supabase = createClient();
  

  
  const [state, setState] = useState<UsageTrackingState>({
    usageStats: null,
    recentJobs: [],
    monthlyAnalytics: null,
    loading: true,
    error: null
  });

  const fetchUsageData = useCallback(async () => {
    if (!user?.id) {
      setState(prev => ({ ...prev, loading: false, error: null }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const [usageStats, recentJobs, monthlyAnalytics] = await Promise.allSettled([
        clientUsageService.getCurrentUsage(user.id),
        clientUsageService.getRecentTranscriptions(user.id, 5),
        clientUsageService.getMonthlyAnalytics(user.id)
      ]);

      setState({
        usageStats: usageStats.status === 'fulfilled' ? usageStats.value : null,
        recentJobs: recentJobs.status === 'fulfilled' ? recentJobs.value : [],
        monthlyAnalytics: monthlyAnalytics.status === 'fulfilled' ? monthlyAnalytics.value : null,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error fetching usage data:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch usage data'
      }));
    }
  }, [user?.id]);

  const refreshUsage = useCallback(() => {
    fetchUsageData();
  }, [fetchUsageData]);

  const getTranscriptionHistory = useCallback(async (options?: {
    limit?: number;
    offset?: number;
    status?: 'processing' | 'completed' | 'failed' | 'cancelled';
  }) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    return clientUsageService.getTranscriptionHistory(user.id, options);
  }, [user?.id]);

  // Initial load
  useEffect(() => {
    fetchUsageData();
  }, [fetchUsageData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !user?.id) return;

    const interval = setInterval(fetchUsageData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchUsageData, user?.id]);

  // Real-time subscriptions - with error handling to prevent auth loops
  useEffect(() => {
    if (!enableRealtime || !user?.id) return;

    console.log('Setting up real-time subscriptions for user:', user.id);

    let jobsSubscription: any = null;
    let profileSubscription: any = null;

    try {
      // Subscribe to transcription jobs changes
      jobsSubscription = supabase
        .channel(`transcription_jobs_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transcription_jobs',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Transcription job changed:', payload);
            // Debounce refresh to prevent excessive calls
            setTimeout(() => fetchUsageData(), 1000);
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIPTION_ERROR') {
            console.error('Real-time subscription error for jobs');
          }
        });

      // Subscribe to user profile changes (tier changes, usage resets)
      profileSubscription = supabase
        .channel(`user_profile_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_profiles',
            filter: `id=eq.${user.id}`
          },
          (payload) => {
            console.log('User profile changed:', payload);
            // Debounce refresh to prevent excessive calls
            setTimeout(() => fetchUsageData(), 1000);
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIPTION_ERROR') {
            console.error('Real-time subscription error for profile');
          }
        });
    } catch (error) {
      console.error('Error setting up real-time subscriptions:', error);
    }

    return () => {
      console.log('Cleaning up real-time subscriptions');
      try {
        // Use a timeout to prevent cleanup from blocking logout
        setTimeout(() => {
          try {
            if (jobsSubscription) {
              jobsSubscription.unsubscribe();
            }
            if (profileSubscription) {
              profileSubscription.unsubscribe();
            }
          } catch (error) {
            console.error('Error cleaning up subscriptions:', error);
          }
        }, 0);
      } catch (error) {
        console.error('Error setting up subscription cleanup:', error);
      }
    };
  }, [enableRealtime, user?.id]);

  return {
    ...state,
    refreshUsage,
    getTranscriptionHistory,
    isLimitExceeded: state.usageStats?.isLimitExceeded || false,
    usagePercentage: state.usageStats 
      ? (state.usageStats.currentMonth.transcriptionsUsed / Math.max(state.usageStats.currentMonth.transcriptionsLimit, 1)) * 100
      : 0
  };
}