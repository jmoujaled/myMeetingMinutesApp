'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'

export default function AuthStabilityTest() {
  const { user, userProfile, loading } = useAuth()
  const [sessionChecks, setSessionChecks] = useState<Array<{
    timestamp: string;
    hasUser: boolean;
    hasProfile: boolean;
    error?: string;
    debugInfo?: string;
  }>>([])
  const supabase = createClient()

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check both client session and server auth state
        const sessionResult = await supabase.auth.getSession();
        let debugResult = { error: 'Not checked' };
        
        try {
          const debugResponse = await fetch('/api/debug/auth-state');
          if (debugResponse.ok) {
            debugResult = await debugResponse.json();
          } else {
            debugResult = { error: `API Error: ${debugResponse.status}` };
          }
        } catch (e) {
          debugResult = { error: `Fetch Error: ${e instanceof Error ? e.message : 'Unknown'}` };
        }
        
        setSessionChecks(prev => [...prev.slice(-9), {
          timestamp: new Date().toLocaleTimeString(),
          hasUser: !!sessionResult.data?.session?.user,
          hasProfile: !!userProfile,
          error: sessionResult.error?.message || debugResult.error,
          debugInfo: (debugResult as any).profileError ? `Profile Error: ${(debugResult as any).profileError}` : undefined
        }])
      } catch (error) {
        setSessionChecks(prev => [...prev.slice(-9), {
          timestamp: new Date().toLocaleTimeString(),
          hasUser: false,
          hasProfile: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }])
      }
    }

    // Check session every 5 seconds
    const interval = setInterval(checkSession, 5000)
    checkSession() // Initial check

    return () => clearInterval(interval)
  }, [userProfile])

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Authentication Stability Test</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current State */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Current Auth State</h2>
            <div className="space-y-2">
              <div className={`p-2 rounded ${loading ? 'bg-yellow-100' : 'bg-green-100'}`}>
                <strong>Loading:</strong> {loading ? 'Yes' : 'No'}
              </div>
              <div className={`p-2 rounded ${user ? 'bg-green-100' : 'bg-red-100'}`}>
                <strong>User:</strong> {user ? user.email : 'None'}
              </div>
              <div className={`p-2 rounded ${userProfile ? 'bg-green-100' : 'bg-red-100'}`}>
                <strong>Profile:</strong> {userProfile ? userProfile.tier : 'None'}
              </div>
            </div>
          </div>

          {/* Session History */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Session Check History</h2>
            <div className="space-y-1 text-sm">
              {sessionChecks.map((check, index) => (
                <div key={index} className={`p-2 rounded ${
                  check.error ? 'bg-red-100' : 
                  check.hasUser && check.hasProfile ? 'bg-green-100' : 'bg-yellow-100'
                }`}>
                  <div className="flex justify-between">
                    <span>{check.timestamp}</span>
                    <span>
                      User: {check.hasUser ? '✓' : '✗'} | 
                      Profile: {check.hasProfile ? '✓' : '✗'}
                    </span>
                  </div>
                  {check.error && (
                    <div className="text-red-600 text-xs mt-1">
                      Error: {check.error}
                    </div>
                  )}
                  {check.debugInfo && (
                    <div className="text-blue-600 text-xs mt-1">
                      Debug: {check.debugInfo}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Test Actions</h2>
          <div className="space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Reload Page
            </button>
            <button
              onClick={async () => {
                try {
                  const { data: { user }, error } = await supabase.auth.getUser();
                  console.log('Current user:', user);
                  console.log('Auth error:', error);
                  
                  if (user) {
                    const { data: profile, error: profileError } = await supabase
                      .from('user_profiles')
                      .select('*')
                      .eq('id', user.id)
                      .single();
                    
                    console.log('User profile:', profile);
                    console.log('Profile error:', profileError);
                    
                    alert(`User: ${user.email}\nProfile: ${profile ? 'Found' : 'Missing'}\nError: ${profileError?.message || 'None'}`);
                  } else {
                    alert('No user found');
                  }
                } catch (error) {
                  console.error('Check failed:', error);
                  alert('Check failed');
                }
              }}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Check Auth State
            </button>
            <button
              onClick={async () => {
                try {
                  // Try to create profile directly using client
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) {
                    alert('No user found');
                    return;
                  }

                  // Try to create profile directly
                  const { data, error } = await (supabase
                    .from('user_profiles') as any)
                    .upsert({
                      id: user.id,
                      email: user.email || '',
                      tier: 'free',
                      provider: 'unknown',
                      monthly_transcriptions_used: 0,
                      total_transcriptions: 0,
                      usage_reset_date: new Date().toISOString()
                    }, { onConflict: 'id' })
                    .select()
                    .single();

                  if (error) {
                    console.error('Direct profile creation error:', error);
                    alert(`Profile creation failed: ${error.message}`);
                  } else {
                    console.log('Profile created:', data);
                    alert('Profile created successfully!');
                    window.location.reload();
                  }
                } catch (error) {
                  console.error('Profile creation error:', error);
                  alert('Profile creation failed');
                }
              }}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Create Profile Directly
            </button>
            <button
              onClick={() => {
                localStorage.clear()
                sessionStorage.clear()
                window.location.reload()
              }}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              Clear Storage & Reload
            </button>
            <button
              onClick={async () => {
                // Since user is signed in, just go to the app
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                  console.log('User is signed in, going to studio2');
                  window.location.href = '/studio2';
                } else {
                  console.log('No session, going to login');
                  window.location.href = '/login';
                }
              }}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Go to App (Skip Callback)
            </button>
            <button
              onClick={async () => {
                try {
                  await supabase.auth.signOut();
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.href = '/login';
                } catch (error) {
                  console.error('Sign out error:', error);
                  window.location.href = '/login';
                }
              }}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Force Sign Out & Login
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}