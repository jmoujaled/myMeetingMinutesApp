'use client'

import { useState } from 'react'

export default function BasicTest() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testAuth = async () => {
    setLoading(true)
    setResult('Testing...')
    
    try {
      // Test 1: Can we import Supabase?
      setResult('Importing Supabase...')
      const { createClient } = await import('@/lib/supabase/client')
      
      // Test 2: Can we create client?
      setResult('Creating client...')
      const supabase = createClient()
      
      // Test 3: Can we call getSession?
      setResult('Getting session...')
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        setResult(`❌ Session error: ${error.message}`)
      } else if (data.session) {
        setResult(`✅ Session found: ${data.session.user?.email}`)
      } else {
        setResult(`ℹ️ No session found`)
      }
      
    } catch (error) {
      setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`)
    } finally {
      setLoading(false)
    }
  }

  const clearAndLogin = () => {
    localStorage.clear()
    sessionStorage.clear()
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6 text-center">Basic Auth Test</h1>
        
        <div className="space-y-4">
          <button
            onClick={testAuth}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Authentication'}
          </button>
          
          <div className="p-4 bg-gray-100 rounded min-h-[60px] flex items-center justify-center">
            {result || 'Click "Test Authentication" to start'}
          </div>
          
          <div className="space-y-2">
            <button
              onClick={() => window.location.href = '/studio2'}
              className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Try Studio2
            </button>
            
            <button
              onClick={clearAndLogin}
              className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Clear All & Login
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}