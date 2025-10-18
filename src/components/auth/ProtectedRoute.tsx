'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredTier?: 'free' | 'pro' | 'admin'
  fallback?: React.ReactNode
}

export default function ProtectedRoute({ 
  children, 
  requiredTier = 'free',
  fallback 
}: ProtectedRouteProps) {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [profileCreationAttempted, setProfileCreationAttempted] = useState(false)
  const [waitingStartTime] = useState(Date.now())



  useEffect(() => {
    if (!loading) {
      if (!user) {
        // User is not authenticated, redirect to login with return URL
        const redirectUrl = encodeURIComponent(pathname)
        router.push(`/login?redirect=${redirectUrl}&error=access_denied`)
        return
      }

      // If user exists but no profile, trigger profile creation by calling an API endpoint
      if (!userProfile) {
        const waitingTime = Date.now() - waitingStartTime
        
        // If we've been waiting too long (more than 30 seconds), show error
        if (waitingTime > 30000) {
          console.error('Profile creation timeout - redirecting to login')
          router.push('/login?error=profile_timeout')
          return
        }
        
        // Only attempt profile creation once
        if (!profileCreationAttempted) {
          console.log('User profile missing, triggering creation...')
          setProfileCreationAttempted(true)
          
          // Call the profile endpoint to trigger automatic profile creation
          fetch('/api/user/profile')
            .then(response => {
              if (response.ok) {
                console.log('Profile creation triggered successfully')
                // The AuthProvider will handle updating the profile state
              } else {
                console.error('Failed to trigger profile creation')
              }
            })
            .catch(error => {
              console.error('Error triggering profile creation:', error)
            })
        }
        
        return
      }

      // Check tier-based access
      if (requiredTier && !hasRequiredTier(userProfile.tier, requiredTier)) {
        // User doesn't have required tier, redirect to upgrade page or show error
        router.push(`/upgrade?required=${requiredTier}&current=${userProfile.tier}`)
        return
      }
    }
  }, [user, userProfile, loading, router, pathname, requiredTier, profileCreationAttempted])

  // Helper function to check if user has required tier
  const hasRequiredTier = (userTier: string, required: string): boolean => {
    const tierHierarchy = { free: 0, pro: 1, admin: 2 }
    return tierHierarchy[userTier as keyof typeof tierHierarchy] >= 
           tierHierarchy[required as keyof typeof tierHierarchy]
  }

  // Show loading state
  if (loading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      )
    )
  }

  // User not authenticated
  if (!user) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">Redirecting to login...</p>
          </div>
        </div>
      )
    )
  }

  // User profile not loaded yet
  if (!userProfile) {
    const waitingTime = Date.now() - waitingStartTime
    const isLongWait = waitingTime > 3000
    
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">
              {isLongWait ? 'Setting up your account...' : 'Loading profile...'}
            </p>
            {isLongWait && (
              <p className="mt-2 text-sm text-gray-500">This may take a moment for new accounts</p>
            )}
          </div>
        </div>
      )
    )
  }

  // Check tier access
  if (requiredTier && !hasRequiredTier(userProfile.tier, requiredTier)) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">Insufficient permissions. Redirecting...</p>
          </div>
        </div>
      )
    )
  }

  // All checks passed, render children
  return <>{children}</>
}