'use client'

import { useState } from 'react'

interface TestResult {
  status: 'idle' | 'loading' | 'success' | 'error'
  data?: any
  error?: string
}

export default function ApiDebug() {
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({})

  const debugEndpoints = [
    {
      id: 'transcribe-form-test',
      name: 'Transcribe Form Test',
      description: 'Tests transcription form processing and usage tracking',
      endpoint: '/api/debug/transcribe-form-test'
    },
    {
      id: 'usage-service-test',
      name: 'Usage Service Test',
      description: 'Tests usage service methods and database operations',
      endpoint: '/api/debug/usage-service-test'
    },
    {
      id: 'auth-test',
      name: 'Authentication Test',
      description: 'Tests user authentication and profile retrieval',
      endpoint: '/api/debug/auth-test'
    },
    {
      id: 'user-profile',
      name: 'User Profile Test',
      description: 'Tests user profile data and tier information',
      endpoint: '/api/debug/user-profile'
    },
    {
      id: 'transcribe-test',
      name: 'Transcription Service Test',
      description: 'Tests basic transcription service functionality',
      endpoint: '/api/debug/transcribe-test'
    },
    {
      id: 'meetings',
      name: 'Meetings API Test',
      description: 'Tests meetings database operations',
      endpoint: '/api/debug/meetings'
    }
  ]

  const runTest = async (endpoint: string, id: string) => {
    setTestResults(prev => ({
      ...prev,
      [id]: { status: 'loading' }
    }))

    try {
      const response = await fetch(endpoint)
      const data = await response.json()
      
      setTestResults(prev => ({
        ...prev,
        [id]: {
          status: response.ok ? 'success' : 'error',
          data: data,
          error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
        }
      }))
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [id]: {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }))
    }
  }

  const runAllTests = async () => {
    for (const endpoint of debugEndpoints) {
      await runTest(endpoint.endpoint, endpoint.id)
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'loading': return 'text-yellow-600 bg-yellow-50'
      case 'success': return 'text-green-600 bg-green-50'
      case 'error': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'loading':
        return (
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )
      case 'success':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Debug</h1>
          <p className="text-gray-600 mt-1">Test and debug API endpoints</p>
        </div>
        <button
          onClick={runAllTests}
          disabled={Object.values(testResults).some(result => result.status === 'loading')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Run All Tests</span>
        </button>
      </div>

      <div className="grid gap-6">
        {debugEndpoints.map((endpoint) => {
          const result = testResults[endpoint.id] || { status: 'idle' }
          
          return (
            <div key={endpoint.id} className="bg-white rounded-lg shadow border">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{endpoint.name}</h3>
                    <p className="text-sm text-gray-600">{endpoint.description}</p>
                    <code className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
                      {endpoint.endpoint}
                    </code>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(result.status)}`}>
                      {getStatusIcon(result.status)}
                      <span className="ml-1 capitalize">{result.status}</span>
                    </span>
                    <button
                      onClick={() => runTest(endpoint.endpoint, endpoint.id)}
                      disabled={result.status === 'loading'}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                    >
                      Test
                    </button>
                  </div>
                </div>

                {result.error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800 font-medium">Error:</p>
                    <p className="text-sm text-red-700">{result.error}</p>
                  </div>
                )}

                {result.data && (
                  <div className="bg-gray-50 rounded-md p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900">Response:</h4>
                      <button
                        onClick={() => navigator.clipboard.writeText(JSON.stringify(result.data, null, 2))}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Copy JSON
                      </button>
                    </div>
                    <pre className="text-xs text-gray-700 overflow-x-auto max-h-64 overflow-y-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}