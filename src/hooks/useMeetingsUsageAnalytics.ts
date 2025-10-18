import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { clientUsageService, UsageStats } from '@/lib/usage-client';
import { usageService } from '@/lib/usage-service';

export interface MeetingsUsageAnalytics {
  usageStats: UsageStats | null;
  monthlyStats: {
    totalTranscriptions: number;
    totalMeetings: number;
    totalHours: number;
    thisMonthTranscriptions: number;
    thisMonthMeetings: number;
    thisMonthHours: number;
    usagePercentage: number;
  };
  warnings: {
    isNearLimit: boolean;
    isOverLimit: boolean;
    shouldShowUpgrade: boolean;
    warningMessage?: string;
  };
  restrictions: {
    canCreateTranscription: boolean;
    canExportFiles: boolean;
    canAccessPremiumFeatures: boolean;
    restrictionReason?: string;
  };
  loading: boolean;
  error: string | null;
}

export interface UseMeetingsUsageAnalyticsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useMeetingsUsageAnalytics(options: UseMeetingsUsageAnalyticsOptions = {}) {
  const { user, userProfile } = useAuth();
  const { autoRefresh = true, refreshInterval = 60000 } = options; // Default 1 minute refresh

  const [analytics, setAnalytics] = useState<MeetingsUsageAnalytics>({
    usageStats: null,
    monthlyStats: {
      totalTranscriptions: 0,
      totalMeetings: 0,
      totalHours: 0,
      thisMonthTranscriptions: 0,
      thisMonthMeetings: 0,
      thisMonthHours: 0,
      usagePercentage: 0,
    },
    warnings: {
      isNearLimit: false,
      isOverLimit: false,
      shouldShowUpgrade: false,
    },
    restrictions: {
      canCreateTranscription: true,
      canExportFiles: true,
      canAccessPremiumFeatures: true,
    },
    loading: true,
    error: null,
  });

  const fetchAnalytics = useCallback(async () => {
    if (!user?.id || !userProfile) {
      setAnalytics(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setAnalytics(prev => ({ ...prev, loading: true, error: null }));

      // Use client-side usage service
      const usageStats = await clientUsageService.getCurrentUsage(user.id);
      
      const monthlyStats = {
        totalTranscriptions: 0,
        totalMeetings: 0,
        totalHours: 0,
        thisMonthTranscriptions: usageStats?.currentMonth.transcriptionsUsed || 0,
        thisMonthMeetings: 0,
        thisMonthHours: Math.round((usageStats?.currentMonth.totalDurationMinutes || 0) / 60 * 10) / 10,
        usagePercentage: usageStats ? 
          (usageStats.currentMonth.transcriptionsLimit === -1 ? 0 : 
           (usageStats.currentMonth.transcriptionsUsed / Math.max(usageStats.currentMonth.transcriptionsLimit, 1)) * 100) : 0,
      };

      const isNearLimit = monthlyStats.usagePercentage >= 80 && monthlyStats.usagePercentage < 100;
      const isOverLimit = monthlyStats.usagePercentage >= 100;
      const shouldShowUpgrade = (isNearLimit || isOverLimit) && userProfile.tier === 'free';

      let warningMessage: string | undefined;
      if (isOverLimit) {
        warningMessage = `You've reached your monthly limit of ${usageStats?.currentMonth.transcriptionsLimit} transcriptions.`;
      } else if (isNearLimit) {
        warningMessage = `You're using ${Math.round(monthlyStats.usagePercentage)}% of your monthly allowance.`;
      }

      setAnalytics({
        usageStats,
        monthlyStats,
        warnings: {
          isNearLimit,
          isOverLimit,
          shouldShowUpgrade,
          warningMessage,
        },
        restrictions: {
          canCreateTranscription: !isOverLimit,
          canExportFiles: true,
          canAccessPremiumFeatures: userProfile.tier !== 'free' || !isOverLimit,
          restrictionReason: isOverLimit ? 'Monthly transcription limit exceeded. Upgrade to continue.' : undefined,
        },
        loading: false,
        error: null,
      });

    } catch (error) {
      console.error('Error fetching meetings usage analytics:', error);
      setAnalytics(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch usage analytics',
      }));
    }
  }, [user?.id, userProfile]);

  // Check if user can perform a specific action
  const checkUsageLimit = useCallback(async (action: 'transcribe' | 'export' | 'premium_feature') => {
    if (!user?.id || !userProfile) {
      return { canProceed: false, reason: 'User not authenticated' };
    }

    try {
      const result = await usageService.checkLimits(user.id, userProfile.tier);
      
      switch (action) {
        case 'transcribe':
          return {
            canProceed: result.canProceed,
            reason: result.reason,
            usageStats: result.usageStats,
          };
        case 'export':
          // Export is always allowed for existing content
          return { canProceed: true };
        case 'premium_feature':
          return {
            canProceed: result.canProceed && userProfile.tier !== 'free',
            reason: userProfile.tier === 'free' ? 'Premium feature requires upgrade' : result.reason,
            usageStats: result.usageStats,
          };
        default:
          return { canProceed: true };
      }
    } catch (error) {
      console.error('Error checking usage limit:', error);
      return { canProceed: false, reason: 'Unable to verify usage limits' };
    }
  }, [user?.id, userProfile]);

  // Refresh analytics data
  const refreshAnalytics = useCallback(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Initial load
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !user?.id) return;

    const interval = setInterval(fetchAnalytics, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchAnalytics, user?.id]);

  return {
    ...analytics,
    checkUsageLimit,
    refreshAnalytics,
  };
}