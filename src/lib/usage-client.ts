import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';

export type TranscriptionJob = Database['public']['Tables']['transcription_jobs']['Row'];

export interface UsageStats {
  currentMonth: {
    transcriptionsUsed: number;
    transcriptionsLimit: number;
    totalDurationMinutes: number;
    totalFileSizeMB: number;
  };
  tier: string;
  resetDate: string;
  isLimitExceeded: boolean;
}

/**
 * Client-side usage service for React components
 */
export class ClientUsageService {
  private supabase = createClient() as any;

  /**
   * Get recent transcription jobs for a user
   */
  async getRecentTranscriptions(userId: string, limit: number = 5): Promise<TranscriptionJob[]> {
    try {
      const { data, error } = await this.supabase
        .from('transcription_jobs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent transcriptions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching recent transcriptions:', error);
      return [];
    }
  }

  /**
   * Get paginated transcription history for a user
   */
  async getTranscriptionHistory(
    userId: string, 
    options?: {
      limit?: number;
      offset?: number;
      status?: 'processing' | 'completed' | 'failed' | 'cancelled';
    }
  ): Promise<{
    jobs: TranscriptionJob[];
    totalCount: number;
  }> {
    let query = this.supabase
      .from('transcription_jobs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, (options.offset + (options.limit || 20)) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching transcription history:', error);
      return { jobs: [], totalCount: 0 };
    }

    return {
      jobs: data || [],
      totalCount: count || 0
    };
  }

  /**
   * Get usage analytics for the current month
   */
  async getMonthlyAnalytics(userId: string): Promise<{
    dailyUsage: Array<{ date: string; count: number; duration: number }>;
    statusBreakdown: Record<string, number>;
    averageFileSize: number;
    averageDuration: number;
  } | null> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: jobs, error } = await this.supabase
      .from('transcription_jobs')
      .select('created_at, status, file_size, duration_seconds')
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString());

    if (error) {
      console.error('Error fetching monthly analytics:', error);
      return null;
    }

    if (!jobs || jobs.length === 0) {
      return {
        dailyUsage: [],
        statusBreakdown: {},
        averageFileSize: 0,
        averageDuration: 0
      };
    }

    // Group by day
    const dailyUsageMap = new Map<string, { count: number; duration: number }>();
    const statusBreakdown: Record<string, number> = {};
    let totalFileSize = 0;
    let totalDuration = 0;
    let filesWithSize = 0;
    let filesWithDuration = 0;

    jobs.forEach((job: any) => {
      const date = new Date(job.created_at).toISOString().split('T')[0];
      const current = dailyUsageMap.get(date) || { count: 0, duration: 0 };
      
      dailyUsageMap.set(date, {
        count: current.count + 1,
        duration: current.duration + (job.duration_seconds || 0)
      });

      statusBreakdown[job.status] = (statusBreakdown[job.status] || 0) + 1;

      if (job.file_size) {
        totalFileSize += job.file_size;
        filesWithSize++;
      }

      if (job.duration_seconds) {
        totalDuration += job.duration_seconds;
        filesWithDuration++;
      }
    });

    const dailyUsage = Array.from(dailyUsageMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      dailyUsage,
      statusBreakdown,
      averageFileSize: filesWithSize > 0 ? totalFileSize / filesWithSize : 0,
      averageDuration: filesWithDuration > 0 ? totalDuration / filesWithDuration : 0
    };
  }

  /**
   * Get current usage statistics for a user
   */
  async getCurrentUsage(userId: string): Promise<UsageStats | null> {
    try {
      // Get user profile
      const { data: profile, error: profileError } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        console.error('Error fetching user profile:', profileError);
        // Return default stats instead of null to prevent loading loops
        return {
          currentMonth: {
            transcriptionsUsed: 0,
            transcriptionsLimit: 10, // Updated to 10 transcriptions per month
            totalDurationMinutes: 0,
            totalFileSizeMB: 0
          },
          tier: 'free',
          resetDate: new Date().toISOString(),
          isLimitExceeded: false
        };
      }

      // Get tier limits
      const { data: tierLimits, error: tierError } = await this.supabase
        .from('tier_limits')
        .select('*')
        .eq('tier', profile.tier)
        .single();

      if (tierError || !tierLimits) {
        console.error('Error fetching tier limits:', tierError);
        // Return default stats with profile info
        return {
          currentMonth: {
            transcriptionsUsed: 0,
            transcriptionsLimit: profile.tier === 'free' ? 10 : -1, // Updated to 10 for free tier
            totalDurationMinutes: 0,
            totalFileSizeMB: 0
          },
          tier: profile.tier,
          resetDate: profile.usage_reset_date,
          isLimitExceeded: false
        };
      }

      // Calculate usage for current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: jobs, error: jobsError } = await this.supabase
        .from('transcription_jobs')
        .select('usage_cost, file_size, duration_seconds, status')
        .eq('user_id', userId)
        .gte('created_at', startOfMonth.toISOString());

      if (jobsError) {
        console.error('Error fetching transcription jobs:', jobsError);
        return {
          currentMonth: {
            transcriptionsUsed: 0,
            transcriptionsLimit: tierLimits.monthly_transcription_limit,
            totalDurationMinutes: 0,
            totalFileSizeMB: 0
          },
          tier: profile.tier,
          resetDate: profile.usage_reset_date,
          isLimitExceeded: false
        };
      }

      // Count all transcription attempts (not just completed ones)
      const totalTranscriptions = jobs?.length || 0;
      const totalFileSizeMB = jobs?.reduce((sum: number, job: any) => sum + ((job.file_size || 0) / (1024 * 1024)), 0) || 0;
      const totalDurationMinutes = jobs?.reduce((sum: number, job: any) => sum + ((job.duration_seconds || 0) / 60), 0) || 0;

      return {
        currentMonth: {
          transcriptionsUsed: totalTranscriptions,
          transcriptionsLimit: tierLimits.monthly_transcription_limit,
          totalDurationMinutes,
          totalFileSizeMB
        },
        tier: profile.tier,
        resetDate: profile.usage_reset_date,
        isLimitExceeded: tierLimits.monthly_transcription_limit !== -1 && 
                        totalTranscriptions >= tierLimits.monthly_transcription_limit
      };
    } catch (error) {
      console.error('Error getting current usage:', error);
      // Return default stats on error
      return {
        currentMonth: {
          transcriptionsUsed: 0,
          transcriptionsLimit: 10, // Updated to 10 for free tier
          totalDurationMinutes: 0,
          totalFileSizeMB: 0
        },
        tier: 'free',
        resetDate: new Date().toISOString(),
        isLimitExceeded: false
      };
    }
  }
}

export const clientUsageService = new ClientUsageService();