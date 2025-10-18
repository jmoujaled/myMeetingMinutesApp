import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/lib/supabase/types';

export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type UserTier = 'free' | 'pro' | 'admin';

export interface AuthenticatedUser {
  id: string;
  email: string;
  tier: UserTier;
  profile: UserProfile;
}

export interface AuthenticatedRequest extends NextRequest {
  user: AuthenticatedUser;
}

export interface MiddlewareConfig {
  requireAuth?: boolean;
  requiredTier?: UserTier;
  checkUsageLimits?: boolean;
}

export interface AuthError {
  error: string;
  code: 'AUTH_REQUIRED' | 'INSUFFICIENT_TIER' | 'USAGE_LIMIT_EXCEEDED' | 'INVALID_TOKEN' | 'USER_NOT_FOUND';
  details?: {
    currentTier?: string;
    requiredTier?: string;
    usageStats?: any;
    upgradeUrl?: string;
  };
}

/**
 * Authentication middleware utility to validate Supabase JWT tokens
 * and extract user information from validated tokens
 */
export async function validateAuth(request: NextRequest): Promise<{
  user: AuthenticatedUser | null;
  error: AuthError | null;
}> {
  try {
    const supabase = await createClient();

    // Get the user from the session
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        user: null,
        error: {
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        }
      };
    }

    // Get the user profile from the database
    let { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // If profile doesn't exist, create it using centralized service
    if (profileError || !profile) {
      console.log(`🔧 AUTH MIDDLEWARE: Profile missing for user ${user.id}, creating...`);
      
      try {
        const { ProfileService } = await import('@/lib/profile-service');
        profile = await ProfileService.createProfile(user);
        
        if (!profile) {
          return {
            user: null,
            error: {
              error: 'Failed to create user profile',
              code: 'USER_NOT_FOUND'
            }
          };
        }
        
        console.log('🔧 AUTH MIDDLEWARE: Profile created successfully');
      } catch (profileCreationError) {
        console.error('Profile creation error:', profileCreationError);
        return {
          user: null,
          error: {
            error: 'Profile creation failed',
            code: 'USER_NOT_FOUND'
          }
        };
      }
    }

    return {
      user: {
        id: user.id,
        email: user.email || profile.email,
        tier: profile.tier,
        profile
      },
      error: null
    };
  } catch (error) {
    console.error('Auth validation error:', error);
    return {
      user: null,
      error: {
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      }
    };
  }
}

/**
 * Middleware to check user tier against required permissions
 */
export function validateTier(user: AuthenticatedUser, requiredTier: UserTier): AuthError | null {
  const tierHierarchy: Record<UserTier, number> = {
    'free': 1,
    'pro': 2,
    'admin': 3
  };

  const userTierLevel = tierHierarchy[user.tier];
  const requiredTierLevel = tierHierarchy[requiredTier];

  if (userTierLevel < requiredTierLevel) {
    return {
      error: `${requiredTier} tier required`,
      code: 'INSUFFICIENT_TIER',
      details: {
        currentTier: user.tier,
        requiredTier: requiredTier,
        upgradeUrl: '/upgrade'
      }
    };
  }

  return null;
}

/**
 * Create an authenticated API handler with middleware configuration
 */
export function withAuth(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>,
  config: MiddlewareConfig = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const { requireAuth = true, requiredTier, checkUsageLimits = false } = config;

    if (!requireAuth) {
      return handler(request as AuthenticatedRequest);
    }

    // Validate authentication
    const { user, error } = await validateAuth(request);

    if (error || !user) {
      return NextResponse.json(
        { error: error?.error || 'Authentication failed', code: error?.code || 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Check tier requirements
    if (requiredTier) {
      const tierError = validateTier(user, requiredTier);
      if (tierError) {
        return NextResponse.json(
          {
            error: tierError.error,
            code: tierError.code,
            details: tierError.details
          },
          { status: 403 }
        );
      }
    }

    // Check usage limits if required
    if (checkUsageLimits) {
      const usageError = await validateUsageLimits(user);
      if (usageError) {
        return NextResponse.json(
          {
            error: usageError.error,
            code: usageError.code,
            details: usageError.details
          },
          { status: 429 }
        );
      }
    }

    // Add user to request object
    (request as AuthenticatedRequest).user = user;

    return handler(request as AuthenticatedRequest);
  };
}

/**
 * Check usage limits for a user
 */
async function validateUsageLimits(user: AuthenticatedUser): Promise<AuthError | null> {
  const { checkUsageLimits } = await import('@/lib/usage-service');
  return checkUsageLimits(user);
}