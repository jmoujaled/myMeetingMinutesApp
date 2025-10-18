'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function EmergencyLogin() {
  const router = useRouter()
  const supabase = createClient()
  const [status, setStatus] = useState('Checking authentication...')
  const [userInfo, setUserInfo] = useState<any>(null)

  useEffect(() => {
    const checkAndRedirect = async () => {
      try {
        // Check current session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          setStatus(`Session error: ${error.message}`)
          return
        }

        if (session?.user) {
          setStatus(`Found user: ${session.user.email}`)
          setUserInfo(session.user)
          
          // Check if profile exists
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (profileError && profileError.code === 'PGRST116') {
            setStatus('Creating missing profile...')
            
            // Create profile
            const { error: createError } = await (supabase
              .from('user_profiles') as any)
              .insert({
                id: session.user.id,
                email: session.user.email || '',
                tier: 'free',
                provider: 'google',
                monthly_transcriptions_used: 0,
                total_transcriptions: 0,
                usage_reset_date: new Date().toISOString(),
                full_name: session.user.user_metadata?.full_name || null,
                avatar_url: session.user.user_metadata?.picture || session.user.user_metadata?.avatar_url || null,
                provider_id: session.user.user_metadata?.sub || null
              })

            if (createError) {
              setStatus(`Profile creation failed: ${createError.message}`)
            } else {
              setStatus('Profile created successfully!')
            }
          } else if (profile) {
            setStatus('Profile found!')
          }

          // Redirect to studio2 after 2 seconds
          setTimeout(() => {
            setStatus('Redirecting to Studio2...')
            router.push('/studio2')
          }, 2000)

        } else {
          setStatus('No user session found')
        }
      } catch (error) {
        setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    checkAndRedirect()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Emergency Auth Bypass</h1>
        <div className="mb-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{status}</p>
        </div>
        
        {userInfo && (
          <div className="bg-green-50 p-4 rounded-lg mb-4">
            <h3 className="font-semibold text-green-800">User Found:</h3>
            <p className="text-green-700">{userInfo.email}</p>
            <p className="text-sm text-green-600">ID: {userInfo.id}</p>
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={() => router.push('/studio2')}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go to Studio2
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Go to Dashboard
          </button>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/login')
            }}
            className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Sign Out & Start Over
          </button>
        </div>
      </div>
    </div>
  )
}