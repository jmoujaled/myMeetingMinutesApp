'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'

export default function TestAuthNewPage() {
  const { user, userProfile, loading, signOut } = useAuth()
  const [testResults, setTestResults] = useState<string[]>([])

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`])
  }

  const testLogout = async () => {
    addResult('Testing logout...')
    try {
      await signOut()
      addResult('Logout successful')
    } catch (error) {
      addResult(`Logout error: ${error}`)
    }
  }

  const testCrossWindow = () => {
    addResult('Opening new window for cross-window test...')
    window.open('/test-auth-new', '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading authentication state...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Not Authenticated</h1>
          <p className="mb-4">Please log in to test the new auth system</p>
          <a href="/login" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Go to Login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">New Authentication System Test</h1>
        
        {/* User Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Authentication State</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-700">User Info</h3>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>ID:</strong> {user.id}</p>
              <p><strong>Created:</strong> {new Date(user.created_at).toLocaleString()}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-700">Profile Info</h3>
              {userProfile ? (
                <>
                  <p><strong>Tier:</strong> {userProfile.tier}</p>
                  <p><strong>Provider:</strong> {userProfile.provider}</p>
                  <p><strong>Full Name:</strong> {userProfile.full_name || 'Not set'}</p>
                </>
              ) : (
                <p className="text-red-600">Profile not loaded</p>
              )}
            </div>
          </div>
        </div>

        {/* Test Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={testLogout}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Test Logout
            </button>
            <button
              onClick={testCrossWindow}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Test Cross-Window Sync
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Reload Page
            </button>
          </div>
        </div>

        {/* Test Results */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          <div className="bg-gray-100 p-4 rounded max-h-64 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-gray-500">No test results yet</p>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono mb-1">
                  {result}
                </div>
              ))
            )}
          </div>
          <button
            onClick={() => setTestResults([])}
            className="mt-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Clear Results
          </button>
        </div>

        {/* Navigation */}
        <div className="mt-6 text-center">
          <a href="/dashboard" className="text-blue-500 hover:underline mr-4">
            Back to Dashboard
          </a>
          <a href="/test-logout" className="text-blue-500 hover:underline">
            Old Logout Test
          </a>
        </div>
      </div>
    </div>
  )
}