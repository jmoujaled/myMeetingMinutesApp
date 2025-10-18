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
