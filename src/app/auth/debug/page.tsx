'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export default function AuthDebug() {
  const { user, userProfile, loading } = useAuth()
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [urlInfo, setUrlInfo] = useState<string>('')
  const supabase = createClient()

  useEffect(() => {
    // Get current URL info
    setUrlInfo(window.location.href)

    // Get session info
    const getSessionInfo = async () => {
      const { data, error } = await supabase.auth.getSession()
      setSessionInfo({ data, error })
    }

    getSessionInfo()
  }, [supabase.auth])

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Authentication Debug</h1>
        
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Current URL</h2>
            <p className="text-sm font-mono bg-gray-100 p-2 rounded">{urlInfo}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Auth Context State</h2>
            <div className="space-y-2">
              <p><strong>Loading:</strong> {loading ? 'true' : 'false'}</p>
              <p><strong>User:</strong> {user ? user.email : 'null'}</p>
              <p><strong>User ID:</strong> {user ? user.id : 'null'}</p>
              <p><strong>Profile:</strong> {userProfile ? JSON.stringify(userProfile) : 'null'}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Session Info</h2>
            <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(sessionInfo, null, 2)}
            </pre>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Actions</h2>
            <div className="space-x-4">
              <button
                onClick={() => window.location.href = '/login'}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Go to Login
              </button>
              <button
                onClick={() => window.location.href = '/studio2'}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Go to Studio2
              </button>
              <button
                onClick={async () => {
                  try {
                    await supabase.auth.signOut()
                    // Clear storage for debug purposes
                    localStorage.clear()
                    sessionStorage.clear()
                    window.location.href = '/login?message=debug_signout'
                  } catch (error) {
                    console.error('Debug signout error:', error)
                    window.location.href = '/login?error=debug_signout_failed'
                  }
                }}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}