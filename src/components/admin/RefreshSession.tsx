'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function RefreshSession() {
  const [refreshing, setRefreshing] = useState(false)
  const { refreshProfile, userProfile } = useAuth()
  const router = useRouter()

  const handleRefresh = async () => {
    setRefreshing(true)
    console.log('Refreshing session and profile...')
    console.log('Current profile tier:', userProfile?.tier)
    
    try {
      const supabase = createClient()
      
      // Refresh the auth session
      const { data, error } = await supabase.auth.refreshSession()
      console.log('Session refresh result:', { error, user: data.user?.email })
      
      if (error) {
        console.error('Error refreshing session:', error)
        alert('Failed to refresh session. Please log out and log back in.')
        setRefreshing(false)
        return
      }
      
      // Refresh the user profile
      await refreshProfile()
      console.log('Profile refreshed')
      
      // Wait a moment for state to update
      setTimeout(() => {
        console.log('Reloading page...')
        router.refresh()
        window.location.reload()
      }, 500)
      
    } catch (err) {
      console.error('Error in refresh:', err)
      alert('Failed to refresh. Please log out and log back in.')
      setRefreshing(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {refreshing ? 'Refreshing...' : 'Refresh Session'}
      </button>
      {userProfile && (
        <p className="text-xs text-gray-500">
          Current tier: <span className="font-semibold">{userProfile.tier}</span>
        </p>
      )}
    </div>
  )
}
