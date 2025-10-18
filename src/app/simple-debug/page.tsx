'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SimpleDebug() {
  const router = useRouter()
  const [logs, setLogs] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [clientInfo, setClientInfo] = useState({ url: '', userAgent: '' })

  useEffect(() => {
    // Set client info after hydration to avoid mismatch
    setClientInfo({
      url: window.location.href,
      userAgent: navigator.userAgent.substring(0, 100) + '...'
    })
  }, [])

  const addLog = (message: string) => {
    console.log(message)
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const runDiagnostics = async () => {
    setIsRunning(true)
    setLogs([])
    
    try {
      addLog('=== SIMPLE DIAGNOSTICS ===')
      
      // Check localStorage
      addLog('Checking localStorage...')
      const localStorageKeys = Object.keys(localStorage)
      addLog(`localStorage keys: ${localStorageKeys.length} found`)
      localStorageKeys.forEach(key => {
        if (key.includes('supabase') || key.includes('auth')) {
          addLog(`  - ${key}: ${localStorage.getItem(key)?.substring(0, 50)}...`)
        }
      })
      
      // Check cookies
      addLog('Checking cookies...')
      const cookies = document.cookie.split(';')
      addLog(`Cookies: ${cookies.length} found`)
      cookies.forEach(cookie => {
        const [name] = cookie.trim().split('=')
        if (name.includes('supabase') || name.includes('auth') || name.includes('sb-')) {
          addLog(`  - ${name}`)
        }
      })
      
      // Check if we can create Supabase client
      addLog('Testing Supabase client creation...')
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        addLog('✅ Supabase client created successfully')
        
        // Try a simple call with timeout
        addLog('Testing getSession with 5s timeout...')
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
        
        const result = await Promise.race([sessionPromise, timeoutPromise])
        addLog(`✅ getSession completed: ${JSON.stringify(result).substring(0, 100)}...`)
        
      } catch (supabaseError) {
        addLog(`❌ Supabase error: ${supabaseError instanceof Error ? supabaseError.message : 'Unknown'}`)
      }
      
      // Test API endpoints
      addLog('Testing API endpoints...')
      try {
        const response = await fetch('/api/debug/auth-state')
        addLog(`API test: ${response.status} ${response.statusText}`)
        
        if (response.ok) {
          const data = await response.json()
          addLog(`API response: ${JSON.stringify(data).substring(0, 100)}...`)
        }
      } catch (apiError) {
        addLog(`❌ API error: ${apiError instanceof Error ? apiError.message : 'Unknown'}`)
      }
      
      addLog('=== DIAGNOSTICS COMPLETE ===')
      
    } catch (error) {
      addLog(`❌ Diagnostics failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsRunning(false)
    }
  }

  const clearEverything = async () => {
    addLog('Clearing all storage...')
    localStorage.clear()
    sessionStorage.clear()
    
    // Clear cookies
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    addLog('Storage cleared. Reloading page...')
    setTimeout(() => {
      window.location.href = '/login'
    }, 1000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4 text-center">Simple Debug Tool</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <div className="space-x-4 mb-4">
            <button
              onClick={runDiagnostics}
              disabled={isRunning}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isRunning ? 'Running...' : 'Run Diagnostics'}
            </button>
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Go to Login
            </button>
            <button
              onClick={clearEverything}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Clear Everything
            </button>
          </div>
        </div>

        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
          <div className="mb-2 text-gray-400">Debug Log:</div>
          {logs.length === 0 && (
            <div className="text-gray-500">Click &quot;Run Diagnostics&quot; to start...</div>
          )}
          {logs.map((log, index) => (
            <div key={index} className="mb-1">{log}</div>
          ))}
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p><strong>Current URL:</strong> {clientInfo.url}</p>
          <p><strong>User Agent:</strong> {clientInfo.userAgent}</p>
        </div>
      </div>
    </div>
  )
}