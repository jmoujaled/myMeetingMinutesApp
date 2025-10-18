'use client'

import { useAuth } from '@/contexts/AuthContext'
import { safeLogout, emergencyLogout, forceLogoutAndRedirect } from '@/lib/logout-utils'

export default function TestLogoutPage() {
  const { user, signOut } = useAuth()

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Not Logged In</h1>
          <a href="/login" className="text-blue-500 hover:underline">
            Go to Login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Logout Test Page</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Current User</h2>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>ID:</strong> {user.id}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Logout Methods</h2>
          <div className="space-y-4">
            <button
              onClick={() => safeLogout(signOut, 'TestPage')}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              1. Safe Logout (Recommended)
            </button>
            
            <button
              onClick={async () => {
                try {
                  await signOut()
                } catch (error) {
                  console.error('Direct signOut failed:', error)
                }
              }}
              className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              2. Direct AuthContext SignOut
            </button>
            
            <button
              onClick={() => forceLogoutAndRedirect('test_force')}
              className="w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              3. Force Logout & Redirect
            </button>
            
            <button
              onClick={() => emergencyLogout('test_emergency')}
              className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              4. Emergency Logout (Nuclear Option)
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <a href="/dashboard" className="text-blue-500 hover:underline">
            Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}