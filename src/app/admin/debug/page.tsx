'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export default function AdminDebugPage() {
  const { user, userProfile } = useAuth()
  const [results, setResults] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function runTests() {
      const supabase = createClient()
      const testResults: Record<string, unknown> = {}

      // Test 1: Check current user
      testResults.currentUser = {
        id: user?.id,
        email: user?.email,
      }

      // Test 2: Check user profile
      testResults.userProfile = userProfile

      // Test 3: Try to fetch user_profiles
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .limit(5)
        
        testResults.userProfilesQuery = {
          success: !error,
          error: error?.message,
          count: data?.length,
          data: data
        }
      } catch (err: unknown) {
        testResults.userProfilesQuery = {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        }
      }

      // Test 4: Try to count user_profiles
      try {
        const { count, error } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
        
        testResults.userProfilesCount = {
          success: !error,
          error: error?.message,
          count
        }
      } catch (err: unknown) {
        testResults.userProfilesCount = {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        }
      }

      // Test 5: Try to fetch transcription_jobs
      try {
        const { data, error } = await supabase
          .from('transcription_jobs')
          .select('*')
          .limit(5)
        
        testResults.transcriptionJobsQuery = {
          success: !error,
          error: error?.message,
          count: data?.length,
          data: data
        }
      } catch (err: unknown) {
        testResults.transcriptionJobsQuery = {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        }
      }

      // Test 6: Check if is_admin() function works
      try {
        const { data, error } = await supabase.rpc('is_admin')
        
        testResults.isAdminFunction = {
          success: !error,
          error: error?.message,
          result: data
        }
      } catch (err: unknown) {
        testResults.isAdminFunction = {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        }
      }

      setResults(testResults)
      setLoading(false)
    }

    if (user) {
      runTests()
    }
  }, [user, userProfile])

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Admin Debug</h1>
        <p>Running tests...</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Debug Results</h1>
      
      {/* API Debug Endpoints */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3 text-blue-800">API Debug Endpoints</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <a 
            href="/api/debug/env-check" 
            target="_blank"
            className="bg-white border border-blue-200 rounded px-3 py-2 text-sm hover:bg-blue-50 transition-colors"
          >
            🔧 Environment Check
          </a>
          <a 
            href="/api/debug/test-basic" 
            target="_blank"
            className="bg-white border border-blue-200 rounded px-3 py-2 text-sm hover:bg-blue-50 transition-colors"
          >
            ⚡ Basic API Test
          </a>
          <a 
            href="/api/debug/auth-test" 
            target="_blank"
            className="bg-white border border-blue-200 rounded px-3 py-2 text-sm hover:bg-blue-50 transition-colors"
          >
            🔐 Auth Middleware Test
          </a>
          <a 
            href="/api/debug/transcribe-detailed" 
            target="_blank"
            className="bg-white border border-blue-200 rounded px-3 py-2 text-sm hover:bg-blue-50 transition-colors"
          >
            🎤 Transcribe Components Test
          </a>
          <a 
            href="/api/debug/transcribe-minimal" 
            target="_blank"
            className="bg-white border border-blue-200 rounded px-3 py-2 text-sm hover:bg-blue-50 transition-colors"
          >
            🧪 Minimal Transcribe Test
          </a>
          <a 
            href="/api/debug/usage" 
            target="_blank"
            className="bg-white border border-blue-200 rounded px-3 py-2 text-sm hover:bg-blue-50 transition-colors"
          >
            📊 Usage Debug
          </a>
          <a 
            href="/api/debug/transcribe-form-test" 
            target="_blank"
            className="bg-white border border-blue-200 rounded px-3 py-2 text-sm hover:bg-blue-50 transition-colors"
          >
            🧪 Transcribe Form Test
          </a>
        </div>
      </div>

      {/* Database Debug Results */}
      <h2 className="text-lg font-semibold mb-3">Database Debug Results</h2>
      <div className="space-y-4">
        {Object.entries(results).map(([key, value]) => (
          <div key={key} className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-lg mb-2">{key}</h3>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
              {JSON.stringify(value, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  )
}
