'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RepairSession() {
  const router = useRouter()
  const supabase = createClient()
  const [status, setStatus] = useState('Checking session...')
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    console.log(message)
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    const repairSession = async () => {
      try {
        addLog('Starting session repair...')
        
        // Step 1: Check current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        addLog(`Session check: ${session ? 'Found' : 'Missing'} ${sessionError ? `Error: ${sessionError.message}` : ''}`)
        
        if (session?.user) {
          addLog(`User found: ${session.user.email}`)
          
          // Step 2: Refresh the session
          addLog('Refreshing session...')
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
          addLog(`Session refresh: ${refreshData.session ? 'Success' : 'Failed'} ${refreshError ? `Error: ${refreshError.message}` : ''}`)
          
          // Step 3: Check profile
          addLog('Checking user profile...')
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          addLog(`Profile check: ${profile ? 'Found' : 'Missing'} ${profileError ? `Error: ${profileError.message}` : ''}`)
          
          if (profileError && profileError.code === 'PGRST116') {
            addLog('Creating missing profile...')
            const { error: createError } = await supabase
              .from('user_profiles')
              .insert({
                id: session.user.id,
                email: session.user.email || '',
                tier: 'free' as const,
                provider: 'google',
                monthly_transcriptions_used: 0,
                total_transcriptions: 0,
                usage_reset_date: new Date().toISOString(),
                full_name: (session.user.user_metadata?.full_name as string) || null,
                avatar_url: (session.user.user_metadata?.picture as string) || (session.user.user_metadata?.avatar_url as string) || null,
                provider_id: (session.user.user_metadata?.sub as string) || null
              } as any)
            
            addLog(`Profile creation: ${createError ? `Failed: ${createError.message}` : 'Success'}`)
          }
          
          // Step 4: Test server-side auth
          addLog('Testing server-side authentication...')
          try {
            const response = await fetch('/api/user/profile')
            addLog(`Server auth test: ${response.ok ? 'Success' : `Failed: ${response.status}`}`)
            
            if (response.ok) {
              const data = await response.json()
              addLog(`Server profile: ${data.user ? 'Found' : 'Missing'}`)
            }
          } catch (apiError) {
            addLog(`Server auth test failed: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`)
          }
          
          setStatus('Session repair complete! Redirecting...')
          addLog('Session repair complete!')
          
          setTimeout(() => {
            router.push('/studio2')
          }, 3000)
          
        } else {
          addLog('No user session found')
          setStatus('No session found - please sign in')
          
          setTimeout(() => {
            router.push('/login')
          }, 3000)
        }
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        addLog(`Repair failed: ${errorMsg}`)
        setStatus(`Repair failed: ${errorMsg}`)
      }
    }

    repairSession()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4 text-center">Session Repair Utility</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <div className="flex items-center mb-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
            <p className="text-lg">{status}</p>
          </div>
        </div>

        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
          <div className="mb-2 text-gray-400">Session Repair Log:</div>
          {logs.map((log, index) => (
            <div key={index} className="mb-1">{log}</div>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          <button
            onClick={() => router.push('/studio2')}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Studio2 Now
          </button>
          <button
            onClick={() => router.push('/emergency-login')}
            className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Go to Emergency Login
          </button>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              localStorage.clear()
              sessionStorage.clear()
              router.push('/login')
            }}
            className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear Everything & Start Over
          </button>
        </div>
      </div>
    </div>
  )
}