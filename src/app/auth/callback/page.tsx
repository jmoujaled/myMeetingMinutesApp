'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function AuthCallbackForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>('')

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleAuthCallback = async () => {
      try {
        // Set a very short timeout and just redirect to app
        timeoutId = setTimeout(() => {
          console.log('Callback timeout - redirecting to app');
          const redirectTo = searchParams.get('redirect') || '/studio2';
          router.replace(redirectTo);
        }, 2000); // Very short timeout - just redirect

        // Check for auth errors in URL params first
        const error = searchParams.get('error')
        const errorCode = searchParams.get('error_code')
        const code = searchParams.get('code')

        console.log('Auth callback params:', { error, errorCode, hasCode: !!code })

        if (error) {
          console.log('Auth callback error detected:', { error, errorCode })
          router.replace(`/login?error=${error}`)
          return
        }

        // First, just check if we already have a session (most common case)
        setDebugInfo('Checking current session...')
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session && session.user) {
          console.log('Already have session for:', session.user.email)
          clearTimeout(timeoutId);
          const redirectTo = searchParams.get('redirect') || '/dashboard'
          router.replace(redirectTo)
          return
        }

        // If we have a code and no session, try to exchange it
        if (code) {
          setDebugInfo('Processing authentication code...')
          
          try {
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
            
            if (exchangeError) {
              console.error('Code exchange error:', exchangeError)
              // Check one more time if session exists despite error
              const { data: { session: retrySession } } = await supabase.auth.getSession()
              if (retrySession?.user) {
                console.log('Session exists despite exchange error, proceeding')
                const redirectTo = searchParams.get('redirect') || '/dashboard'
                router.replace(redirectTo)
                return
              }
              
              setError('Failed to complete authentication')
              router.replace('/login?error=code_exchange_failed')
              return
            }

            if (data.session && data.user) {
              console.log('Authentication successful for:', data.user.email)
              const redirectTo = searchParams.get('redirect') || '/dashboard'
              router.replace(redirectTo)
              return
            }
          } catch (codeError) {
            console.error('Code exchange failed:', codeError)
            // Final fallback - check session one more time
            const { data: { session: finalSession } } = await supabase.auth.getSession()
            if (finalSession?.user) {
              console.log('Session exists despite code exchange failure')
              const redirectTo = searchParams.get('redirect') || '/dashboard'
              router.replace(redirectTo)
              return
            }
          }
        }

        // If we get here, something went wrong
        console.log('No session found, redirecting to login')
        router.replace('/login?error=no_session')

      } catch (error) {
        console.error('Auth callback error:', error)
        // Final check before giving up
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          console.log('Session exists despite error, redirecting to app')
          const redirectTo = searchParams.get('redirect') || '/dashboard'
          router.replace(redirectTo)
        } else {
          setError('Authentication failed')
          router.replace('/login?error=auth_callback_failed')
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    }

    handleAuthCallback()
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }, [router, searchParams, supabase.auth])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <p className="text-sm text-muted-foreground">Redirecting to login...</p>
          {debugInfo && (
            <p className="text-xs text-gray-400 mt-2">Debug: {debugInfo}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Completing authentication...</p>
        {debugInfo && (
          <p className="text-sm text-gray-400 mt-2">{debugInfo}</p>
        )}
      </div>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackForm />
    </Suspense>
  )
}