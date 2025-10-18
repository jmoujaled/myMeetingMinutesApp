import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import { AuthenticatedUser, AuthError } from '@/lib/auth-middleware';

export type TierLimits = Database['public']['Tables']['tier_limits']['Row'];
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

export interface UsageLimitResult {
  canProceed: boolean;
  reason?: string;
  usageStats?: UsageStats;
}

export interface TranscriptionJobData {
  filename: string;
  fileSize?: number; // in bytes
  durationSeconds?: number;
  usageCost?: number;
}

/**
 * Service for managing user usage limits and tier validation
 */
export class UsageService {
  private supabase: any = null;

  constructor() {
    this.supabase = null; // Will be initialized in methods
  }



  /**
   * Get default tier limits as fallback when database lookup fails
   */
  private getDefaultTierLimits(tier: string): TierLimits {
    const defaults = {
      free: {
        tier: 'free' as const,
        monthly_transcription_limit: 10, // 10 transcriptions per month
        max_file_size_mb: 150,
        max_duration_minutes: 60, // 60 minutes total per month
        features: {
          basic_transcription: true,
          speaker_diarization: true, // Now enabled for free users
          summaries: true, // Now enabled for free users
          translations: true, // Now enabled for free users
          admin_dashboard: false,
          user_management: false
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      pro: {
        tier: 'pro' as const,
        monthly_transcription_limit: -1,
        max_file_size_mb: -1,
        max_duration_minutes: -1,
        features: {
          basic_transcription: true,
          speaker_diarization: true,
          summaries: true,
          translations: true,
          admin_dashboard: false,
          user_management: false
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      admin: {
        tier: 'admin' as const,
        monthly_transcription_limit: -1,
        max_file_size_mb: -1,
        max_duration_minutes: -1,
        features: {
          basic_transcription: true,
          speaker_diarization: true,
          summaries: true,
          translations: true,
          admin_dashboard: true,
          user_management: true,
          all_features: true
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    };

    return defaults[tier as keyof typeof defaults] || defaults.free;
  }

  /**
   * Get tier limits for a specific tier
   */
  async getTierLimits(tier: string): Promise<TierLimits | null> {
    try {
      // Use service client to bypass RLS for tier limits lookup
      const { createServiceClient } = await import('@/lib/supabase/service');
      const supabase = createServiceClient();
      
      const { data, error } = await (supabase as any)
        .from('tier_limits')
        .select('*')
        .eq('tier', tier)
        .single();

      if (error) {
        console.error('Error fetching tier limits:', error);
        
        // If tier limits don't exist, try to create default ones
        if (error.code === 'PGRST116') {
          console.log('Tier limits not found, creating default tier limits...');
          await this.ensureDefaultTierLimits();
          
          // Try again after creating defaults
          const { data: retryData, error: retryError } = await (supabase as any)
            .from('tier_limits')
            .select('*')
            .eq('tier', tier)
            .single();
            
          if (retryError) {
            console.error('Error fetching tier limits after creating defaults:', retryError);
            // Return default limits as fallback
            return this.getDefaultTierLimits(tier);
          }
          
          return retryData;
        }
        
        // Return default limits as fallback
        return this.getDefaultTierLimits(tier);
      }

      return data;
    } catch (error) {
      console.error('Unexpected error fetching tier limits:', error);
      return this.getDefaultTierLimits(tier);
    }
  }

  /**
   * Ensure default tier limits exist in the database
   */
  async ensureDefaultTierLimits(): Promise<void> {
    try {
      // Use service client to bypass RLS for system initialization
      const { createServiceClient } = await import('@/lib/supabase/service');
      const supabase = createServiceClient();

      const defaultTierLimits: Database['public']['Tables']['tier_limits']['Insert'][] = [
        {
          tier: 'free',
          monthly_transcription_limit: 10, // 10 transcriptions per month
          max_file_size_mb: 150, // 150MB per file
          max_duration_minutes: 60, // 60 minutes total per month (not per file)
          features: {
            basic_transcription: true,
            speaker_diarization: true, // Now enabled for free users
            summaries: true, // Now enabled for free users
            translations: true, // Now enabled for free users
            admin_dashboard: false,
            user_management: false
          }
        },
        {
          tier: 'pro',
          monthly_transcription_limit: -1,
          max_file_size_mb: -1,
          max_duration_minutes: -1,
          features: {
            basic_transcription: true,
            speaker_diarization: true,
            summaries: true,
            translations: true,
            admin_dashboard: false,
            user_management: false
          }
        },
        {
          tier: 'admin',
          monthly_transcription_limit: -1,
          max_file_size_mb: -1,
          max_duration_minutes: -1,
          features: {
            basic_transcription: true,
            speaker_diarization: true,
            summaries: true,
            translations: true,
            admin_dashboard: true,
            user_management: true,
            all_features: true
          }
        }
      ];

      for (const tierLimit of defaultTierLimits) {
        const { error } = await (supabase as any)
          .from('tier_limits')
          .upsert(tierLimit, { onConflict: 'tier' });

        if (error) {
          console.error(`Error creating tier limit for ${tierLimit.tier}:`, error);
        } else {
          console.log(`Created/updated tier limit for ${tierLimit.tier}`);
        }
      }
    } catch (error) {
      console.error('Error ensuring default tier limits:', error);
    }
  }

  /**
   * Get current usage statistics for a user
   */
  async getCurrentUsage(userId: string): Promise<UsageStats | null> {
    try {
      // Try to use service client, fallback to regular client if service key missing
      let supabase;
      try {
        const { createServiceClient } = await import('@/lib/supabase/service');
        supabase = createServiceClient();
      } catch (serviceError) {
        console.warn('Service client unavailable, using regular client:', serviceError instanceof Error ? serviceError.message : 'Unknown error');
        supabase = createClient();
      }

      // Get user profile
      const { data: profile, error: profileError } = await (supabase as any)
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        console.error('Error fetching user profile:', profileError);
        console.error('User ID:', userId);
        
        // Try to create the user profile if it doesn't exist
        if (profileError?.code === 'PGRST116') {
          console.log('User profile not found, this should have been created by auth middleware');
          // Return null to trigger profile creation in auth middleware
          return null;
        }
        
        return null;
      }

      // Get tier limits
      const tierLimits = await this.getTierLimits(profile.tier);
      if (!tierLimits) {
        return null;
      }

      // Calculate usage for current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: jobs, error: jobsError } = await (supabase as any)
        .from('transcription_jobs')
        .select('usage_cost, file_size, duration_seconds')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('created_at', startOfMonth.toISOString());

      if (jobsError) {
        console.error('Error fetching transcription jobs:', jobsError);
        return null;
      }

      const totalUsageCost = jobs?.reduce((sum: number, job: any) => sum + (job.usage_cost || 1), 0) || 0;
      const totalFileSizeMB = jobs?.reduce((sum: number, job: any) => sum + ((job.file_size || 0) / (1024 * 1024)), 0) || 0;
      const totalDurationMinutes = jobs?.reduce((sum: number, job: any) => sum + ((job.duration_seconds || 0) / 60), 0) || 0;

      // Check if any limits are exceeded
      const transcriptionLimitExceeded = tierLimits.monthly_transcription_limit !== -1 && 
                                        totalUsageCost >= tierLimits.monthly_transcription_limit;
      const durationLimitExceeded = tierLimits.max_duration_minutes !== -1 && 
                                   totalDurationMinutes >= tierLimits.max_duration_minutes;

      return {
        currentMonth: {
          transcriptionsUsed: totalUsageCost,
          transcriptionsLimit: tierLimits.monthly_transcription_limit,
          totalDurationMinutes,
          totalFileSizeMB
        },
        tier: profile.tier,
        resetDate: profile.usage_reset_date,
        isLimitExceeded: transcriptionLimitExceeded || durationLimitExceeded
      };
    } catch (error) {
      console.error('Error getting current usage:', error);
      return null;
    }
  }

  /**
   * Check if user can perform a transcription based on tier limits
   */
  async checkLimits(
    userId: string, 
    tier: string, 
    jobData?: { fileSizeMB?: number; durationMinutes?: number }
  ): Promise<UsageLimitResult> {
    try {
      const usageStats = await this.getCurrentUsage(userId);
      const tierLimits = await this.getTierLimits(tier);

      if (!usageStats || !tierLimits) {
        console.error('Missing usage stats or tier limits:', { usageStats: !!usageStats, tierLimits: !!tierLimits });
        
        // If we can't get usage info, allow the request but log the issue
        // This prevents the 429 error from blocking legitimate users
        console.warn('Allowing request due to missing usage information - this should be investigated');
        return {
          canProceed: true,
          reason: 'Usage information unavailable - allowing request'
        };
      }

      // Check monthly transcription limit - only block if ALREADY exceeded (not if this would exceed)
      if (tierLimits.monthly_transcription_limit !== -1 && 
          usageStats.currentMonth.transcriptionsUsed >= tierLimits.monthly_transcription_limit) {
        return {
          canProceed: false,
          reason: 'Monthly transcription limit exceeded. You have used all your available transcriptions for this month.',
          usageStats
        };
      }

      // Check file size limit if provided
      if (jobData?.fileSizeMB && tierLimits.max_file_size_mb !== -1 && 
          jobData.fileSizeMB > tierLimits.max_file_size_mb) {
        return {
          canProceed: false,
          reason: `File size exceeds ${tierLimits.max_file_size_mb}MB limit for ${tier} tier`,
          usageStats
        };
      }

      // Check monthly duration limit - only block if ALREADY exceeded (not if this would exceed)
      if (tierLimits.max_duration_minutes !== -1 && 
          usageStats.currentMonth.totalDurationMinutes >= tierLimits.max_duration_minutes) {
        return {
          canProceed: false,
          reason: `Monthly duration limit exceeded. You have used all your available ${tierLimits.max_duration_minutes} minutes for this month.`,
          usageStats
        };
      }

      return {
        canProceed: true,
        usageStats
      };
    } catch (error) {
      console.error('Error checking usage limits:', error);
      // Allow the request to proceed if there's an error checking limits
      return {
        canProceed: true,
        reason: 'Error checking limits - allowing request'
      };
    }
  }

  /**
   * Record usage for a transcription job
   */
  async recordUsage(userId: string, jobData: TranscriptionJobData): Promise<void> {
    try {
      // Use service client to bypass RLS for system operations
      const { createServiceClient } = await import('@/lib/supabase/service');
      const supabase = createServiceClient();

      // Get user tier
      console.log('🔧 USAGE SERVICE: Looking for user profile for userId:', userId);
      const { data: profile, error: profileError } = await (supabase as any)
        .from('user_profiles')
        .select('tier')
        .eq('id', userId)
        .single();

      console.log('🔧 USAGE SERVICE: Profile lookup result:', { profile, profileError });

      if (!profile) {
        console.error('🔧 USAGE SERVICE: User profile not found for userId:', userId);
        throw new Error('User profile not found');
      }

      // Insert transcription job record
      const insertData: Database['public']['Tables']['transcription_jobs']['Insert'] = {
        user_id: userId,
        filename: jobData.filename,
        file_size: jobData.fileSize || null,
        duration_seconds: jobData.durationSeconds || null,
        tier: profile.tier,
        usage_cost: jobData.usageCost || 1,
        status: 'processing'
      };

      const { error } = await (supabase as any)
        .from('transcription_jobs')
        .insert(insertData);

      if (error) {
        console.error('Error recording usage:', error);
        throw new Error('Failed to record usage');
      }
    } catch (error) {
      console.error('Error in recordUsage:', error);
      throw error;
    }
  }

  /**
   * Update transcription job status
   */
  async updateJobStatus(
    userId: string, 
    filename: string, 
    status: 'completed' | 'failed' | 'cancelled',
    jobId?: string,
    errorMessage?: string,
    durationSeconds?: number,
    transcriptData?: {
      transcript_text?: string;
      summary?: string;
      segments?: any[];
      job_data?: any;
    }
  ): Promise<void> {
    try {
      // Use service client to bypass RLS for system operations
      const { createServiceClient } = await import('@/lib/supabase/service');
      const supabase = createServiceClient();

      const updateData: Database['public']['Tables']['transcription_jobs']['Update'] = {
        status,
        completed_at: status === 'completed' ? new Date().toISOString() : null
      };

      if (jobId) {
        updateData.job_id = jobId;
      }

      if (errorMessage) {
        updateData.error_message = errorMessage;
      }

      if (durationSeconds) {
        updateData.duration_seconds = durationSeconds;
        console.log(`🕒 Recording duration: ${Math.round(durationSeconds / 60)} minutes for job ${filename}`);
      }

      if (transcriptData && status === 'completed') {
        // Save transcript data to metadata field
        updateData.metadata = {
          transcript_text: transcriptData.transcript_text,
          summary: transcriptData.summary,
          segments: transcriptData.segments,
          job_data: transcriptData.job_data,
          processed_at: new Date().toISOString()
        };
        console.log(`💾 Saving transcript data for job ${filename}:`);
        console.log('- transcript_text:', transcriptData.transcript_text ? `${transcriptData.transcript_text.length} chars` : 'null');
        console.log('- summary:', transcriptData.summary ? `${transcriptData.summary.length} chars` : 'null');
        console.log('- segments:', transcriptData.segments ? `${transcriptData.segments.length} items` : 'null');
      }

      const { error } = await (supabase as any)
        .from('transcription_jobs')
        .update(updateData)
        .eq('user_id', userId)
        .eq('filename', filename);

      if (error) {
        console.error('Error updating job status:', error);
        throw new Error('Failed to update job status');
      }
    } catch (error) {
      console.error('Error in updateJobStatus:', error);
      throw error;
    }
  }
}

/**
 * Singleton instance of the usage service
 */
export const usageService = new UsageService();

/**
 * Check usage limits for authentication middleware
 */
export async function checkUsageLimits(user: AuthenticatedUser): Promise<AuthError | null> {
  try {
    const result = await usageService.checkLimits(user.id, user.tier);
    
    if (!result.canProceed) {
      return {
        error: result.reason || 'Usage limit exceeded',
        code: 'USAGE_LIMIT_EXCEEDED',
        details: {
          currentTier: user.tier,
          usageStats: result.usageStats,
          upgradeUrl: '/upgrade'
        }
      };
    }

    return null;
  } catch (error) {
    console.error('Error checking usage limits:', error);
    return {
      error: 'Unable to verify usage limits',
      code: 'USAGE_LIMIT_EXCEEDED'
    };
  }
}

/**
 * Schedule monthly usage reset for all users
 * This function is called by cron jobs to reset usage counters
 */
export async function scheduleMonthlyUsageReset(): Promise<void> {
  try {
    // Use service client to bypass RLS for system operations
    const { createServiceClient } = await import('@/lib/supabase/service');
    const supabase = createServiceClient();

    console.log('Starting monthly usage reset...');

    // Update all user profiles to reset their usage_reset_date to the first of next month
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);

    const updateData: Database['public']['Tables']['user_profiles']['Update'] = {
      usage_reset_date: nextMonth.toISOString()
    };

    const { data, error } = await (supabase as any)
      .from('user_profiles')
      .update(updateData)
      .select('id, email');

    if (error) {
      console.error('Error updating user profiles for usage reset:', error);
      throw new Error('Failed to update user profiles');
    }

    console.log(`Successfully updated usage reset date for ${data?.length || 0} users`);

    // Optionally, you could also clean up old transcription job records here
    // For example, delete jobs older than 6 months to keep the database clean
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { error: cleanupError } = await (supabase as any)
      .from('transcription_jobs')
      .delete()
      .lt('created_at', sixMonthsAgo.toISOString());

    if (cleanupError) {
      console.warn('Error cleaning up old transcription jobs:', cleanupError);
      // Don't throw here as this is optional cleanup
    } else {
      console.log('Successfully cleaned up old transcription job records');
    }

  } catch (error) {
    console.error('Error in scheduleMonthlyUsageReset:', error);
    throw error;
  }
}