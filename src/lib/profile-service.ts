import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { Database } from '@/lib/supabase/types'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']

/**
 * Centralized profile management service
 * This is the ONLY place where profiles should be created
 */
export class ProfileService {
  
  /**
   * Get user profile - does NOT create if missing
   */
  static async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const supabase = await createClient()
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('Profile not found for user:', userId)
          return null
        }
        console.error('Error fetching profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Profile service error:', error)
      return null
    }
  }

  /**
   * Create user profile - ONLY called by auth middleware
   */
  static async createProfile(user: any): Promise<UserProfile | null> {
    try {
      console.log('Creating profile for user:', user.id, user.email)
      
      // Use service client to bypass RLS
      const serviceSupabase = createServiceClient()
      
      // Ensure tier limits exist first
      await this.ensureTierLimits()
      
      // Extract user data
      const provider = user.app_metadata?.provider || 'email'
      const providerId = provider === 'google' ? user.user_metadata?.sub : null
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name
      // Google OAuth provides 'picture' field, not 'avatar_url'
      const avatarUrl = user.user_metadata?.picture || user.user_metadata?.avatar_url

      const profileData: Database['public']['Tables']['user_profiles']['Insert'] = {
        id: user.id,
        email: user.email,
        tier: 'free',
        provider,
        provider_id: providerId,
        full_name: fullName,
        avatar_url: avatarUrl,
        monthly_transcriptions_used: 0,
        total_transcriptions: 0,
        usage_reset_date: new Date().toISOString()
      }

      const { data, error } = await serviceSupabase
        .from('user_profiles')
        .insert(profileData as any)
        .select()
        .single()

      if (error) {
        // Handle duplicate key error
        if (error.code === '23505') {
          console.log('Profile already exists, fetching existing profile')
          return await this.getProfile(user.id)
        }
        
        console.error('Error creating profile:', error)
        return null
      }

      console.log('Profile created successfully:', (data as any)?.id)
      return data as any
    } catch (error) {
      console.error('Profile creation error:', error)
      return null
    }
  }

  /**
   * Get or create profile - ONLY for auth middleware
   */
  static async getOrCreateProfile(user: any): Promise<UserProfile | null> {
    // First try to get existing profile
    let profile = await this.getProfile(user.id)
    
    if (!profile) {
      // Create if doesn't exist
      profile = await this.createProfile(user)
    }
    
    return profile
  }

  /**
   * Ensure tier limits exist in database
   */
  private static async ensureTierLimits(): Promise<void> {
    try {
      const { usageService } = await import('@/lib/usage-service')
      await usageService.ensureDefaultTierLimits()
    } catch (error) {
      console.error('Error ensuring tier limits:', error)
    }
  }
}